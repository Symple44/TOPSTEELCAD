/**
 * FormatDetector - Détection automatique de formats de fichiers
 * 
 * Utilise plusieurs stratégies pour identifier le format d'un fichier:
 * - Extension de fichier
 * - Signatures/magic bytes
 * - Validation par plugin
 * - Analyse heuristique du contenu
 */

import {
  FormatPlugin,
  DetectionResult,
  DetectionRule,
  SupportedFormat
} from '../types/EngineTypes';
import { PluginRegistry } from './PluginRegistry';

/**
 * Configuration du détecteur
 */
export interface FormatDetectorConfig {
  enableExtensionDetection: boolean;
  enableSignatureDetection: boolean;
  enableContentAnalysis: boolean;
  enablePluginValidation: boolean;
  maxAnalysisSize: number; // Taille max à analyser en bytes
  confidenceWeights: {
    extension: number;
    signature: number;
    content: number;
    validation: number;
  };
}

/**
 * Détecteur de format de fichier
 */
export class FormatDetector {
  private registry: PluginRegistry;
  private rules: DetectionRule[] = [];
  private signatures = new Map<string, { format: SupportedFormat; confidence: number }>();
  
  private config: FormatDetectorConfig = {
    enableExtensionDetection: true,
    enableSignatureDetection: true,
    enableContentAnalysis: true,
    enablePluginValidation: true,
    maxAnalysisSize: 1024 * 1024, // 1MB
    confidenceWeights: {
      extension: 0.3,
      signature: 0.4,
      content: 0.2,
      validation: 0.1
    }
  };

  constructor(registry: PluginRegistry, config?: Partial<FormatDetectorConfig>) {
    this.registry = registry;
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.initializeBuiltInRules();
    this.initializeSignatures();
  }

  /**
   * Détecte le format d'un fichier
   */
  async detect(file: File): Promise<DetectionResult> {
    const candidates = new Map<SupportedFormat, number>(); // format -> confidence
    const reasons: string[] = [];
    
    try {
      // 1. Détection par extension
      if (this.config.enableExtensionDetection) {
        const extResult = await this.detectByExtension(file);
        if (extResult.format) {
          const confidence = (extResult.confidence || 0) * this.config.confidenceWeights.extension;
          candidates.set(extResult.format, (candidates.get(extResult.format) || 0) + confidence);
          reasons.push(Array.isArray(extResult.reasons) ? extResult.reasons.join(', ') : String(extResult.reasons || ''));
        }
      }
      
      // 2. Détection par signature
      if (this.config.enableSignatureDetection) {
        const sigResult = await this.detectBySignature(file);
        if (sigResult.format) {
          const confidence = (sigResult.confidence || 0) * this.config.confidenceWeights.signature;
          candidates.set(sigResult.format, (candidates.get(sigResult.format) || 0) + confidence);
          reasons.push(Array.isArray(sigResult.reasons) ? sigResult.reasons.join(', ') : String(sigResult.reasons || ''));
        }
      }
      
      // 3. Analyse du contenu
      if (this.config.enableContentAnalysis) {
        const contentResult = await this.detectByContent(file);
        if (contentResult.format) {
          const confidence = (contentResult.confidence || 0) * this.config.confidenceWeights.content;
          candidates.set(contentResult.format, (candidates.get(contentResult.format) || 0) + confidence);
          reasons.push(Array.isArray(contentResult.reasons) ? contentResult.reasons.join(', ') : String(contentResult.reasons || ''));
        }
      }
      
      // 4. Validation par plugin
      if (this.config.enablePluginValidation && candidates.size > 0) {
        const validationResults = await this.validateWithPlugins(file, Array.from(candidates.keys()));
        
        for (const [format, validationConfidence] of validationResults) {
          const confidence = validationConfidence * this.config.confidenceWeights.validation;
          candidates.set(format, (candidates.get(format) || 0) + confidence);
          reasons.push(`Validation: ${format} plugin validated`);
        }
      }
      
      // 5. Sélectionner le meilleur candidat
      if (candidates.size === 0) {
        return {
          format: null,
          confidence: 0,
          reasons: ['No format detected'],
          alternatives: []
        };
      }
      
      const sortedCandidates = Array.from(candidates.entries())
        .sort(([, a], [, b]) => b - a);
      
      const [bestFormat, bestConfidence] = sortedCandidates[0];
      
      const alternatives = sortedCandidates.slice(1).map(([format, confidence]) => ({
        format,
        confidence,
        reason: `Alternative candidate with ${(confidence * 100).toFixed(1)}% confidence`
      }));
      
      return {
        format: bestFormat,
        confidence: Math.min(1.0, bestConfidence), // Cap à 1.0
        reasons,
        alternatives
      };
      
    } catch (error) {
      console.error('Format detection error:', error);
      return {
        format: null,
        confidence: 0,
        reasons: [`Detection error: ${error instanceof Error ? error.message : String(error)}`],
        alternatives: []
      };
    }
  }

  /**
   * Ajoute un plugin au détecteur
   */
  addPlugin(plugin: FormatPlugin): void {
    // Les plugins sont automatiquement utilisés via le registry
    console.log(`Added plugin to detector: ${plugin.id}`);
  }

  /**
   * Supprime un plugin du détecteur
   */
  removePlugin(formatId: string): void {
    console.log(`Removed plugin from detector: ${formatId}`);
  }

  /**
   * Ajoute une règle de détection personnalisée
   */
  addDetectionRule(rule: DetectionRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  // ================================
  // MÉTHODES DE DÉTECTION
  // ================================

  /**
   * Détection par extension de fichier
   */
  private async detectByExtension(file: File): Promise<Partial<DetectionResult>> {
    const extension = this.getFileExtension(file.name);
    if (!extension) {
      return { format: null, confidence: 0, reasons: ['No file extension'] };
    }
    
    const plugins = this.registry.getPluginsByExtension(extension);
    if (plugins.length === 0) {
      return { 
        format: null, 
        confidence: 0, 
        reasons: [`Unsupported extension: ${extension}`] 
      };
    }
    
    if (plugins.length === 1) {
      return {
        format: plugins[0].id,
        confidence: 0.9,
        reasons: [`Unique match for extension ${extension}`]
      };
    }
    
    // Plusieurs plugins supportent cette extension
    // Retourner le plus prioritaire (pour l'instant, le premier)
    return {
      format: plugins[0].id,
      confidence: 0.6,
      reasons: [`Best match for extension ${extension} (${plugins.length} candidates)`]
    };
  }

  /**
   * Détection par signature de fichier (magic bytes)
   */
  private async detectBySignature(file: File): Promise<Partial<DetectionResult>> {
    try {
      // Lire les premiers bytes du fichier
      const headerSize = Math.min(file.size, 512); // 512 premiers bytes
      const header = await this.readFileHeader(file, headerSize);
      
      for (const [signature, info] of this.signatures) {
        if (this.matchesSignature(header, signature)) {
          return {
            format: info.format,
            confidence: info.confidence,
            reasons: [`Matched signature: ${signature}`]
          };
        }
      }
      
      return { format: null, confidence: 0, reasons: ['No signature match'] };
      
    } catch (error) {
      return { 
        format: null, 
        confidence: 0, 
        reasons: [`Signature detection error: ${error}`] 
      };
    }
  }

  /**
   * Détection par analyse du contenu
   */
  private async detectByContent(file: File): Promise<Partial<DetectionResult>> {
    try {
      // Analyser seulement une partie du fichier pour les performances
      const analysisSize = Math.min(file.size, this.config.maxAnalysisSize);
      const content = await this.readFileContent(file, analysisSize);
      
      // Exécuter les règles de détection
      for (const rule of this.rules) {
        const result = await rule.test(file, content);
        if (result.matches) {
          return {
            format: this.extractFormatFromRuleName(rule.name),
            confidence: result.confidence,
            reasons: [result.reason]
          };
        }
      }
      
      return { format: null, confidence: 0, reasons: ['No content pattern match'] };
      
    } catch (error) {
      return { 
        format: null, 
        confidence: 0, 
        reasons: [`Content analysis error: ${error}`] 
      };
    }
  }

  /**
   * Validation par plugins
   */
  private async validateWithPlugins(
    file: File, 
    candidates: SupportedFormat[]
  ): Promise<Map<SupportedFormat, number>> {
    const results = new Map<SupportedFormat, number>();
    const fileData = await file.arrayBuffer();
    
    for (const format of candidates) {
      const plugin = this.registry.getPlugin(format);
      if (!plugin) continue;
      
      try {
        const validation = await plugin.validateFile(fileData);
        if (validation.isValid) {
          // Confidence basée sur la qualité de la validation
          const confidence = validation.confidence || 0.8;
          results.set(format, confidence);
        }
      } catch (error) {
        console.warn(`Plugin validation failed for ${format}:`, error);
      }
    }
    
    return results;
  }

  // ================================
  // INITIALISATION
  // ================================

  /**
   * Initialise les règles de détection built-in
   */
  private initializeBuiltInRules(): void {
    // Règle DSTV
    this.addDetectionRule({
      name: 'dstv',
      priority: 100,
      async test(file, content) {
        const text = new TextDecoder().decode(content);
        
        // Rechercher les marqueurs DSTV typiques
        const hasSTBlock = text.includes('ST\n') || text.includes('ST\r\n');
        const hasENBlock = text.includes('EN\n') || text.includes('EN\r\n');
        const hasDSTVPattern = /^\s*\w{2}\s*$/m.test(text); // Blocs à 2 lettres
        
        if (hasSTBlock && hasENBlock) {
          return {
            matches: true,
            confidence: 0.95,
            reason: 'Contains ST and EN blocks (DSTV structure)'
          };
        }
        
        if (hasSTBlock || hasDSTVPattern) {
          return {
            matches: true,
            confidence: 0.7,
            reason: 'Contains DSTV-like patterns'
          };
        }
        
        return {
          matches: false,
          confidence: 0,
          reason: 'No DSTV patterns found'
        };
      }
    });
    
    // Règle IFC
    this.addDetectionRule({
      name: 'ifc',
      priority: 90,
      async test(file, content) {
        const text = new TextDecoder().decode(content);
        
        const hasIFCHeader = text.startsWith('ISO-10303-21');
        const hasIFCEntities = text.includes('IFCPROJECT') || text.includes('#') && text.includes('=');
        
        if (hasIFCHeader) {
          return {
            matches: true,
            confidence: 0.98,
            reason: 'Contains ISO-10303-21 header (IFC)'
          };
        }
        
        if (hasIFCEntities) {
          return {
            matches: true,
            confidence: 0.8,
            reason: 'Contains IFC entities'
          };
        }
        
        return {
          matches: false,
          confidence: 0,
          reason: 'No IFC patterns found'
        };
      }
    });
    
    // Règle DXF
    this.addDetectionRule({
      name: 'dxf',
      priority: 85,
      async test(file, content) {
        const text = new TextDecoder().decode(content);
        
        const hasDXFHeader = text.includes('0\nSECTION') || text.includes('0\r\nSECTION');
        const hasDXFEntities = text.includes('ENTITIES') || text.includes('HEADER');
        
        if (hasDXFHeader && hasDXFEntities) {
          return {
            matches: true,
            confidence: 0.95,
            reason: 'Contains DXF section structure'
          };
        }
        
        return {
          matches: false,
          confidence: 0,
          reason: 'No DXF patterns found'
        };
      }
    });
  }

  /**
   * Initialise les signatures de fichiers
   */
  private initializeSignatures(): void {
    // Signatures binaires communes
    this.signatures.set('504B0304', { format: 'step', confidence: 0.7 }); // ZIP header (STEP peut être zippé)
    this.signatures.set('377ABCAF271C', { format: 'obj', confidence: 0.3 }); // 7z header
    
    // Pour les formats texte, on se base plutôt sur l'analyse de contenu
  }

  // ================================
  // UTILITAIRES
  // ================================

  /**
   * Lit l'en-tête d'un fichier
   */
  private async readFileHeader(file: File, size: number): Promise<ArrayBuffer> {
    const blob = file.slice(0, size);
    return blob.arrayBuffer();
  }

  /**
   * Lit le contenu d'un fichier (limité)
   */
  private async readFileContent(file: File, maxSize: number): Promise<ArrayBuffer> {
    const size = Math.min(file.size, maxSize);
    const blob = file.slice(0, size);
    return blob.arrayBuffer();
  }

  /**
   * Extrait l'extension d'un fichier
   */
  private getFileExtension(filename: string): string | null {
    const match = filename.match(/\.([^.]+)$/);
    return match ? `.${match[1].toLowerCase()}` : null;
  }

  /**
   * Vérifie si des bytes correspondent à une signature
   */
  private matchesSignature(data: ArrayBuffer, signature: string): boolean {
    const bytes = new Uint8Array(data);
    const sigBytes = this.hexStringToBytes(signature);
    
    if (bytes.length < sigBytes.length) return false;
    
    for (let i = 0; i < sigBytes.length; i++) {
      if (bytes[i] !== sigBytes[i]) return false;
    }
    
    return true;
  }

  /**
   * Convertit une chaîne hex en bytes
   */
  private hexStringToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  /**
   * Extrait le format depuis le nom de règle
   */
  private extractFormatFromRuleName(ruleName: string): SupportedFormat | null {
    // Convention: le nom de la règle correspond au format
    return ruleName as SupportedFormat;
  }

  /**
   * Debug info
   */
  getDebugInfo(): any {
    return {
      config: this.config,
      rulesCount: this.rules.length,
      signaturesCount: this.signatures.size,
      rules: this.rules.map(r => ({ name: r.name, priority: r.priority })),
      signatures: Array.from(this.signatures.entries())
    };
  }
}