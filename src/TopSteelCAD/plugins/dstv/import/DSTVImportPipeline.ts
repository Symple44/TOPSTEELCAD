/**
 * Pipeline d'import DSTV conforme à la norme officielle
 * 
 * Processus d'import en 5 étapes:
 * 1. Lexical Analysis - Tokenization du fichier DSTV
 * 2. Syntax Parsing - Construction de l'AST selon la grammaire DSTV
 * 3. Semantic Validation - Validation selon les règles métier DSTV
 * 4. Normalization - Conversion vers format pivot interne
 * 5. Scene Building - Construction de la scène 3D finale
 */

// ImportPipeline import removed - not used
import { ProcessingPipeline } from '../../../core/pipeline/ProcessingPipeline';
import { ProcessingContext } from '../../../core/pipeline/ProcessingContext';
import { PivotScene } from '@/types/viewer';
import { DSTVPluginConfig } from '../DSTVPlugin';

// Import des stages
import { DSTVLexicalStage } from './stages/DSTVLexicalStage';
import { DSTVSyntaxStage } from './stages/DSTVSyntaxStage';
import { DSTVSemanticStage } from './stages/DSTVSemanticStage';
import { DSTVNormalizationStage } from './stages/DSTVNormalizationStage';
import { DSTVSceneBuildingStage } from './stages/DSTVSceneBuildingStage';

// Types intermédiaires pour le pipeline
export interface DSTVTokens {
  tokens: Array<{
    type: string;
    value: string;
    line: number;
    column: number;
  }>;
  metadata: {
    totalLines: number;
    totalTokens: number;
    blockCount: number;
  };
}

export interface DSTVSyntaxTree {
  blocks: Array<{
    type: string;
    data: Record<string, any>;
    position: { start: number; end: number };
  }>;
  metadata: {
    version: string;
    profile: string;
    elements: number;
    features: number;
  };
}

export interface DSTVValidatedData {
  validBlocks: DSTVSyntaxTree['blocks'];
  errors: string[];
  warnings: string[];
  conformityScore: number;
}

export interface DSTVNormalizedData {
  profiles: Array<{
    id: string;
    type: string;
    dimensions: Record<string, number>;
    material: string;
    features: Array<{
      type: string;
      parameters: Record<string, any>;
    }>;
  }>;
  metadata: Record<string, any>;
}

/**
 * Pipeline d'import DSTV moderne et conforme
 */
export class DSTVImportPipeline {
  private pipeline: ProcessingPipeline<ArrayBuffer, PivotScene>;
  private config: DSTVPluginConfig;

  constructor(config: DSTVPluginConfig) {
    this.config = config;
    this.pipeline = new ProcessingPipeline<ArrayBuffer, PivotScene>('dstv-import-pipeline', {
      abortOnError: !config.strictMode, // En mode strict, continuer malgré les erreurs
      enableProfiling: config.enableDebugLogs,
      stageTimeout: config.maxFileSize > 10 * 1024 * 1024 ? 60000 : 30000 // Plus de temps pour gros fichiers
    });

    this.setupPipeline();
  }

  /**
   * Configure les stages du pipeline selon la configuration
   */
  private setupPipeline(): void {
    // Stage 1: Analyse lexicale - Tokenisation
    this.pipeline.addStage(
      new DSTVLexicalStage({
        enableProfiling: this.config.enableDebugLogs,
        logLevel: this.config.enableDebugLogs ? 'debug' : 'info'
      })
    );

    // Stage 2: Analyse syntaxique - Construction AST
    this.pipeline.addStage(
      new DSTVSyntaxStage({
        strictMode: this.config.strictMode,
        supportAllBlocks: this.config.supportAllBlocks,
        enableProfiling: this.config.enableDebugLogs,
        logLevel: this.config.enableDebugLogs ? 'debug' : 'info'
      })
    );

    // Stage 3: Validation sémantique - Conformité DSTV
    this.pipeline.addStage(
      new DSTVSemanticStage({
        strictMode: this.config.strictMode,
        validateContourClosure: this.config.validateContourClosure,
        enableAdvancedHoles: this.config.enableAdvancedHoles,
        enableWeldingPreparation: this.config.enableWeldingPreparation,
        enablePlaneDefinition: this.config.enablePlaneDefinition,
        enableBendingSupport: this.config.enableBendingSupport,
        enableProfiling: this.config.enableDebugLogs,
        logLevel: this.config.enableDebugLogs ? 'debug' : 'info'
      })
    );

    // Stage 4: Normalisation - Conversion vers format pivot
    this.pipeline.addStage(
      new DSTVNormalizationStage({
        enableGeometryCache: this.config.enableGeometryCache,
        enableProfiling: this.config.enableDebugLogs,
        logLevel: this.config.enableDebugLogs ? 'debug' : 'info'
      })
    );

    // Stage 5: Construction de scène - Génération 3D finale
    this.pipeline.addStage(
      new DSTVSceneBuildingStage({
        enableGeometryCache: this.config.enableGeometryCache,
        enableProfiling: this.config.enableDebugLogs,
        logLevel: this.config.enableDebugLogs ? 'debug' : 'info'
      })
    );
  }

  /**
   * Exécute le pipeline d'import complet
   */
  async execute(data: ArrayBuffer): Promise<PivotScene> {
    const context = new ProcessingContext(undefined, {
      config: this.config,
      startTime: performance.now()
    });

    try {
      const result = await this.pipeline.execute(data, context);
      
      // Ajouter les métriques finales
      const endTime = performance.now();
      const duration = endTime - (context.getMetric<number>('startTime') || endTime);
      
      context.addMetric('total_import_duration', duration);
      context.addMetric('import_success', true);
      
      if (this.config.enableDebugLogs) {
        console.log('🎯 DSTV Import completed successfully', {
          duration: `${duration.toFixed(2)}ms`,
          elements: result.elements.size,
          metadata: result.metadata
        });
      }

      return result;

    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - (context.getMetric<number>('startTime') || endTime);
      
      context.addMetric('total_import_duration', duration);
      context.addMetric('import_success', false);
      context.addMetric('import_error', error instanceof Error ? error.message : String(error));

      if (this.config.enableDebugLogs) {
        console.error('❌ DSTV Import failed', {
          duration: `${duration.toFixed(2)}ms`,
          error: error instanceof Error ? error.message : String(error),
          context: context.toDebugInfo()
        });
      }

      throw error;
    }
  }

  /**
   * Retourne des informations sur le pipeline
   */
  getInfo(): Record<string, any> {
    return {
      name: 'DSTV Import Pipeline',
      version: '2.0.0',
      stages: this.pipeline.stages.map(stage => ({
        name: stage.name,
        description: stage.description,
        estimatedDuration: stage.estimatedDuration
      })),
      config: {
        strictMode: this.config.strictMode,
        supportAllBlocks: this.config.supportAllBlocks,
        enableAdvancedFeatures: {
          advancedHoles: this.config.enableAdvancedHoles,
          weldingPreparation: this.config.enableWeldingPreparation,
          planeDefinition: this.config.enablePlaneDefinition,
          bendingSupport: this.config.enableBendingSupport
        },
        performance: {
          geometryCache: this.config.enableGeometryCache,
          parallelProcessing: this.config.parallelBlockProcessing,
          maxFileSize: this.config.maxFileSize
        }
      }
    };
  }

  /**
   * Valide les prérequis avant exécution
   */
  async validate(data: ArrayBuffer): Promise<boolean> {
    // Vérification taille
    if (data.byteLength > this.config.maxFileSize) {
      throw new Error(`File too large: ${data.byteLength} bytes (max: ${this.config.maxFileSize})`);
    }

    // Vérification format minimal
    const content = new TextDecoder('utf-8').decode(data.slice(0, 1024));
    if (!content.includes('ST')) {
      throw new Error('Invalid DSTV file: missing ST block');
    }

    return true;
  }

  /**
   * Nettoyage des ressources
   */
  async dispose(): Promise<void> {
    // Le pipeline se nettoie automatiquement
    // Ici on peut ajouter du nettoyage spécifique DSTV si nécessaire
  }
}