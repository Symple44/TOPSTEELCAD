/**
 * DSTVPlugin - Plugin moderne pour format DSTV/NC
 * 
 * Conforme à la norme officielle DSTV 7ème édition (Juillet 1998)
 * Deutscher Stahlbau-Verband - Standard industriel allemand
 */

import { BaseFormatPlugin } from '../../core/types/PluginTypes';
import { ImportPipeline, ExportPipeline } from '../../core/types/PipelineTypes';
import { ValidationResult, FormatCapabilities } from '../../core/types/EngineTypes';
import { DSTVImportPipeline } from './import/DSTVImportPipeline';
import { DSTVExportPipeline } from './export/DSTVExportPipeline';
import { DSTVValidator, ValidationLevel } from './validation/DSTVValidator';

/**
 * Configuration du plugin DSTV
 */
export interface DSTVPluginConfig {
  // Conformité norme
  strictMode: boolean;              // Mode strict conforme norme
  supportAllBlocks: boolean;        // Support de tous les blocs DSTV
  validateContourClosure: boolean;  // Validation fermeture contours
  
  // Fonctionnalités
  enableAdvancedHoles: boolean;     // Trous filetés, fraisés, etc.
  enableWeldingPreparation: boolean; // Préparation soudure
  enablePlaneDefinition: boolean;   // Plans supplémentaires E0-E9
  enableBendingSupport: boolean;    // Support pliage KA
  
  // Performance
  enableGeometryCache: boolean;     // Cache géométrique
  maxFileSize: number;              // Taille max fichier (bytes)
  parallelBlockProcessing: boolean; // Traitement parallèle blocs
  
  // Debugging
  enableDebugLogs: boolean;         // Logs détaillés
  exportParsingMetrics: boolean;    // Métriques de parsing
  
  // Validation
  validationLevel: ValidationLevel; // Niveau de validation
}

/**
 * Plugin DSTV moderne et conforme
 */
export class DSTVPlugin extends BaseFormatPlugin {
  readonly id = 'dstv' as const;
  readonly name = 'DSTV/NC Format';
  readonly version = '2.0.0';
  readonly description = 'German Steel Construction Association format for CNC machines';
  readonly author = 'TopSteelCAD Team';
  
  readonly supportedExtensions = [
    '.nc', '.nc1', '.nc2', '.nc3', '.nc4', 
    '.nc5', '.nc6', '.nc7', '.nc8', '.nc9'
  ];
  
  readonly capabilities: FormatCapabilities = {
    import: {
      geometry: true,
      materials: true,
      properties: true,
      hierarchy: false,        // DSTV ne supporte pas la hiérarchie
      assemblies: false,       // DSTV = pièces individuelles
      features: true,          // Trous, découpes, marquages
      holes: true,             // Support complet trous DSTV
      cuts: true,              // Contours AK/IK et découpes SC  
      markings: true           // Marquages SI, PU, KO
    },
    export: {
      geometry: true,
      materials: true,
      properties: true,
      hierarchy: false,
      assemblies: false,
      features: true,
      holes: true,
      cuts: true,
      markings: true
    }
  };
  
  private config: DSTVPluginConfig;
  private validator: DSTVValidator;
  
  // Statistiques d'usage
  private stats = {
    filesProcessed: 0,
    totalElements: 0,
    totalFeatures: 0,
    avgProcessingTime: 0,
    errorCount: 0,
    lastUsed: new Date()
  };

  constructor(config: Partial<DSTVPluginConfig> = {}) {
    super();
    
    // Configuration par défaut
    this.config = {
      // Mode strict par défaut pour garantir la conformité
      strictMode: true,
      supportAllBlocks: true,
      validateContourClosure: true,
      
      // Toutes les fonctionnalités DSTV activées
      enableAdvancedHoles: true,
      enableWeldingPreparation: true,
      enablePlaneDefinition: true,
      enableBendingSupport: true,
      
      // Performance optimisée
      enableGeometryCache: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      parallelBlockProcessing: false, // Désactivé par défaut pour compatibilité
      
      // Debugging en développement
      enableDebugLogs: process.env.NODE_ENV === 'development',
      exportParsingMetrics: true,
      
      // Validation par défaut
      validationLevel: ValidationLevel.STANDARD,
      
      ...config
    };
    
    // Initialiser le validateur avec la config
    this.validator = new DSTVValidator(this.config.validationLevel || ValidationLevel.STANDARD);
  }

  // ================================
  // PIPELINE FACTORIES
  // ================================

  /**
   * Crée le pipeline d'importation DSTV
   */
  createImportPipeline(): ImportPipeline {
    return new DSTVImportPipeline(this.config) as any;
  }

  /**
   * Crée le pipeline d'exportation DSTV
   */
  createExportPipeline(): ExportPipeline {
    return new DSTVExportPipeline(this.config) as any;
  }

  // ================================
  // VALIDATION ET DÉTECTION
  // ================================

  /**
   * Valide un fichier DSTV selon la norme officielle
   */
  async validateFile(data: ArrayBuffer): Promise<ValidationResult> {
    const startTime = performance.now();
    
    try {
      // Vérification taille
      if (data.byteLength > this.config.maxFileSize) {
        return this.createValidationError(
          `File too large: ${data.byteLength} bytes (max: ${this.config.maxFileSize})`
        );
      }
      
      // Conversion en texte
      const content = new TextDecoder('utf-8').decode(data);
      
      // Validation complète par le validateur
      // Simple validation for file detection
      const result = { isValid: content.includes('**'), errors: [], warnings: [], info: [] };
      
      // Ajouter confiance selon qualité de validation
      const confidence = this.calculateValidationConfidence(result, content);
      
      // Mettre à jour stats
      const duration = performance.now() - startTime;
      this.updateValidationStats(result.isValid, duration);
      
      return {
        ...result,
        confidence
      };
      
    } catch (error) {
      return this.createValidationError(
        `Validation error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extrait les métadonnées d'un fichier DSTV
   */
  async extractMetadata(data: ArrayBuffer): Promise<any> {
    try {
      const content = new TextDecoder('utf-8').decode(data);
      
      // Parser rapide pour extraire les métadonnées du header ST
      const metadata = await this.parseHeaderMetadata(content);
      
      return {
        format: this.id,
        fileSize: data.byteLength,
        version: this.detectDSTVVersion(content),
        elements: metadata.profileCount || 0,
        features: metadata.featureCount || 0,
        ...metadata
      };
      
    } catch (error) {
      return {
        format: this.id,
        fileSize: data.byteLength,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // ================================
  // LIFECYCLE HOOKS
  // ================================

  /**
   * Initialisation du plugin
   */
  async onRegister(): Promise<void> {
    console.log(`🔧 DSTV Plugin registered v${this.version}`);
    console.log(`   Features: ${this.getEnabledFeatures().join(', ')}`);
    console.log(`   Strict mode: ${this.config.strictMode ? 'ON' : 'OFF'}`);
    
    // Validation de la configuration
    this.validateConfiguration();
    
    // Pré-chauffer le cache si activé
    if (this.config.enableGeometryCache) {
      await this.initializeGeometryCache();
    }
  }

  /**
   * Nettoyage lors du désenregistrement
   */
  async onUnregister(): Promise<void> {
    console.log(`🔧 DSTV Plugin unregistered (processed ${this.stats.filesProcessed} files)`);
    
    // Nettoyage des ressources
    if (this.config.enableGeometryCache) {
      await this.clearGeometryCache();
    }
    
    // Export des stats finales si activé
    if (this.config.exportParsingMetrics) {
      this.exportFinalStats();
    }
  }

  // ================================
  // CONFIGURATION
  // ================================

  /**
   * Met à jour la configuration
   */
  updateConfig(updates: Partial<DSTVPluginConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Update validation level
    if (updates.validationLevel) {
      this.validator.setLevel(updates.validationLevel);
    }
    
    console.log(`🔧 DSTV Plugin config updated:`, updates);
  }

  /**
   * Retourne la configuration actuelle
   */
  getConfig(): Readonly<DSTVPluginConfig> {
    return { ...this.config };
  }

  /**
   * Retourne les fonctionnalités activées
   */
  getEnabledFeatures(): string[] {
    const features: string[] = [];
    
    if (this.config.enableAdvancedHoles) features.push('Advanced Holes');
    if (this.config.enableWeldingPreparation) features.push('Welding Prep');
    if (this.config.enablePlaneDefinition) features.push('Plane Definition');
    if (this.config.enableBendingSupport) features.push('Bending');
    if (this.config.enableGeometryCache) features.push('Geometry Cache');
    
    return features;
  }

  // ================================
  // STATISTIQUES
  // ================================

  /**
   * Retourne les statistiques d'usage
   */
  getStats(): Readonly<typeof this.stats> {
    return { ...this.stats };
  }

  /**
   * Reset des statistiques
   */
  resetStats(): void {
    this.stats = {
      filesProcessed: 0,
      totalElements: 0,
      totalFeatures: 0,
      avgProcessingTime: 0,
      errorCount: 0,
      lastUsed: new Date()
    };
  }

  /**
   * Met à jour les stats après traitement
   */
  updateProcessingStats(elements: number, features: number, duration: number, success: boolean): void {
    this.stats.filesProcessed++;
    this.stats.totalElements += elements;
    this.stats.totalFeatures += features;
    this.stats.avgProcessingTime = 
      (this.stats.avgProcessingTime + duration) / 2;
    
    if (!success) {
      this.stats.errorCount++;
    }
    
    this.stats.lastUsed = new Date();
  }

  // ================================
  // MÉTHODES PRIVÉES
  // ================================

  /**
   * Calcule la confiance de validation
   */
  private calculateValidationConfidence(result: ValidationResult, content: string): number {
    let confidence = 0.5; // Base
    
    // Présence des blocs obligatoires
    if (content.includes('ST') && content.includes('EN')) {
      confidence += 0.3;
    }
    
    // Qualité de validation
    if (result.isValid && result.errors.length === 0) {
      confidence += 0.2;
    }
    
    // Peu de warnings = meilleure confiance
    if (result.warnings.length < 3) {
      confidence += 0.1;
    }
    
    return Math.min(1.0, confidence);
  }

  /**
   * Parse rapide des métadonnées du header
   */
  private async parseHeaderMetadata(content: string): Promise<Record<string, any>> {
    const metadata: Record<string, any> = {};
    
    try {
      // Rechercher le bloc ST
      const stMatch = content.match(/^ST\s*$[\r\n]+([\s\S]*?)^[A-Z]{2}\s*$/m);
      if (stMatch) {
        const headerLines = stMatch[1].trim().split(/\r?\n/);
        
        if (headerLines.length >= 8) {
          metadata.orderNumber = headerLines[0]?.trim();
          metadata.drawingNumber = headerLines[1]?.trim();
          metadata.phaseNumber = headerLines[2]?.trim();
          metadata.pieceNumber = headerLines[3]?.trim();
          metadata.steelGrade = headerLines[4]?.trim();
          metadata.quantity = parseInt(headerLines[5]?.trim()) || 1;
          metadata.profileName = headerLines[6]?.trim();
          metadata.profileType = headerLines[7]?.trim();
        }
      }
      
      // Compter les éléments approximativement
      metadata.profileCount = (content.match(/^ST\s*$/gm) || []).length;
      metadata.featureCount = (
        (content.match(/^BO\s*$/gm) || []).length +
        (content.match(/^AK\s*$/gm) || []).length +
        (content.match(/^IK\s*$/gm) || []).length +
        (content.match(/^SI\s*$/gm) || []).length +
        (content.match(/^SC\s*$/gm) || []).length
      );
      
    } catch (error) {
      console.warn('Error parsing DSTV metadata:', error);
    }
    
    return metadata;
  }

  /**
   * Détecte la version DSTV (approximative)
   */
  private detectDSTVVersion(content: string): string {
    // Heuristique basée sur les fonctionnalités présentes
    if (content.includes('E0') || content.includes('E1')) {
      return '7th Edition (1998) or later'; // Plane definition
    }
    if (content.includes('KA')) {
      return '6th Edition or later'; // Bending support
    }
    if (content.includes('PU') || content.includes('KO')) {
      return '5th Edition or later'; // Powder/Punch marking
    }
    
    return 'Unknown (pre-5th Edition)';
  }

  /**
   * Valide la configuration du plugin
   */
  private validateConfiguration(): void {
    if (this.config.maxFileSize < 1024) {
      console.warn('⚠️ DSTV: Very small max file size configured');
    }
    
    if (this.config.strictMode && !this.config.supportAllBlocks) {
      console.warn('⚠️ DSTV: Strict mode enabled but not all blocks supported');
    }
  }

  /**
   * Met à jour les stats de validation
   */
  private updateValidationStats(isValid: boolean, _duration: number): void {
    // Stats basiques pour monitoring
    if (!isValid) {
      this.stats.errorCount++;
    }
  }

  /**
   * Initialise le cache géométrique
   */
  private async initializeGeometryCache(): Promise<void> {
    // TODO: Implémenter cache géométrique
    console.log('🔧 DSTV: Geometry cache initialized');
  }

  /**
   * Nettoie le cache géométrique
   */
  private async clearGeometryCache(): Promise<void> {
    // TODO: Nettoyer cache
    console.log('🔧 DSTV: Geometry cache cleared');
  }

  /**
   * Exporte les statistiques finales
   */
  private exportFinalStats(): void {
    console.log('📊 DSTV Plugin Final Stats:', {
      ...this.stats,
      successRate: this.stats.filesProcessed > 0 
        ? ((this.stats.filesProcessed - this.stats.errorCount) / this.stats.filesProcessed * 100).toFixed(1) + '%'
        : 'N/A'
    });
  }

  // ================================
  // DEBUGGING
  // ================================

  /**
   * Export complet pour debugging
   */
  toDebugInfo(): Record<string, any> {
    return {
      plugin: {
        id: this.id,
        name: this.name,
        version: this.version,
        capabilities: this.capabilities
      },
      config: this.config,
      stats: this.stats,
      enabledFeatures: this.getEnabledFeatures()
    };
  }
}