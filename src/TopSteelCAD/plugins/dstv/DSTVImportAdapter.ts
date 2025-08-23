/**
 * Adaptateur pour connecter le nouveau système DSTV au FileImporter existant
 * 
 * Ce module fait le pont entre le nouveau pipeline DSTV modulaire
 * et le système d'import existant de TopSteelCAD.
 */

import { PivotElement, MaterialType } from '@/types/viewer';
import { ImportResult } from '../../utils/FileImporter';
// import { FormatEngine } from '../../core/engine/FormatEngine';
import { DSTVPlugin } from './DSTVPlugin';
import * as THREE from 'three';

// Définition simplifiée du FormatEngine pour éviter les dépendances circulaires
class FormatEngine {
  private plugins: Map<string, any> = new Map();
  
  async registerPlugin(plugin: any): Promise<void> {
    this.plugins.set('dstv', plugin);
  }
  
  async import(file: File, options?: any): Promise<any> {
    const plugin = this.plugins.get('dstv');
    if (!plugin) {
      throw new Error('DSTV plugin not registered');
    }
    
    // Lire le contenu du fichier comme ArrayBuffer
    const buffer = await this.readFileAsArrayBuffer(file);
    
    // Utiliser le pipeline d'import du plugin
    const pipeline = plugin.createImportPipeline();
    const result = await pipeline.execute(buffer);
    
    return {
      success: true,
      data: result,
      warnings: [],
      errors: []
    };
  }
  
  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
}

/**
 * Adaptateur singleton pour l'import DSTV
 */
export class DSTVImportAdapter {
  private static instance: DSTVImportAdapter;
  private engine: FormatEngine;
  private plugin: DSTVPlugin;
  private isInitialized = false;

  private constructor() {
    this.engine = new FormatEngine();
    this.plugin = new DSTVPlugin();
  }

  /**
   * Obtient l'instance unique de l'adaptateur
   */
  static getInstance(): DSTVImportAdapter {
    if (!DSTVImportAdapter.instance) {
      DSTVImportAdapter.instance = new DSTVImportAdapter();
    }
    return DSTVImportAdapter.instance;
  }

  /**
   * Initialise l'adaptateur
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Enregistrer le plugin DSTV dans le moteur
    await this.engine.registerPlugin(this.plugin);
    this.isInitialized = true;
  }

  /**
   * Importe un fichier DSTV en utilisant le nouveau système
   */
  async importDSTVFile(file: File): Promise<ImportResult> {
    try {
      // S'assurer que le système est initialisé
      await this.initialize();

      // Utiliser le nouveau pipeline pour importer
      const engineResult = await this.engine.import(file, {
        format: 'dstv',
        validation: {
          strict: false,
          standard: 'DSTV_7th_Edition'
        }
      });

      // Convertir le résultat du nouveau système vers le format attendu par FileImporter
      if (engineResult.success && engineResult.data) {
        const elements = this.convertToPivotElements(engineResult.data);
        
        return {
          success: true,
          elements,
          warnings: engineResult.warnings,
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            format: 'dstv',
            elementsCount: elements.length,
            importDate: new Date()
          }
        };
      } else {
        return {
          success: false,
          error: engineResult.errors?.join('; ') || 'Erreur inconnue lors de l\'import DSTV',
          warnings: engineResult.warnings
        };
      }
    } catch (error) {
      console.error('Erreur dans DSTVImportAdapter:', error);
      return {
        success: false,
        error: `Erreur lors de l'import DSTV: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }

  /**
   * Convertit les données du nouveau système vers PivotElement[]
   */
  private convertToPivotElements(data: any): PivotElement[] {
    const elements: PivotElement[] = [];
    
    // Si on a une scène Three.js, extraire les éléments
    if (data.scene && data.scene instanceof THREE.Scene) {
      data.scene.traverse((child: any) => {
        if (child instanceof THREE.Mesh && child.userData?.pivotElement) {
          elements.push(child.userData.pivotElement);
        }
      });
    }

    // Si on a directement des profils et features
    if (data.profiles && Array.isArray(data.profiles)) {
      data.profiles.forEach((profile: any, index: number) => {
        const element: PivotElement = {
          id: profile.id || `dstv-element-${Date.now()}-${index}`,
          name: profile.name || `Profile ${index + 1}`,
          materialType: this.mapProfileTypeToMaterialType(profile.type),
          dimensions: {
            length: profile.dimensions?.length || 1000,
            width: profile.dimensions?.crossSection?.width || 100,
            height: profile.dimensions?.crossSection?.height || 200,
            thickness: profile.dimensions?.crossSection?.webThickness || 10
          },
          position: profile.position || [0, 0, 0],
          rotation: profile.rotation || [0, 0, 0],
          material: {
            grade: profile.material?.grade || 'S355', // Utiliser 'grade' au lieu de 'name'
            density: profile.material?.properties?.density || 7850,
            elasticModulus: profile.material?.properties?.elasticModulus || 210000
          } as any,
          // features: this.convertFeatures(data.features, profile.id), // TODO: Add features to PivotElement interface
          metadata: {
            ...profile.metadata,
            originalFormat: 'DSTV',
            profileType: profile.type,
            profileName: profile.name
          },
          sourceFormat: 'dstv' as const,
          scale: [1, 1, 1] as [number, number, number],
          visible: true,
          createdAt: new Date()
        };
        
        elements.push(element);
      });
    }

    // Si aucun élément n'a été trouvé mais qu'on a des données
    if (elements.length === 0 && data.elements) {
      // Fallback : utiliser directement les éléments s'ils existent
      const rawElements = Array.isArray(data.elements) ? data.elements : Array.from(data.elements.values());
      
      // Convertir le format des éléments pour s'assurer qu'ils ont le bon format
      return rawElements.map((el: any) => ({
        ...el,
        position: el.transform?.position ? 
          [el.transform.position.x || 0, el.transform.position.y || 0, el.transform.position.z || 0] : 
          [0, 0, 0],
        rotation: el.transform?.rotation ? 
          [el.transform.rotation.x || 0, el.transform.rotation.y || 0, el.transform.rotation.z || 0] : 
          [0, 0, 0],
        scale: el.transform?.scale ? 
          [el.transform.scale.x || 1, el.transform.scale.y || 1, el.transform.scale.z || 1] : 
          [1, 1, 1],
        materialType: el.materialType || this.mapProfileTypeToMaterialType(el.type)
      }));
    }

    return elements;
  }

  /**
   * Convertit les features du nouveau format vers l'ancien
   */
  private convertFeatures(features: any[], profileId?: string): any[] {
    if (!features || !Array.isArray(features)) return [];

    return features
      .filter(f => !profileId || f.profileId === profileId || !f.profileId)
      .map(feature => ({
        type: feature.type,
        id: feature.id,
        position: feature.coordinates ? 
          [feature.coordinates.x, feature.coordinates.y, feature.coordinates.z || 0] : 
          [0, 0, 0],
        parameters: feature.parameters || {},
        metadata: feature.metadata || {}
      }));
  }

  /**
   * Mappe un type de profil vers MaterialType
   */
  private mapProfileTypeToMaterialType(profileType?: string): MaterialType {
    if (!profileType) return MaterialType.BEAM;

    const mapping: Record<string, MaterialType> = {
      'I_PROFILE': MaterialType.BEAM,
      'HEA': MaterialType.BEAM,
      'HEB': MaterialType.BEAM,
      'HEM': MaterialType.BEAM,
      'IPE': MaterialType.BEAM,
      'IPN': MaterialType.BEAM,
      'U_PROFILE': MaterialType.CHANNEL,
      'UPN': MaterialType.CHANNEL,
      'UPE': MaterialType.CHANNEL,
      'L_PROFILE': MaterialType.ANGLE,
      'T_PROFILE': MaterialType.TEE,
      'TUBE_RECT': MaterialType.TUBE,
      'TUBE_ROUND': MaterialType.TUBE,
      'PLATE': MaterialType.PLATE,
      // Les types suivants peuvent ne pas exister dans l'enum, on utilise des fallbacks
      'FLAT_BAR': MaterialType.PLATE, // Fallback vers PLATE
      'Z_PROFILE': MaterialType.BEAM,  // Fallback vers BEAM
      'C_PROFILE': MaterialType.CHANNEL // Fallback vers CHANNEL
    };

    return mapping[profileType] || MaterialType.BEAM;
  }

  /**
   * Méthode statique pour faciliter l'utilisation
   */
  static async importFile(file: File): Promise<ImportResult> {
    const adapter = DSTVImportAdapter.getInstance();
    return adapter.importDSTVFile(file);
  }

  /**
   * Réinitialise l'adaptateur (utile pour les tests)
   */
  reset(): void {
    this.isInitialized = false;
    this.engine = new FormatEngine();
    this.plugin = new DSTVPlugin();
  }
}