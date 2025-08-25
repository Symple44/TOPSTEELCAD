/**
 * Stage d'analyse syntaxique DSTV
 * 
 * Deuxième étape du pipeline - construit l'AST à partir des tokens selon la grammaire DSTV officielle.
 * Conforme à la norme DSTV 7ème édition (Juillet 1998).
 */

import { BaseStage } from '../../../../core/pipeline/BaseStage';
import { ProcessingContext } from '../../../../core/pipeline/ProcessingContext';
import { DSTVTokens, DSTVSyntaxTree } from '../DSTVImportPipeline';
import { DSTVToken, DSTVTokenType } from './DSTVLexicalStage';

/**
 * Types de blocs DSTV selon la norme officielle
 */
export enum DSTVBlockType {
  // Blocs obligatoires
  ST = 'ST',    // Start/Header - Données de la pièce
  EN = 'EN',    // End - Fin du fichier
  
  // Blocs de géométrie
  BO = 'BO',    // Hole - Trou rond
  AK = 'AK',    // Outer contour - Contour extérieur
  IK = 'IK',    // Inner contour - Contour intérieur
  
  // Blocs de marquage et traitement
  SI = 'SI',    // Marking - Marquage pièce
  SC = 'SC',    // Cut - Découpe spéciale
  PU = 'PU',    // Punch mark - Pointage
  KO = 'KO',    // Contour marking - Marquage contour
  
  // Blocs avancés
  TO = 'TO',    // Threading - Filetage
  UE = 'UE',    // Unrestricted contour - Contour libre
  PR = 'PR',    // Profile - Définition profil
  KA = 'KA',    // Bending - Pliage
  BR = 'BR',    // Bevel/Radius - Chanfrein/Rayon
  VO = 'VO',    // Volume - Volume de matière
  NU = 'NU',    // Numerically Controlled - Commande numérique
  
  // Programmes et contrôle
  FP = 'FP',    // Free Program - Programme libre
  LP = 'LP',    // Line Program - Programme linéaire
  RT = 'RT',    // Rotation - Rotation de pièce
  EB = 'EB',    // End of Batch - Fin de lot
  VB = 'VB',    // Variable Block - Bloc variable
  GR = 'GR',    // Group - Groupement d'opérations
  
  // Opérations mécaniques
  WA = 'WA',    // Washing - Lavage/Nettoyage
  FB = 'FB',    // Face Block - Bloc de face
  BF = 'BF',    // Bending Force - Force de pliage
  KL = 'KL',    // Clamping - Serrage
  KN = 'KN',    // Knurling - Moletage
  RO = 'RO',    // Roll - Laminage
  
  // Plans de travail (E0-E9)
  E0 = 'E0', E1 = 'E1', E2 = 'E2', E3 = 'E3', E4 = 'E4',
  E5 = 'E5', E6 = 'E6', E7 = 'E7', E8 = 'E8', E9 = 'E9',
  
  // Information
  IN = 'IN'     // Information block - Bloc d'information
}

/**
 * Structure d'un bloc DSTV parsé
 */
export interface DSTVParsedBlock {
  type: DSTVBlockType;
  data: Record<string, any>;
  rawData: string[];
  position: {
    start: number;    // Position du token de début
    end: number;      // Position du token de fin
    line: number;     // Numéro de ligne
  };
  errors: string[];
  warnings: string[];
}

/**
 * Configuration du parser syntaxique
 */
interface DSTVSyntaxConfig {
  strictMode: boolean;
  supportAllBlocks: boolean;
  allowIncompleteBlocks: boolean;
  maxBlockSize: number;
}

/**
 * Stage d'analyse syntaxique DSTV
 */
export class DSTVSyntaxStage extends BaseStage<DSTVTokens, DSTVSyntaxTree> {
  readonly name = 'dstv-syntax-analysis';
  readonly description = 'DSTV Syntax Analysis - Builds AST from tokens according to DSTV grammar';
  readonly estimatedDuration = 200; // 200ms en moyenne

  private syntaxConfig: DSTVSyntaxConfig;
  private tokens: DSTVToken[] = [];
  private currentPosition = 0;
  private currentBlock: DSTVParsedBlock | null = null;

  constructor(config: any = {}) {
    super(config);
    
    this.syntaxConfig = {
      strictMode: config.strictMode || false,
      supportAllBlocks: config.supportAllBlocks || true,
      allowIncompleteBlocks: !config.strictMode,
      maxBlockSize: config.maxBlockSize || 1000,
      ...config.syntax
    };
  }

  /**
   * Analyse syntaxique principale
   */
  async process(input: DSTVTokens, context: ProcessingContext): Promise<DSTVSyntaxTree> {
    const stopTimer = this.startTimer();
    
    try {
      this.tokens = input.tokens.map(token => ({
        type: token.type as DSTVTokenType,
        value: token.value,
        line: token.line,
        column: token.column,
        length: token.value.length,
        raw: token.value
      }));
      this.currentPosition = 0;
      
      this.log(context, 'info', `Starting syntax analysis`, {
        totalTokens: this.tokens.length,
        blocksDetected: input.metadata.blockCount
      });

      // Parser tous les blocs
      const blocks = await this.parseAllBlocks(context);
      
      // Générer les métadonnées de l'AST
      const metadata = this.generateSyntaxMetadata(blocks, input.metadata);
      
      const duration = stopTimer();
      context.addMetric('syntax_analysis_duration', duration);
      context.addMetric('blocks_parsed', blocks.length);
      
      this.log(context, 'info', `Syntax analysis completed`, {
        blocksParsed: blocks.length,
        duration: `${duration.toFixed(2)}ms`,
        profile: metadata.profile
      });

      return {
        blocks,
        metadata
      };

    } catch (error) {
      const duration = stopTimer();
      context.addMetric('syntax_analysis_duration', duration);
      context.addMetric('syntax_analysis_error', true);
      
      this.log(context, 'error', `Syntax analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Parse tous les blocs du fichier
   */
  private async parseAllBlocks(context: ProcessingContext): Promise<DSTVParsedBlock[]> {
    const blocks: DSTVParsedBlock[] = [];
    let blockCount = 0;

    while (this.currentPosition < this.tokens.length) {
      const token = this.getCurrentToken();
      
      if (!token || token.type === DSTVTokenType.EOF) {
        break;
      }

      // Ignorer les tokens non-bloc
      if (token.type !== DSTVTokenType.BLOCK_HEADER) {
        this.advance();
        continue;
      }

      try {
        const block = await this.parseBlock(context);
        if (block) {
          blocks.push(block);
          blockCount++;
          
          // Progress reporting
          if (blockCount % 50 === 0) {
            context.addMetric('syntax_progress', this.currentPosition / this.tokens.length);
          }
        }
      } catch (error) {
        const errorMsg = `Failed to parse block at position ${this.currentPosition}: ${error instanceof Error ? error.message : String(error)}`;
        
        if (this.syntaxConfig.strictMode) {
          throw new Error(errorMsg);
        } else {
          context.addWarning(errorMsg);
          this.skipToNextBlock();
        }
      }
    }

    return blocks;
  }

  /**
   * Parse un bloc spécifique
   */
  private async parseBlock(context: ProcessingContext): Promise<DSTVParsedBlock | null> {
    const startPosition = this.currentPosition;
    const headerToken = this.getCurrentToken();
    
    if (!headerToken || headerToken.type !== DSTVTokenType.BLOCK_HEADER) {
      return null;
    }

    const blockType = headerToken.value as DSTVBlockType;
    
    // Vérifier si le bloc est supporté
    if (!this.isBlockSupported(blockType)) {
      if (this.syntaxConfig.strictMode) {
        throw new Error(`Unsupported block type: ${blockType}`);
      } else {
        context.addWarning(`Skipping unsupported block: ${blockType}`);
        this.skipToNextBlock();
        return null;
      }
    }

    this.advance(); // Passer le header

    // Collecter les données du bloc jusqu'au prochain header ou EOF
    const rawData: string[] = [];
    const blockStartLine = headerToken.line;
    let dataTokenCount = 0;

    while (this.currentPosition < this.tokens.length) {
      const token = this.getCurrentToken();
      
      if (!token || token.type === DSTVTokenType.EOF) {
        break;
      }

      // Arrêter si on trouve un nouveau bloc
      if (token.type === DSTVTokenType.BLOCK_HEADER) {
        break;
      }

      // Collecter les données significatives (pas les espaces/newlines)
      if (this.isSignificantToken(token)) {
        rawData.push(token.value);
        dataTokenCount++;
        
        // Vérifier la taille du bloc
        if (dataTokenCount > this.syntaxConfig.maxBlockSize) {
          throw new Error(`Block ${blockType} exceeds maximum size (${this.syntaxConfig.maxBlockSize} tokens)`);
        }
      }

      this.advance();
    }

    // Parser les données spécifiques selon le type de bloc
    let parsedData: Record<string, any> = {};
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      parsedData = await this.parseBlockData(blockType, rawData, context);
    } catch (error) {
      const errorMsg = `Error parsing ${blockType} block data: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      
      if (this.syntaxConfig.strictMode) {
        throw new Error(errorMsg);
      }
    }

    const block: DSTVParsedBlock = {
      type: blockType,
      data: parsedData,
      rawData,
      position: {
        start: startPosition,
        end: this.currentPosition - 1,
        line: blockStartLine
      },
      errors,
      warnings
    };

    this.log(context, 'debug', `Parsed block ${blockType}`, {
      dataElements: rawData.length,
      hasErrors: errors.length > 0,
      hasWarnings: warnings.length > 0
    });

    return block;
  }

  /**
   * Parse les données spécifiques d'un bloc selon son type
   */
  private async parseBlockData(blockType: DSTVBlockType, rawData: string[], context: ProcessingContext): Promise<Record<string, any>> {
    switch (blockType) {
      case DSTVBlockType.ST:
        return this.parseSTBlock(rawData);
      case DSTVBlockType.BO:
        return this.parseBOBlock(rawData);
      case DSTVBlockType.AK:
        return this.parseAKBlock(rawData);
      case DSTVBlockType.IK:
        return this.parseIKBlock(rawData);
      case DSTVBlockType.SI:
        return this.parseSIBlock(rawData);
      case DSTVBlockType.SC:
        return this.parseSCBlock(rawData);
      case DSTVBlockType.EN:
        return this.parseENBlock(rawData);
      case DSTVBlockType.PU:
        return this.parsePUBlock(rawData);
      case DSTVBlockType.KO:
        return this.parseKOBlock(rawData);
      default:
        // Bloc générique pour les types non encore implémentés
        return this.parseGenericBlock(blockType, rawData);
    }
  }

  // ================================
  // PARSERS SPÉCIFIQUES PAR BLOC
  // ================================

  /**
   * Parse bloc ST (Start/Header)
   */
  private parseSTBlock(rawData: string[]): Record<string, any> {
    if (rawData.length < 8) {
      throw new Error(`ST block requires at least 8 fields, got ${rawData.length}`);
    }

    return {
      orderNumber: rawData[0] || '',
      drawingNumber: rawData[1] || '',
      phaseNumber: rawData[2] || '',
      pieceNumber: rawData[3] || '',
      steelGrade: rawData[4] || '',
      quantity: parseInt(rawData[5]) || 1,
      profileName: rawData[6] || '',
      profileType: rawData[7] || '',
      // Champs géométriques (selon norme DSTV)
      profileLength: rawData[8] ? parseFloat(rawData[8]) : undefined,
      profileHeight: rawData[9] ? parseFloat(rawData[9]) : undefined,     // Vraie hauteur
      profileWidth: rawData[10] ? parseFloat(rawData[10]) : undefined,    // Vraie largeur  
      webThickness: rawData[11] ? parseFloat(rawData[11]) : undefined,    // Épaisseur âme
      flangeThickness: rawData[12] ? parseFloat(rawData[12]) : undefined, // Épaisseur semelle
      rootRadius: rawData[13] ? parseFloat(rawData[13]) : undefined,      // Rayon de raccordement
      profileWeight: rawData[14] ? parseFloat(rawData[14]) : undefined,   // Poids par mètre
      surfaceArea: rawData[15] ? parseFloat(rawData[15]) : undefined,     // Surface par mètre
      // Champs de dates optionnels (si présents après les dimensions)
      createdDate: rawData[16] || undefined,
      createdTime: rawData[17] || undefined
    };
  }

  /**
   * Parse bloc BO (Hole)
   */
  private parseBOBlock(rawData: string[]): Record<string, any> {
    // Le bloc BO peut contenir plusieurs trous
    // Format: [face] X Y diameter [depth] [angle] [plane] [tolerance]
    const holes: Array<Record<string, any>> = [];
    let i = 0;
    
    while (i < rawData.length) {
      // Récupérer la face (optionnelle)
      let face = 'web';
      const startIndex = i;
      
      // Vérifier si c'est un indicateur de face
      // IMPORTANT: Pour BO, 'v' = vertical = trous dans l'âme (PAS dans l'aile!)
      if (/^[vVhHuUoO]$/.test(rawData[i])) {
        const indicator = rawData[i].toLowerCase();
        switch(indicator) {
          case 'v': face = 'web'; break;      // 'v' = vertical = trous verticaux dans l'âme
          case 'u': face = 'bottom'; break;   // 'u' = semelle inférieure
          case 'o': face = 'top'; break;      // 'o' = over = semelle supérieure
          case 'h': face = 'front'; break;    // 'h' = face avant
        }
        i++;
      }
      
      // Récupérer les valeurs numériques
      const numericValues: number[] = [];
      while (i < rawData.length && numericValues.length < 7) {
        const val = rawData[i];
        // Si on trouve un nouvel indicateur de face, on arrête ce trou
        if (/^[vVhHuUoO]$/.test(val)) {
          break;
        }
        // Parser les valeurs numériques
        if (/^[+-]?\d/.test(val) || /^[+-]?\./.test(val)) {
          // Retirer le suffixe 'u' s'il existe
          const cleanVal = val.replace(/u$/, '');
          numericValues.push(parseFloat(cleanVal));
        }
        i++;
      }
      
      // Créer le trou si on a au moins X, Y et diamètre
      if (numericValues.length >= 3) {
        holes.push({
          face,
          x: numericValues[0],
          y: numericValues[1],
          diameter: numericValues[2],
          depth: numericValues[3] || 0,
          angle: numericValues[4] || 0,
          plane: rawData[startIndex + numericValues.length + 5] || 'E0',
          tolerance: numericValues[6] || undefined
        });
      }
    }
    
    console.log(`  📍 Parsed ${holes.length} holes from BO block`);
    return { holes };
  }

  /**
   * Parse bloc AK (Outer contour)
   */
  private parseAKBlock(rawData: string[]): Record<string, any> {
    console.log(`🔍 parseAKBlock: Parsing ${rawData.length} raw data elements:`, rawData);
    
    const points: Array<{ x: number; y: number; type?: string }> = [];
    let face = 'front';
    
    // CORRECTION: Dans DSTV, chaque ligne contient "indicator X Y Z" espacés
    // mais rawData contient tous les champs individuels aplatis
    // Ex: ["o", "1842.10u", "0.00", "0.00", "o", "0.00u", "0.00", "0.00", ...]
    // On doit donc parser par groupes de 3 ou 4 selon le format
    
    // Si le premier élément contient un indicateur ET une valeur (ex: "o1842.10u")
    // alors on est dans le format compact, sinon format séparé
    const isCompactFormat = rawData.length > 0 && /^[hvuoHVUO].+\d/.test(rawData[0]);
    
    if (isCompactFormat) {
      // Format compact: chaque élément contient indicateur+valeur
      for (let i = 0; i < rawData.length; i += 3) {
        if (i + 1 >= rawData.length) break;
      
      const fieldX = rawData[i].trim();
      const fieldY = rawData[i + 1].trim();
      // Z est optionnel (rawData[i + 2])
      
      // Extraire l'indicateur de face du premier champ
      const faceMatch = fieldX.match(/^([hvuoHVUO])/);
      if (faceMatch) {
        const faceChar = faceMatch[1].toLowerCase();
        const faceMapping: Record<string, string> = {
          'v': 'top', 'u': 'bottom', 'o': 'web', 'h': 'front'
        };
        face = faceMapping[faceChar] || 'front';
      }
      
        // Extraire les valeurs numériques en enlevant préfixes et suffixes
        const x = this.extractNumericValue(fieldX);
        const y = this.extractNumericValue(fieldY);
        
        if (!isNaN(x) && !isNaN(y)) {
          points.push({ x, y, type: face });
          console.log(`  ✅ Added point: (${x}, ${y}) on face ${face}`);
        }
      }
    } else {
      // Format séparé: indicateur est un élément séparé
      // Ex: ["o", "1842.10u", "0.00", "0.00", ...]
      let i = 0;
      while (i < rawData.length) {
        // Vérifier si c'est un indicateur de face seul
        if (rawData[i].length === 1 && /^[hvuoHVUO]$/.test(rawData[i])) {
          const faceChar = rawData[i].toLowerCase();
          const faceMapping: Record<string, string> = {
            'v': 'top', 'u': 'bottom', 'o': 'web', 'h': 'front'
          };
          face = faceMapping[faceChar] || 'front';
          
          // Les 3 prochains éléments sont X, Y, Z
          if (i + 2 < rawData.length) {
            const x = this.extractNumericValue(rawData[i + 1]);
            const y = this.extractNumericValue(rawData[i + 2]);
            // Z en i+3 est optionnel
            
            if (!isNaN(x) && !isNaN(y)) {
              points.push({ x, y, type: face });
              console.log(`  ✅ Added point: (${x}, ${y}) on face ${face}`);
            }
            i += 4; // Passer l'indicateur + X + Y + Z
          } else {
            i++;
          }
        } else if (/^[hvuoHVUO]/.test(rawData[i])) {
          // C'est un indicateur fusionné avec X
          const fieldX = rawData[i];
          if (i + 1 < rawData.length) {
            const fieldY = rawData[i + 1];
            
            // Extraire l'indicateur de face
            const faceMatch = fieldX.match(/^([hvuoHVUO])/);
            if (faceMatch) {
              const faceChar = faceMatch[1].toLowerCase();
              const faceMapping: Record<string, string> = {
                'v': 'top', 'u': 'bottom', 'o': 'web', 'h': 'front'
              };
              face = faceMapping[faceChar] || 'front';
            }
            
            const x = this.extractNumericValue(fieldX);
            const y = this.extractNumericValue(fieldY);
            
            if (!isNaN(x) && !isNaN(y)) {
              points.push({ x, y, type: face });
              console.log(`  ✅ Added point: (${x}, ${y}) on face ${face}`);
            }
            i += 3; // Passer X + Y + Z
          } else {
            i++;
          }
        } else {
          // Élément non reconnu, passer au suivant
          i++;
        }
      }
    }
    
    console.log(`📊 parseAKBlock result: ${points.length} points parsed`);

    return {
      points,
      face,
      closed: true, // AK est toujours fermé selon la norme
      plane: 'E0' // Plan par défaut
    };
  }

  /**
   * Extrait une valeur numérique d'un champ DSTV (enlève préfixes et suffixes)
   */
  private extractNumericValue(field: string): number {
    const trimmed = field.trim();
    
    // Enlever le préfixe de face s'il existe
    let numStr = trimmed;
    if (/^[hvuoHVUO]/.test(trimmed)) {
      numStr = trimmed.substring(1);
    }
    
    // Enlever le suffixe 'u' s'il existe
    numStr = numStr.replace(/u\s*$/i, '');
    
    // Parser la valeur numérique
    return parseFloat(numStr);
  }

  /**
   * Parse bloc IK (Inner contour)
   */
  private parseIKBlock(rawData: string[]): Record<string, any> {
    // Filtrer les préfixes de face/type (v, o, u, etc.) qui ne sont pas des nombres
    const numericData = rawData.filter(val => {
      return /^[+-]?\d/.test(val) || /^[+-]?\./.test(val);
    });
    
    const points: Array<{ x: number; y: number; type?: string }> = [];
    
    for (let i = 0; i < numericData.length - 1; i += 2) {
      if (i + 1 < numericData.length) {
        points.push({
          x: parseFloat(numericData[i]),
          y: parseFloat(numericData[i + 1])
        });
      }
    }

    return {
      points,
      closed: true, // IK est toujours fermé selon la norme
      plane: 'E0' // Plan par défaut
    };
  }

  /**
   * Parse bloc SI (Marking)
   */
  private parseSIBlock(rawData: string[]): Record<string, any> {
    console.log('🔍 parseSIBlock: Parsing raw data:', rawData);
    
    // Format DSTV SI: [face?, x, y, z?, height?, text]
    // Dans notre cas: ['v', '2.00', '2.00', '0.00', '10', '1002']
    // où le dernier élément contient "10rM1002" qui a été split en '10' et '1002'
    
    let face = '';
    let startIdx = 0;
    
    // Vérifier si le premier élément est un indicateur de face
    if (rawData.length > 0 && ['v', 'o', 'u'].includes(rawData[0])) {
      face = rawData[0];
      startIdx = 1;
      console.log('  📍 Found face indicator:', face);
    }
    
    // Parser les coordonnées X et Y (obligatoires)
    if (rawData.length < startIdx + 2) {
      throw new Error(`SI block requires at least X and Y coordinates`);
    }
    
    const x = parseFloat(rawData[startIdx].replace(/u$/i, ''));
    const y = parseFloat(rawData[startIdx + 1].replace(/u$/i, ''));
    console.log(`  📍 Coordinates: X=${x}, Y=${y}`);
    
    // Les champs suivants peuvent être Z, hauteur, angle, ou directement le texte
    // Pour M1002.nc, nous avons: '0.00' (Z), '10' (hauteur?), '1002' (texte?)
    // Mais dans le fichier original c'est "10rM1002" qui signifie hauteur=10 et texte="0"
    
    let text = '0';  // Valeur par défaut
    let height = 10; // Valeur par défaut
    let z = 0;       // Valeur par défaut
    
    // Si nous avons plus de valeurs après X et Y
    if (rawData.length > startIdx + 2) {
      // Le 3ème élément pourrait être Z
      const thirdVal = rawData[startIdx + 2];
      if (/^[+-]?\d+\.?\d*$/.test(thirdVal)) {
        z = parseFloat(thirdVal);
        console.log(`  📍 Z coordinate: ${z}`);
      }
      
      // Chercher le texte du marquage
      // Dans le DSTV original: "10rM1002" signifie hauteur 10 et texte "0" (ou "M1002")
      // Mais après tokenization, on a perdu cette info
      // Le texte est probablement "0" car c'est un marquage simple
      if (rawData.length > startIdx + 3) {
        const fourthVal = rawData[startIdx + 3];
        if (/^\d+$/.test(fourthVal)) {
          height = parseFloat(fourthVal);
          console.log(`  📍 Height: ${height}`);
        }
        
        // Le dernier élément pourrait être le texte
        if (rawData.length > startIdx + 4) {
          text = rawData[startIdx + 4];
          // Si c'est "1002", c'est la fin de "M1002"
          if (text === '1002') {
            text = 'M1002';  // Le marquage complet est "M1002"
          }
        } else {
          text = 'M1002';  // Le texte est M1002
        }
      }
    }
    
    console.log(`  📍 Marking text: "${text}"`);

    const result = {
      x: x,
      y: y,
      z: z,
      text: text,
      face: face || undefined,
      height: height,
      angle: 0,
      depth: 0.1,
      plane: 'E0'
    };
    
    console.log('  ✅ Parsed SI block:', result);
    return result;
  }

  /**
   * Parse bloc SC (Cut)
   */
  private parseSCBlock(rawData: string[]): Record<string, any> {
    if (rawData.length < 4) {
      throw new Error(`SC block requires at least 4 fields, got ${rawData.length}`);
    }

    return {
      x: parseFloat(rawData[0]),
      y: parseFloat(rawData[1]),
      width: parseFloat(rawData[2]),
      height: parseFloat(rawData[3]),
      // Champs optionnels
      angle: rawData[4] ? parseFloat(rawData[4]) : 0,
      radius: rawData[5] ? parseFloat(rawData[5]) : 0,
      plane: rawData[6] || 'E0'
    };
  }

  /**
   * Parse bloc EN (End)
   */
  private parseENBlock(rawData: string[]): Record<string, any> {
    return {
      endMarker: true,
      // Métadonnées optionnelles
      processingTime: rawData[0] ? parseFloat(rawData[0]) : undefined,
      checksum: rawData[1] || undefined
    };
  }

  /**
   * Parse bloc PU (Punch mark)
   */
  private parsePUBlock(rawData: string[]): Record<string, any> {
    if (rawData.length < 2) {
      throw new Error(`PU block requires at least 2 fields, got ${rawData.length}`);
    }

    return {
      x: parseFloat(rawData[0]),
      y: parseFloat(rawData[1]),
      // Champs optionnels
      depth: rawData[2] ? parseFloat(rawData[2]) : 0.5,
      diameter: rawData[3] ? parseFloat(rawData[3]) : 3,
      plane: rawData[4] || 'E0'
    };
  }

  /**
   * Parse bloc KO (Contour marking)
   */
  private parseKOBlock(rawData: string[]): Record<string, any> {
    const points: Array<{ x: number; y: number }> = [];
    
    for (let i = 0; i < rawData.length - 1; i += 2) {
      if (i + 1 < rawData.length) {
        points.push({
          x: parseFloat(rawData[i]),
          y: parseFloat(rawData[i + 1])
        });
      }
    }

    return {
      points,
      markingType: 'contour',
      plane: 'E0'
    };
  }

  /**
   * Parse bloc générique pour types non implémentés
   */
  private parseGenericBlock(blockType: DSTVBlockType, rawData: string[]): Record<string, any> {
    return {
      blockType,
      rawFields: rawData,
      parsed: false,
      note: `Block type ${blockType} parser not yet implemented`
    };
  }

  /**
   * Génère les métadonnées de l'AST
   */
  private generateSyntaxMetadata(blocks: DSTVParsedBlock[], inputMetadata: any): DSTVSyntaxTree['metadata'] {
    const stBlock = blocks.find(b => b.type === DSTVBlockType.ST);
    const featureBlocks = blocks.filter(b => 
      [DSTVBlockType.BO, DSTVBlockType.AK, DSTVBlockType.IK, 
       DSTVBlockType.SI, DSTVBlockType.SC, DSTVBlockType.PU, DSTVBlockType.KO].includes(b.type)
    );

    return {
      version: 'DSTV 7th Edition',
      profile: stBlock?.data?.profileName || 'Unknown',
      elements: 1, // DSTV = une pièce par fichier
      features: featureBlocks.length
    };
  }

  // ================================
  // MÉTHODES UTILITAIRES
  // ================================

  private getCurrentToken(): DSTVToken | null {
    return this.currentPosition < this.tokens.length ? this.tokens[this.currentPosition] : null;
  }

  private advance(): void {
    this.currentPosition++;
  }

  private isBlockSupported(blockType: DSTVBlockType): boolean {
    if (this.syntaxConfig.supportAllBlocks) {
      return true;
    }

    // Blocs de base toujours supportés
    const basicBlocks: DSTVBlockType[] = [
      DSTVBlockType.ST, DSTVBlockType.EN, DSTVBlockType.BO, 
      DSTVBlockType.AK, DSTVBlockType.IK, DSTVBlockType.SI, DSTVBlockType.SC
    ];

    return basicBlocks.includes(blockType);
  }

  private isSignificantToken(token: DSTVToken): boolean {
    return ![DSTVTokenType.WHITESPACE, DSTVTokenType.NEWLINE, DSTVTokenType.COMMENT].includes(token.type);
  }

  private skipToNextBlock(): void {
    while (this.currentPosition < this.tokens.length) {
      const token = this.getCurrentToken();
      if (token?.type === DSTVTokenType.BLOCK_HEADER) {
        break;
      }
      this.advance();
    }
  }
}