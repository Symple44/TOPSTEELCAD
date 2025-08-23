/**
 * Stage de validation sémantique DSTV
 * 
 * Troisième étape du pipeline - valide la cohérence et la conformité des données DSTV
 * selon les règles métier de la norme officielle DSTV 7ème édition.
 */

import { BaseStage } from '../../../../core/pipeline/BaseStage';
import { ProcessingContext } from '../../../../core/pipeline/ProcessingContext';
import { DSTVSyntaxTree, DSTVValidatedData } from '../DSTVImportPipeline';
import { DSTVParsedBlock, DSTVBlockType } from './DSTVSyntaxStage';

/**
 * Types d'erreurs de validation sémantique
 */
export enum ValidationErrorType {
  CRITICAL = 'CRITICAL',     // Erreur bloquante
  ERROR = 'ERROR',           // Erreur non-bloquante mais importante
  WARNING = 'WARNING',       // Avertissement
  INFO = 'INFO'              // Information
}

/**
 * Résultat de validation d'un bloc
 */
interface BlockValidationResult {
  blockType: DSTVBlockType;
  isValid: boolean;
  errors: Array<{
    type: ValidationErrorType;
    code: string;
    message: string;
    field?: string;
    value?: any;
  }>;
  warnings: string[];
  conformityScore: number; // 0.0 à 1.0
}

/**
 * Configuration de la validation sémantique
 */
interface DSTVSemanticConfig {
  strictMode: boolean;
  validateContourClosure: boolean;
  enableAdvancedHoles: boolean;
  enableWeldingPreparation: boolean;
  enablePlaneDefinition: boolean;
  enableBendingSupport: boolean;
  geometryTolerance: number;
  maxProfileDimensions: { width: number; height: number; length: number };
}

/**
 * Stage de validation sémantique DSTV
 */
export class DSTVSemanticStage extends BaseStage<DSTVSyntaxTree, DSTVValidatedData> {
  readonly name = 'dstv-semantic-validation';
  readonly description = 'DSTV Semantic Validation - Validates DSTV data against business rules and standards';
  readonly estimatedDuration = 150; // 150ms en moyenne

  private semanticConfig: DSTVSemanticConfig;

  constructor(config: any = {}) {
    super(config);
    
    this.semanticConfig = {
      strictMode: config.strictMode || false,
      validateContourClosure: config.validateContourClosure !== false,
      enableAdvancedHoles: config.enableAdvancedHoles !== false,
      enableWeldingPreparation: config.enableWeldingPreparation !== false,
      enablePlaneDefinition: config.enablePlaneDefinition !== false,
      enableBendingSupport: config.enableBendingSupport !== false,
      geometryTolerance: config.geometryTolerance || 0.01, // 0.01mm
      maxProfileDimensions: config.maxProfileDimensions || {
        width: 10000,    // 10m
        height: 10000,   // 10m
        length: 50000    // 50m
      },
      ...config.semantic
    };
  }

  /**
   * Validation sémantique principale
   */
  async process(input: DSTVSyntaxTree, context: ProcessingContext): Promise<DSTVValidatedData> {
    const stopTimer = this.startTimer();
    
    try {
      this.log(context, 'info', `Starting semantic validation`, {
        totalBlocks: input.blocks.length,
        profile: input.metadata.profile
      });

      // Convertir les blocs vers le format attendu
      const parsedBlocks: DSTVParsedBlock[] = input.blocks.map(block => ({
        type: block.type as DSTVBlockType,
        data: block.data,
        rawData: [], // Pas disponible à ce stade
        position: {
          start: block.position.start,
          end: block.position.end,
          line: 0 // Pas disponible à ce stade
        },
        errors: [],
        warnings: []
      }));

      // Validation de la structure générale
      await this.validateFileStructure(parsedBlocks, context);
      
      // Validation de chaque bloc
      const validationResults = await this.validateAllBlocks(parsedBlocks, context);
      
      // Validation des relations inter-blocs
      await this.validateBlockRelations(parsedBlocks, context);
      
      // Génération du résultat final
      const result = this.generateValidationResult(parsedBlocks, validationResults, context);
      
      const duration = stopTimer();
      context.addMetric('semantic_validation_duration', duration);
      context.addMetric('validation_conformity_score', result.conformityScore);
      
      this.log(context, 'info', `Semantic validation completed`, {
        validBlocks: result.validBlocks.length,
        totalErrors: result.errors.length,
        totalWarnings: result.warnings.length,
        conformityScore: `${(result.conformityScore * 100).toFixed(1)}%`,
        duration: `${duration.toFixed(2)}ms`
      });

      return result;

    } catch (error) {
      const duration = stopTimer();
      context.addMetric('semantic_validation_duration', duration);
      context.addMetric('semantic_validation_error', true);
      
      this.log(context, 'error', `Semantic validation failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Valide la structure générale du fichier DSTV
   */
  private async validateFileStructure(blocks: DSTVParsedBlock[], context: ProcessingContext): Promise<void> {
    const errors: string[] = [];
    
    // Vérifier la présence du bloc ST obligatoire
    const stBlocks = blocks.filter(b => b.type === DSTVBlockType.ST);
    if (stBlocks.length === 0) {
      errors.push('Missing mandatory ST (Start) block');
    } else if (stBlocks.length > 1) {
      errors.push(`Multiple ST blocks found (${stBlocks.length}), only one is allowed per file`);
    }
    
    // Vérifier que le bloc ST est le premier
    if (blocks.length > 0 && blocks[0].type !== DSTVBlockType.ST) {
      errors.push('ST block must be the first block in the file');
    }
    
    // Vérifier la présence du bloc EN en mode strict
    if (this.semanticConfig.strictMode) {
      const enBlocks = blocks.filter(b => b.type === DSTVBlockType.EN);
      if (enBlocks.length === 0) {
        errors.push('Missing mandatory EN (End) block in strict mode');
      } else if (enBlocks.length > 1) {
        errors.push(`Multiple EN blocks found (${enBlocks.length}), only one is allowed per file`);
      }
      
      // Vérifier que le bloc EN est le dernier
      if (enBlocks.length > 0 && blocks[blocks.length - 1].type !== DSTVBlockType.EN) {
        errors.push('EN block must be the last block in the file');
      }
    }
    
    // Validation de la séquence logique
    this.validateBlockSequence(blocks, errors, context);
    
    if (errors.length > 0) {
      if (this.semanticConfig.strictMode) {
        throw new Error(`File structure validation failed: ${errors.join('; ')}`);
      } else {
        errors.forEach(error => context.addWarning(`Structure: ${error}`));
      }
    }
  }

  /**
   * Valide tous les blocs individuellement
   */
  private async validateAllBlocks(blocks: DSTVParsedBlock[], context: ProcessingContext): Promise<BlockValidationResult[]> {
    const results: BlockValidationResult[] = [];
    
    for (const block of blocks) {
      try {
        const result = await this.validateBlock(block, context);
        results.push(result);
        
        // Logging des erreurs critiques
        const criticalErrors = result.errors.filter(e => e.type === ValidationErrorType.CRITICAL);
        if (criticalErrors.length > 0) {
          this.log(context, 'error', `Critical errors in ${block.type} block`, {
            errors: criticalErrors.map(e => e.message)
          });
        }
        
      } catch (error) {
        const errorResult: BlockValidationResult = {
          blockType: block.type,
          isValid: false,
          errors: [{
            type: ValidationErrorType.CRITICAL,
            code: 'VALIDATION_FAILED',
            message: `Block validation failed: ${error instanceof Error ? error.message : String(error)}`
          }],
          warnings: [],
          conformityScore: 0
        };
        results.push(errorResult);
      }
    }
    
    return results;
  }

  /**
   * Valide un bloc spécifique selon son type
   */
  private async validateBlock(block: DSTVParsedBlock, context: ProcessingContext): Promise<BlockValidationResult> {
    const result: BlockValidationResult = {
      blockType: block.type,
      isValid: true,
      errors: [],
      warnings: [],
      conformityScore: 1.0
    };

    try {
      switch (block.type) {
        case DSTVBlockType.ST:
          await this.validateSTBlock(block, result);
          break;
        case DSTVBlockType.BO:
          await this.validateBOBlock(block, result);
          break;
        case DSTVBlockType.AK:
          await this.validateAKBlock(block, result);
          break;
        case DSTVBlockType.IK:
          await this.validateIKBlock(block, result);
          break;
        case DSTVBlockType.SI:
          await this.validateSIBlock(block, result);
          break;
        case DSTVBlockType.SC:
          await this.validateSCBlock(block, result);
          break;
        case DSTVBlockType.EN:
          await this.validateENBlock(block, result);
          break;
        case DSTVBlockType.PU:
          await this.validatePUBlock(block, result);
          break;
        case DSTVBlockType.KO:
          await this.validateKOBlock(block, result);
          break;
        default:
          // Bloc non encore implémenté - score réduit mais pas d'erreur
          result.warnings.push(`Block type ${block.type} validation not yet implemented`);
          result.conformityScore *= 0.8;
      }
    } catch (error) {
      result.errors.push({
        type: ValidationErrorType.ERROR,
        code: 'BLOCK_VALIDATION_ERROR',
        message: `Error validating ${block.type}: ${error instanceof Error ? error.message : String(error)}`
      });
      result.isValid = false;
      result.conformityScore *= 0.5;
    }

    // Calculer le score final basé sur les erreurs
    const criticalErrors = result.errors.filter(e => e.type === ValidationErrorType.CRITICAL).length;
    const errors = result.errors.filter(e => e.type === ValidationErrorType.ERROR).length;
    const warnings = result.errors.filter(e => e.type === ValidationErrorType.WARNING).length;
    
    if (criticalErrors > 0) {
      result.conformityScore = 0;
      result.isValid = false;
    } else {
      result.conformityScore *= Math.max(0, 1 - (errors * 0.2) - (warnings * 0.05));
    }

    return result;
  }

  // ================================
  // VALIDATEURS SPÉCIFIQUES PAR BLOC
  // ================================

  /**
   * Valide le bloc ST (Start/Header)
   */
  private async validateSTBlock(block: DSTVParsedBlock, result: BlockValidationResult): Promise<void> {
    const data = block.data;
    
    // Champs obligatoires
    const requiredFields = ['orderNumber', 'drawingNumber', 'phaseNumber', 'pieceNumber', 'steelGrade', 'quantity', 'profileName', 'profileType'];
    
    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        result.errors.push({
          type: ValidationErrorType.ERROR,
          code: 'MISSING_REQUIRED_FIELD',
          message: `Missing required field: ${field}`,
          field
        });
      }
    }
    
    // Validation de la quantité
    if (data.quantity !== undefined && (!Number.isInteger(data.quantity) || data.quantity <= 0)) {
      result.errors.push({
        type: ValidationErrorType.ERROR,
        code: 'INVALID_QUANTITY',
        message: `Quantity must be a positive integer, got: ${data.quantity}`,
        field: 'quantity',
        value: data.quantity
      });
    }
    
    // Validation du nom de profil
    if (data.profileName && !this.isValidProfileName(data.profileName)) {
      result.warnings.push(`Profile name '${data.profileName}' may not conform to standard naming conventions`);
      result.conformityScore *= 0.95;
    }
    
    // Validation des dimensions si présentes
    if (data.profileLength !== undefined && data.profileLength <= 0) {
      result.errors.push({
        type: ValidationErrorType.WARNING,
        code: 'INVALID_DIMENSION',
        message: `Profile length must be positive, got: ${data.profileLength}`,
        field: 'profileLength',
        value: data.profileLength
      });
    }
  }

  /**
   * Valide le bloc BO (Hole)
   */
  private async validateBOBlock(block: DSTVParsedBlock, result: BlockValidationResult): Promise<void> {
    const data = block.data;
    
    // Si le bloc contient un tableau de trous
    if (data.holes && Array.isArray(data.holes)) {
      for (let i = 0; i < data.holes.length; i++) {
        const hole = data.holes[i];
        
        // Coordonnées obligatoires
        if (hole.x === undefined || hole.y === undefined) {
          result.errors.push({
            type: ValidationErrorType.CRITICAL,
            code: 'MISSING_COORDINATES',
            message: `Missing X or Y coordinate for hole ${i + 1}`
          });
          continue;
        }
        
        // Diamètre obligatoire et positif
        if (hole.diameter === undefined || hole.diameter <= 0) {
          result.errors.push({
            type: ValidationErrorType.CRITICAL,
            code: 'INVALID_DIAMETER',
            message: `Hole ${i + 1} diameter must be positive, got: ${hole.diameter}`,
            field: 'diameter',
            value: hole.diameter
          });
        }
        
        // Vérification des limites pratiques
        if (hole.diameter > 500) { // 500mm semble excessif pour un trou
          result.warnings.push(`Very large hole ${i + 1} diameter: ${hole.diameter}mm`);
        }
        
        // Validation de l'angle si présent
        if (hole.angle !== undefined && (hole.angle < -90 || hole.angle > 90)) {
          result.warnings.push(`Hole ${i + 1} angle ${hole.angle}° is outside typical range [-90°, 90°]`);
        }
        
        // Validation du plan de travail
        if (hole.plane && !this.isValidWorkPlane(hole.plane)) {
          result.errors.push({
            type: ValidationErrorType.WARNING,
            code: 'INVALID_WORK_PLANE',
            message: `Invalid work plane for hole ${i + 1}: ${hole.plane}`,
            field: 'plane',
            value: hole.plane
          });
        }
      }
      return;
    }
    
    // Ancien format avec un seul trou (pour compatibilité)
    // Coordonnées obligatoires
    if (data.x === undefined || data.y === undefined) {
      result.errors.push({
        type: ValidationErrorType.CRITICAL,
        code: 'MISSING_COORDINATES',
        message: 'Missing X or Y coordinate for hole'
      });
      return;
    }
    
    // Diamètre obligatoire et positif
    if (data.diameter === undefined || data.diameter <= 0) {
      result.errors.push({
        type: ValidationErrorType.CRITICAL,
        code: 'INVALID_DIAMETER',
        message: `Hole diameter must be positive, got: ${data.diameter}`,
        field: 'diameter',
        value: data.diameter
      });
    }
    
    // Vérification des limites pratiques
    if (data.diameter > 500) { // 500mm semble excessif pour un trou
      result.warnings.push(`Very large hole diameter: ${data.diameter}mm`);
    }
    
    // Validation de l'angle si présent
    if (data.angle !== undefined && (data.angle < -90 || data.angle > 90)) {
      result.warnings.push(`Hole angle ${data.angle}° is outside typical range [-90°, 90°]`);
    }
    
    // Validation du plan de travail
    if (data.plane && !this.isValidWorkPlane(data.plane)) {
      result.errors.push({
        type: ValidationErrorType.WARNING,
        code: 'INVALID_WORK_PLANE',
        message: `Invalid work plane: ${data.plane}`,
        field: 'plane',
        value: data.plane
      });
    }
  }

  /**
   * Valide le bloc AK (Outer contour)
   */
  private async validateAKBlock(block: DSTVParsedBlock, result: BlockValidationResult): Promise<void> {
    const data = block.data;
    
    if (!data.points || !Array.isArray(data.points)) {
      result.errors.push({
        type: ValidationErrorType.CRITICAL,
        code: 'MISSING_CONTOUR_POINTS',
        message: 'AK block must contain contour points'
      });
      return;
    }
    
    if (data.points.length < 3) {
      result.errors.push({
        type: ValidationErrorType.CRITICAL,
        code: 'INSUFFICIENT_POINTS',
        message: `Contour must have at least 3 points, got: ${data.points.length}`
      });
    }
    
    // Validation de la fermeture si requise
    if (this.semanticConfig.validateContourClosure && data.closed) {
      const firstPoint = data.points[0];
      const lastPoint = data.points[data.points.length - 1];
      
      const distance = Math.sqrt(
        Math.pow(firstPoint.x - lastPoint.x, 2) + 
        Math.pow(firstPoint.y - lastPoint.y, 2)
      );
      
      if (distance > this.semanticConfig.geometryTolerance) {
        result.warnings.push(`Contour may not be properly closed (gap: ${distance.toFixed(3)}mm)`);
      }
    }
    
    // Vérifier l'orientation (sens trigonométrique pour contour extérieur)
    const area = this.calculatePolygonArea(data.points);
    if (area < 0) {
      result.warnings.push('Outer contour appears to be oriented clockwise (should be counter-clockwise)');
    }
  }

  /**
   * Valide le bloc IK (Inner contour)
   */
  private async validateIKBlock(block: DSTVParsedBlock, result: BlockValidationResult): Promise<void> {
    // Logique similaire à AK mais pour contour intérieur
    await this.validateAKBlock(block, result);
    
    const data = block.data;
    if (data.points) {
      // Vérifier l'orientation (sens horaire pour contour intérieur)
      const area = this.calculatePolygonArea(data.points);
      if (area > 0) {
        result.warnings.push('Inner contour appears to be oriented counter-clockwise (should be clockwise)');
      }
    }
  }

  /**
   * Valide le bloc SI (Marking)
   */
  private async validateSIBlock(block: DSTVParsedBlock, result: BlockValidationResult): Promise<void> {
    const data = block.data;
    
    // Coordonnées et texte obligatoires
    if (data.x === undefined || data.y === undefined) {
      result.errors.push({
        type: ValidationErrorType.CRITICAL,
        code: 'MISSING_COORDINATES',
        message: 'Missing X or Y coordinate for marking'
      });
    }
    
    if (!data.text || data.text.trim() === '') {
      result.errors.push({
        type: ValidationErrorType.ERROR,
        code: 'MISSING_MARKING_TEXT',
        message: 'Marking must have text content'
      });
    }
    
    // Validation de la hauteur
    if (data.height !== undefined && data.height <= 0) {
      result.errors.push({
        type: ValidationErrorType.WARNING,
        code: 'INVALID_TEXT_HEIGHT',
        message: `Text height must be positive, got: ${data.height}`,
        field: 'height',
        value: data.height
      });
    }
    
    // Validation de l'angle
    if (data.angle !== undefined && (data.angle < 0 || data.angle >= 360)) {
      result.warnings.push(`Text angle ${data.angle}° should be in range [0°, 360°)`);
    }
  }

  /**
   * Valide le bloc SC (Cut)
   */
  private async validateSCBlock(block: DSTVParsedBlock, result: BlockValidationResult): Promise<void> {
    const data = block.data;
    
    // Coordonnées et dimensions obligatoires
    const requiredFields = ['x', 'y', 'width', 'height'];
    for (const field of requiredFields) {
      if (data[field] === undefined) {
        result.errors.push({
          type: ValidationErrorType.CRITICAL,
          code: 'MISSING_CUT_PARAMETER',
          message: `Missing required cut parameter: ${field}`,
          field
        });
      }
    }
    
    // Dimensions positives
    if (data.width !== undefined && data.width <= 0) {
      result.errors.push({
        type: ValidationErrorType.ERROR,
        code: 'INVALID_CUT_WIDTH',
        message: `Cut width must be positive, got: ${data.width}`,
        field: 'width',
        value: data.width
      });
    }
    
    if (data.height !== undefined && data.height <= 0) {
      result.errors.push({
        type: ValidationErrorType.ERROR,
        code: 'INVALID_CUT_HEIGHT',
        message: `Cut height must be positive, got: ${data.height}`,
        field: 'height',
        value: data.height
      });
    }
  }

  /**
   * Valide le bloc EN (End)
   */
  private async validateENBlock(block: DSTVParsedBlock, result: BlockValidationResult): Promise<void> {
    // EN est généralement sans données ou avec métadonnées optionnelles
    // Vérifier seulement qu'il n'y a pas de données inattendues
    if (Object.keys(block.data).length > 2) {
      result.warnings.push('EN block contains unexpected data fields');
    }
  }

  /**
   * Valide le bloc PU (Punch mark)
   */
  private async validatePUBlock(block: DSTVParsedBlock, result: BlockValidationResult): Promise<void> {
    const data = block.data;
    
    // Coordonnées obligatoires
    if (data.x === undefined || data.y === undefined) {
      result.errors.push({
        type: ValidationErrorType.CRITICAL,
        code: 'MISSING_COORDINATES',
        message: 'Missing X or Y coordinate for punch mark'
      });
    }
    
    // Validation des paramètres optionnels
    if (data.depth !== undefined && data.depth <= 0) {
      result.warnings.push(`Punch depth should be positive, got: ${data.depth}`);
    }
    
    if (data.diameter !== undefined && data.diameter <= 0) {
      result.warnings.push(`Punch diameter should be positive, got: ${data.diameter}`);
    }
  }

  /**
   * Valide le bloc KO (Contour marking)
   */
  private async validateKOBlock(block: DSTVParsedBlock, result: BlockValidationResult): Promise<void> {
    const data = block.data;
    
    if (!data.points || !Array.isArray(data.points)) {
      result.errors.push({
        type: ValidationErrorType.CRITICAL,
        code: 'MISSING_CONTOUR_POINTS',
        message: 'KO block must contain marking points'
      });
      return;
    }
    
    if (data.points.length < 2) {
      result.warnings.push(`Contour marking should have at least 2 points, got: ${data.points.length}`);
    }
  }

  /**
   * Valide les relations entre blocs
   */
  private async validateBlockRelations(blocks: DSTVParsedBlock[], context: ProcessingContext): Promise<void> {
    // Vérifier que les contours intérieurs sont bien dans les contours extérieurs
    const akBlocks = blocks.filter(b => b.type === DSTVBlockType.AK);
    const ikBlocks = blocks.filter(b => b.type === DSTVBlockType.IK);
    
    for (const ikBlock of ikBlocks) {
      let isInsideAK = false;
      
      for (const akBlock of akBlocks) {
        if (this.isContourInside(ikBlock.data.points, akBlock.data.points)) {
          isInsideAK = true;
          break;
        }
      }
      
      if (!isInsideAK && this.semanticConfig.strictMode) {
        context.addWarning(`Inner contour at line ${ikBlock.position.line} is not inside any outer contour`);
      }
    }
    
    // Autres validations relationnelles...
  }

  /**
   * Valide la séquence logique des blocs
   */
  private validateBlockSequence(blocks: DSTVParsedBlock[], errors: string[], context: ProcessingContext): void {
    // La norme DSTV a une séquence recommandée mais pas strictement obligatoire
    // ST doit être en premier, EN en dernier si présent
    
    let hasGeometryBlocks = false;
    let hasMarkingBlocks = false;
    
    for (const block of blocks) {
      if ([DSTVBlockType.BO, DSTVBlockType.AK, DSTVBlockType.IK, DSTVBlockType.SC].includes(block.type)) {
        hasGeometryBlocks = true;
      }
      
      if ([DSTVBlockType.SI, DSTVBlockType.PU, DSTVBlockType.KO].includes(block.type)) {
        hasMarkingBlocks = true;
      }
    }
    
    // Avertissements sur l'organisation
    if (hasGeometryBlocks && hasMarkingBlocks) {
      context.info('File contains both geometry and marking blocks - good practice');
    }
  }

  /**
   * Génère le résultat final de validation
   */
  private generateValidationResult(
    blocks: DSTVParsedBlock[], 
    validationResults: BlockValidationResult[], 
    context: ProcessingContext
  ): DSTVValidatedData {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const validBlocks: DSTVParsedBlock[] = [];
    
    let totalConformityScore = 0;
    let validBlockCount = 0;
    
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const result = validationResults[i];
      
      // Collecter les erreurs et avertissements
      result.errors.forEach(error => {
        allErrors.push(`${block.type} (line ${block.position.line}): ${error.message}`);
      });
      result.warnings.forEach(warning => {
        allWarnings.push(`${block.type} (line ${block.position.line}): ${warning}`);
      });
      
      // Ajouter les blocs valides
      if (result.isValid || !this.semanticConfig.strictMode) {
        validBlocks.push(block);
      }
      
      // Calculer le score de conformité
      totalConformityScore += result.conformityScore;
      validBlockCount++;
    }
    
    const overallConformityScore = validBlockCount > 0 ? totalConformityScore / validBlockCount : 0;
    
    return {
      validBlocks,
      errors: allErrors,
      warnings: allWarnings,
      conformityScore: overallConformityScore
    };
  }

  // ================================
  // MÉTHODES UTILITAIRES
  // ================================

  private isValidProfileName(profileName: string): boolean {
    // Patterns courants: IPE200, HEB300, L50x50x5, etc.
    const standardPatterns = [
      /^(IPE|HEA|HEB|HEM|UPN|L|T)\d+/i,  // Profils européens
      /^(W|M|S|HP|C|MC|L|WT)\d+/i,      // Profils américains
      /^\d+x\d+/i                        // Dimensions simples
    ];
    
    return standardPatterns.some(pattern => pattern.test(profileName));
  }

  private isValidWorkPlane(plane: string): boolean {
    return /^E[0-9]$/.test(plane);
  }

  private calculatePolygonArea(points: Array<{ x: number; y: number }>): number {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    
    return area / 2;
  }

  private isContourInside(innerPoints: Array<{ x: number; y: number }>, outerPoints: Array<{ x: number; y: number }>): boolean {
    // Algorithme simplifié - tester si tous les points intérieurs sont dans le contour extérieur
    return innerPoints.every(point => this.isPointInPolygon(point, outerPoints));
  }

  private isPointInPolygon(point: { x: number; y: number }, polygon: Array<{ x: number; y: number }>): boolean {
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
          (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
        inside = !inside;
      }
    }
    
    return inside;
  }
}