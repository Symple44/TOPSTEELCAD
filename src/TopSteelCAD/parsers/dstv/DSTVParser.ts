/**
 * DSTVParser - Parser modulaire pour fichiers DSTV/NC
 * Architecture propre avec séparation des responsabilités
 */

import { FileParser, PivotScene } from '@/types/viewer';
import { DSTVParserConfig, DSTVParseResult, ValidationResult } from './types';
import { DSTVLexer } from './lexer/DSTVLexer';
import { DSTVSyntaxParser } from './parser/DSTVSyntaxParser';
import { DSTVValidator } from './validators/DSTVValidator';
import { DSTVToPivotConverter } from './converters/DSTVToPivotConverter';

/**
 * Parser DSTV/NC modulaire et extensible
 */
export class DSTVParser implements FileParser {
  // Extensions supportées
  public readonly supportedExtensions = [
    '.nc', '.nc1', '.nc2', '.nc3', '.nc4', 
    '.nc5', '.nc6', '.nc7', '.nc8', '.nc9'
  ];
  
  // Modules
  private lexer: DSTVLexer;
  private syntaxParser: DSTVSyntaxParser;
  private validator: DSTVValidator;
  private converter: DSTVToPivotConverter;
  
  // Configuration
  private config: DSTVParserConfig;
  
  // Métriques
  private lastParseTime: number = 0;
  private lastTokenCount: number = 0;
  private lastProfileCount: number = 0;
  
  constructor(config?: Partial<DSTVParserConfig>) {
    // Configuration par défaut
    this.config = {
      unit: 'mm',
      coordinateSystem: 'right',
      defaultMaterial: {
        grade: 'S355',
        density: 7850,
        color: '#4b5563',
        opacity: 1,
        metallic: 0.7,
        roughness: 0.3,
        reflectivity: 0.5
      },
      validation: {
        strictMode: false,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowUnknownCommands: true
      },
      performance: {
        enableCache: true,
        batchSize: 100,
        parallelProcessing: false
      },
      ...config
    };
    
    // Initialiser les modules
    this.lexer = new DSTVLexer();
    this.syntaxParser = new DSTVSyntaxParser();
    this.validator = new DSTVValidator(this.config.validation);
    this.converter = new DSTVToPivotConverter();
  }
  
  /**
   * Parse un fichier DSTV
   */
  async parse(data: ArrayBuffer | string): Promise<PivotScene> {
    const startTime = performance.now();
    
    try {
      // 1. Validation préliminaire
      const validationResult = this.validator.validate(data);
      if (!validationResult.isValid) {
        throw new Error(`DSTV validation failed: ${validationResult.errors.join('; ')}`);
      }
      
      // Afficher les avertissements s'il y en a
      if (validationResult.warnings.length > 0) {
        this.logWarnings(validationResult.warnings);
      }
      
      // 2. Conversion en string si nécessaire
      const content = typeof data === 'string' 
        ? data 
        : new TextDecoder('utf-8').decode(data);
      
      // 3. Analyse lexicale
      const tokens = this.lexer.tokenize(content);
      this.lastTokenCount = tokens.length;
      
      // 4. Analyse syntaxique
      const profiles = this.syntaxParser.parse(tokens);
      this.lastProfileCount = profiles.length;
      
      // 5. Validation des profils
      for (const profile of profiles) {
        const profileValidation = this.validator.validateProfile(profile);
        if (!profileValidation.isValid && this.config.validation?.strictMode) {
          throw new Error(`Profile validation failed: ${profileValidation.errors.join('; ')}`);
        }
      }
      
      // 6. Conversion vers PivotScene
      const scene = this.converter.convert(profiles);
      
      // 7. Enrichir avec métadonnées
      this.enrichSceneMetadata(scene);
      
      // Enregistrer le temps de parsing
      this.lastParseTime = performance.now() - startTime;
      
      return scene;
      
    } catch (error) {
      throw new Error(`DSTV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Valide un fichier DSTV sans le parser complètement
   */
  validate(data: ArrayBuffer | string): boolean {
    try {
      const result = this.validator.validate(data);
      return result.isValid;
    } catch {
      return false;
    }
  }
  
  /**
   * Obtient les résultats détaillés du dernier parsing
   */
  getParseResults(): DSTVParseResult {
    return {
      success: true,
      profiles: [],
      statistics: {
        profileCount: this.lastProfileCount,
        featureCount: 0,
        parseTime: this.lastParseTime
      }
    };
  }
  
  /**
   * Obtient les métriques de performance
   */
  getMetrics(): {
    parseTime: number;
    tokenCount: number;
    profileCount: number;
    tokensPerSecond: number;
  } {
    const tokensPerSecond = this.lastParseTime > 0 
      ? (this.lastTokenCount / this.lastParseTime) * 1000 
      : 0;
    
    return {
      parseTime: this.lastParseTime,
      tokenCount: this.lastTokenCount,
      profileCount: this.lastProfileCount,
      tokensPerSecond
    };
  }
  
  /**
   * Enrichit la scène avec des métadonnées supplémentaires
   */
  private enrichSceneMetadata(scene: PivotScene): void {
    if (!scene.metadata) {
      scene.metadata = {};
    }
    
    // Ajouter les métriques de parsing
    scene.metadata.parseTime = this.lastParseTime;
    scene.metadata.tokenCount = this.lastTokenCount;
    scene.metadata.parser = 'DSTVParser v2.0';
    scene.metadata.parserConfig = {
      unit: this.config.unit,
      coordinateSystem: this.config.coordinateSystem
    };
    
    // Calculer les statistiques
    let totalFeatures = 0;
    let totalHoles = 0;
    let totalCuts = 0;
    let totalMarkings = 0;
    
    scene.elements.forEach(element => {
      if (element.metadata?.features) {
        const features = element.metadata.features;
        totalFeatures += features.length;
        
        features.forEach((f: any) => {
          if (f.type === 'hole') totalHoles++;
          if (f.type === 'cut') totalCuts++;
          if (f.type === 'marking') totalMarkings++;
        });
      }
    });
    
    scene.metadata.statistics = {
      elementCount: scene.elements.size,
      featureCount: totalFeatures,
      holeCount: totalHoles,
      cutCount: totalCuts,
      markingCount: totalMarkings
    };
  }
  
  /**
   * Affiche les avertissements de validation
   */
  private logWarnings(warnings: string[]): void {
    if (warnings.length > 0) {
      console.warn('⚠️ DSTV Validation Warnings:');
      warnings.forEach(warning => {
        console.warn(`  - ${warning}`);
      });
    }
  }
}

// Export par défaut pour compatibilité
export default DSTVParser;