/**
 * FeatureApplicator - Applique les features stockées dans les metadata aux géométries
 */
import * as THREE from 'three';
import { PivotElement } from '@/types/viewer';
import { Feature, ProfileFace, FeatureType } from '../core/features/types';
import { HoleProcessor } from '../core/features/processors/HoleProcessor';
import { ChamferProcessor } from '../core/features/processors/ChamferProcessor';
import { WeldProcessor } from '../core/features/processors/WeldProcessor';
import { MarkingProcessor } from '../core/features/processors/MarkingProcessor';
import { CutProcessor } from '../core/features/processors/CutProcessor';

export class FeatureApplicator {
  private holeProcessor: HoleProcessor;
  private chamferProcessor: ChamferProcessor;
  private weldProcessor: WeldProcessor;
  private markingProcessor: MarkingProcessor;
  private cutProcessor: CutProcessor;
  
  constructor() {
    this.holeProcessor = new HoleProcessor();
    this.chamferProcessor = new ChamferProcessor();
    this.weldProcessor = new WeldProcessor();
    this.markingProcessor = new MarkingProcessor();
    this.cutProcessor = new CutProcessor();
  }
  
  /**
   * Applique toutes les features d'un élément à sa géométrie
   */
  applyFeatures(geometry: THREE.BufferGeometry, element: PivotElement): THREE.BufferGeometry {
    let resultGeometry = geometry;
    
    // Préserver les userData importantes
    const preservedUserData = {
      useDirectCoordinates: geometry.userData.useDirectCoordinates,
      centerOffset: geometry.userData.centerOffset,
      isMirrored: geometry.userData.isMirrored,
      type: geometry.userData.type
    };
    
    // Si l'élément a des features dans ses metadata
    if (element.metadata?.features && Array.isArray(element.metadata.features)) {
      console.log(`🔧 Applying ${element.metadata.features.length} features to element ${element.id}`);
      console.log('Features:', element.metadata.features);
      
      // Trier les features pour appliquer les découpes dans le bon ordre
      // 1. Trous (holes) en premier
      // 2. Découpes des ailes (cuts sur face v/u) 
      // 3. Découpes de l'âme (cuts sur face o/web) en dernier car elles peuvent enlever toute l'extrémité
      const sortedFeatures = [...element.metadata.features].sort((a, b) => {
        const getPriority = (f: any) => {
          if (f.type === 'hole') return 0;
          if (f.type === 'marking') return 3;
          if ((f.type === 'cut' || f.type === 'notch') && (f.face === 'v' || f.face === 'u')) return 1;
          if ((f.type === 'cut' || f.type === 'notch') && (f.face === 'o' || f.face === 'web')) return 2;
          return 4;
        };
        return getPriority(a) - getPriority(b);
      });
      
      console.log('🔄 Sorted features for optimal application order');
      
      for (const featureData of sortedFeatures) {
        // Convertir les données de feature depuis metadata vers le format Feature
        const feature = this.convertMetadataToFeature(featureData);
        
        if (feature) {
          console.log(`🔩 Processing feature:`, feature);
          const result = this.processFeature(resultGeometry, feature, element);
          if (result.success && result.geometry) {
            console.log(`✅ Feature applied successfully`);
            // Remplacer la géométrie par le résultat
            if (resultGeometry !== geometry) {
              resultGeometry.dispose();
            }
            resultGeometry = result.geometry;
          } else {
            console.error(`❌ Failed to apply feature:`, result.error);
          }
        } else if (featureData.type !== 'marking') {
          // Ne pas afficher d'avertissement pour les markings (ils sont loggés séparément)
          console.warn(`⚠️ Could not convert feature data:`, featureData);
        }
      }
    } else {
      console.log(`ℹ️ No features to apply for element ${element.id}`);
    }
    
    // Restaurer les userData préservées
    Object.assign(resultGeometry.userData, preservedUserData);
    
    return resultGeometry;
  }
  
  /**
   * Convertit les données de feature depuis metadata vers le format Feature standard
   */
  private convertMetadataToFeature(featureData: any): Feature | null {
    if (!featureData || !featureData.type) return null;
    
    const feature: Feature = {
      id: featureData.id || `feature-${Date.now()}`,
      type: featureData.type,
      position: featureData.position || [0, 0, 0],
      rotation: featureData.rotation || [0, 0, 0],
      coordinateSystem: featureData.coordinateSystem || 'local',
      parameters: {}
    };
    
    // Convertir la face DSTV vers ProfileFace ou conserver le code DSTV
    if (featureData.face) {
      // Pour les découpes ET les trous, conserver les codes DSTV originaux ('v', 'u', 'o')
      // car les processors les gèrent directement
      if (featureData.type === 'cut' || featureData.type === 'notch' || featureData.type === 'cutout' || 
          featureData.type === 'hole') {
        feature.face = featureData.face; // Garder 'v', 'u', 'o' tels quels
      } else {
        // Pour les autres features, convertir vers ProfileFace
        switch(featureData.face) {
          case 'v':
            feature.face = ProfileFace.TOP;
            break;
          case 'u':
            feature.face = ProfileFace.BOTTOM;
            break;
          case 'o':
          case 'web':
            feature.face = ProfileFace.WEB;
            break;
          default:
            feature.face = featureData.face;
        }
      }
    }
    
    // Paramètres spécifiques selon le type
    switch (featureData.type) {
      case 'hole': {
        // Récupérer le diamètre depuis parameters ou directement
        feature.parameters.diameter = featureData.parameters?.diameter || featureData.diameter || 10;
        // Si depth=0 dans DSTV, c'est un trou traversant, on utilise une grande profondeur
        const holeDepth = featureData.parameters?.depth ?? featureData.depth ?? 0;
        feature.parameters.depth = holeDepth > 0 ? holeDepth : 100;
        // Type de trou et paramètres spécifiques
        feature.parameters.holeType = featureData.parameters?.holeType || featureData.holeType || 'round';
        // La face est déjà définie sur l'objet Feature
        if (feature.parameters.holeType === 'slotted') {
          feature.parameters.slottedLength = featureData.parameters?.slottedLength || featureData.slottedLength || 0;
          feature.parameters.slottedAngle = featureData.parameters?.slottedAngle || featureData.slottedAngle || 0;
        } else if (feature.parameters.holeType === 'rectangular') {
          feature.parameters.width = featureData.parameters?.width || featureData.width || feature.parameters.diameter;
          feature.parameters.height = featureData.parameters?.height || featureData.height || feature.parameters.diameter;
        }
        break;
      }
        
      case 'chamfer':
        feature.parameters.size = featureData.size || 5;
        feature.parameters.angle = featureData.angle || 45;
        break;
        
      case 'weld':
        feature.parameters.weldType = featureData.weldType || 'fillet';
        feature.parameters.size = featureData.size || 5;
        break;
        
      case 'marking':
        // Les marquages sont des inscriptions/textes sur la surface
        feature.parameters.text = featureData.metadata?.markingText || featureData.text || '';
        feature.parameters.size = featureData.size || 10;
        console.log(`🔤 Converting marking feature: text="${feature.parameters.text}", size=${feature.parameters.size}`);
        break;
        
      case 'cut':
      case 'notch':
        // Paramètres pour les découpes
        feature.parameters.points = featureData.contourPoints || [];
        feature.parameters.depth = featureData.depth || 10;
        feature.parameters.isTransverse = featureData.isTransverse || false;
        // La face a déjà été définie plus haut (gardée telle quelle pour les cuts)
        console.log(`✂️ Converting cut feature: ${feature.parameters.points?.length || 0} points on face ${feature.face}`);
        if ((feature.face as string) === 'v' || (feature.face as string) === 'u') {
          console.log(`    Contour points for ${feature.face}:`, feature.parameters.points);
        }
        break;
        
      default:
        // Type non supporté
        return null;
    }
    
    return feature;
  }
  
  /**
   * Traite une feature individuelle
   */
  private processFeature(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): { success: boolean; geometry?: THREE.BufferGeometry; error?: string } {
    try {
      switch (feature.type) {
        case 'hole':
          return this.holeProcessor.process(geometry, feature, element);
          
        case 'chamfer':
          return this.chamferProcessor.process(geometry, feature, element);
          
        case 'weld':
          return this.weldProcessor.process(geometry, feature, element);
          
        case 'marking':
          return this.markingProcessor.process(geometry, feature, element);
          
        case FeatureType.CUT:
        case 'cut':
        case FeatureType.CUTOUT:
        case FeatureType.NOTCH:
          return this.cutProcessor.process(geometry, feature, element);
          
        default:
          return {
            success: false,
            error: `Unsupported feature type: ${feature.type}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Error processing feature: ${error}`
      };
    }
  }
  
  /**
   * Convertit une face DSTV en ProfileFace
   */
  private convertDSTVFace(dstvFace: string): ProfileFace | undefined {
    switch(dstvFace) {
      case 'v':
        return ProfileFace.TOP;
      case 'u':
        return ProfileFace.BOTTOM;
      case 'o':
        return ProfileFace.WEB;
      default:
        return undefined;
    }
  }

  /**
   * Nettoie les ressources
   */
  dispose(): void {
    // Les processeurs n'ont pas de ressources à nettoyer pour l'instant
  }
}