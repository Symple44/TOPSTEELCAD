/**
 * CutProcessorMigrated.ts - Version migrée du CutProcessor utilisant la nouvelle architecture
 * Remplace progressivement l'ancien CutProcessor monolithique
 */

import * as THREE from 'three';
import { Feature, FeatureType, IFeatureProcessor, ProcessorResult } from '../types';
import { PivotElement } from '@/types/viewer';
import { getCutProcessorAdapter, AdapterMode } from './cut/adapters/CutProcessorAdapter';
import { LogLevel } from './cut/index';
import { getCutHandlerFactory } from './cut/core/CutHandlerFactory';
import { CutTypeDetector } from './cut/core/CutTypeDetector';
import { Evaluator, Brush, SUBTRACTION } from 'three-bvh-csg';

/**
 * Nouveau CutProcessor utilisant l'architecture modulaire
 */
export class CutProcessorMigrated implements IFeatureProcessor {
  private adapter: ReturnType<typeof getCutProcessorAdapter>;
  private mode: AdapterMode;
  private handlerFactory: ReturnType<typeof getCutHandlerFactory>;
  private typeDetector: CutTypeDetector;
  
  constructor(mode: AdapterMode = AdapterMode.NEW_ONLY) {
    this.mode = mode;
    this.adapter = getCutProcessorAdapter({
      mode: this.mode,
      // fallbackToLegacy: false, // Pas de fallback - nouveau système uniquement
      enableLogging: true, // Activé temporairement pour debug
      logLevel: LogLevel.INFO
    });
    
    // Initialiser le factory dans le constructeur
    this.handlerFactory = getCutHandlerFactory();
    this.typeDetector = CutTypeDetector.getInstance();
    
    console.log('🚀 CutProcessorMigrated initialized in mode:', mode);
  }
  
  /**
   * Valide une feature de coupe
   */
  validateFeature(feature: Feature, element: PivotElement): string[] {
    const errors: string[] = [];
    const params = feature.parameters as any;
    
    // Validation basique
    if (!feature.id) {
      errors.push('Feature must have an ID');
    }
    
    if (!feature.type) {
      errors.push('Feature must have a type');
    }
    
    // Validation spécifique aux coupes
    if (feature.type === FeatureType.CUT || feature.type === FeatureType.NOTCH) {
      // Les points ou dimensions doivent être présents
      if (!params.points && !params.width && !params.height && !params.contour) {
        errors.push('Cut feature must have geometry information (points, dimensions, or contour)');
      }
      
      // Validation de la profondeur
      if (params.depth !== undefined && params.depth < 0) {
        errors.push('Cut depth cannot be negative');
      }
      
      // Validation des angles
      if (params.angle !== undefined) {
        if (params.angle < -180 || params.angle > 180) {
          errors.push('Cut angle must be between -180 and 180 degrees');
        }
      }
    }
    
    return errors;
  }
  
  /**
   * Traite une feature de coupe
   */
  process(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult {
    const DEBUG_CUTS = true;  // Activer uniquement pour debug
    
    if (DEBUG_CUTS) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🔪 CUT PROCESSOR - Feature: ${feature.id}`);
      console.log(`${'='.repeat(80)}`);
      console.log(`📋 Input:`, {
        featureType: feature.type,
        cutType: feature.parameters?.cutType,
        pointsCount: feature.parameters?.points?.length || 0,
        face: feature.parameters?.face || feature.face,
        geometryVertices: geometry.attributes.position?.count || 0,
        profileDimensions: element.dimensions
      });
    }
    
    // DÉTECTION M1002: Vérifier si c'est le pattern de notches partielles
    const isM1002Pattern = this.isPartialNotchPattern(feature, element);
    if (isM1002Pattern && DEBUG_CUTS) {
      console.log(`🎯 M1002 PATTERN DETECTED - partial notches with extension`);
      // Forcer le type pour que les handlers le reconnaissent
      if (feature.parameters) {
        feature.parameters.cutType = 'partial_notches';
        console.log(`   ➤ Set cutType to: ${feature.parameters.cutType}`);
      }
    }
    
    // Validation préliminaire
    const validationErrors = this.validateFeature(feature, element);
    if (validationErrors.length > 0) {
      console.error('❌ Validation failed:', validationErrors);
      return {
        success: false,
        error: `Validation failed: ${validationErrors.join(', ')}`
      };
    }
    
    // Utiliser l'adapter pour traiter la feature (sync)
    // Note: adapter.process est async, mais on doit retourner sync pour IFeatureProcessor
    // Utilisation d'une approche synchrone temporaire
    let result: any = { success: false, error: 'Not processed' };
    
    try {
      // Utiliser le factory initialisé
      const handler = this.handlerFactory.findBestHandler(feature);
      
      if (handler) {
        // Détecter le type de coupe
        const cutType = this.typeDetector.detect(feature, element);
        
        const context = {
          feature,
          element,
          baseGeometry: geometry,
          cutType,
          options: {}
        };
        
        if (DEBUG_CUTS) {
          console.log(`🔧 Handler selected: ${handler.name}`);
          console.log(`🔍 Cut type detected: ${cutType}`);
        }
        
        const processResult = handler.process(context);
        
        if (DEBUG_CUTS) {
          console.log(`📊 Handler result:`, {
            success: processResult.success,
            hasGeometry: !!processResult.geometry,
            error: processResult.error,
            cutVertices: processResult.geometry?.attributes?.position?.count || 0
          });
        }
        result = processResult;
      } else if (DEBUG_CUTS) {
        console.log(`❌ No handler found for feature type: ${feature.type}`);
      }
    } catch (error) {
      result = {
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed'
      };
    }
    
    // Adapter le résultat au format ProcessorResult
    if (result.success) {
      // Appliquer la coupe à la géométrie originale si nécessaire
      if (result.geometry && this.shouldApplyCut(feature)) {
        if (DEBUG_CUTS) {
          console.log(`🔧 APPLYING CSG OPERATION`);
          console.log(`📊 Base geometry: ${geometry.attributes.position?.count || 0} vertices`);
          console.log(`📊 Cut geometry: ${result.geometry.attributes.position?.count || 0} vertices`);
        }
        
        try {
          // Effectuer l'opération CSG
          const modifiedGeometry = this.applyCSGOperation(
            geometry,
            result.geometry,
            feature,
            element
          );
          
          if (DEBUG_CUTS) {
            console.log(`✅ CSG operation completed`);
            console.log(`📊 Final geometry: ${modifiedGeometry.attributes.position?.count || 0} vertices`);
            const vertexChange = (modifiedGeometry.attributes.position?.count || 0) - (geometry.attributes.position?.count || 0);
            console.log(`📊 Vertex change: ${vertexChange} (${vertexChange > 0 ? '+' : ''}${vertexChange})`);
          }
          
          return {
            success: true,
            geometry: modifiedGeometry,
            // metadata: {
            //   ...result.metadata,
              // originalGeometry: geometry,
              // cutApplied: true
            // }
          };
        } catch (error) {
          if (DEBUG_CUTS) {
            console.error(`❌ CSG OPERATION FAILED:`, error);
          }
          // En cas d'échec CSG, retourner la géométrie originale
          return {
            success: false,
            geometry: geometry,
            error: `CSG operation failed: ${error}`
          };
        }
      } else if (DEBUG_CUTS) {
        console.log(`⏭️ Skipping CSG - shouldApplyCut=${this.shouldApplyCut(feature)}, hasGeometry=${!!result.geometry}`);
      }
      
      // Si pas d'opération CSG nécessaire
      const finalResult = {
        success: true,
        geometry: result.geometry || geometry
      };
      
      if (DEBUG_CUTS) {
        console.log(`✅ CUT PROCESSING SUCCESS (no CSG applied)`);
        console.log(`${'='.repeat(80)}\n`);
      }
      
      return finalResult;
    } else {
      const errorResult = {
        success: false,
        error: result.error || 'Processing failed',
        geometry: geometry // Retourner la géométrie originale en cas d'échec
      };
      
      if (DEBUG_CUTS) {
        console.log(`❌ CUT PROCESSING FAILED: ${result.error}`);
        console.log(`${'='.repeat(80)}\n`);
      }
      
      return errorResult;
    }
  }
  
  /**
   * Détermine si la coupe doit être appliquée via CSG
   */
  private shouldApplyCut(feature: Feature): boolean {
    const params = feature.parameters as any;
    
    // Ne pas appliquer CSG pour les marquages ou features non-soustractives
    if (feature.type === FeatureType.MARKING) {
      console.log('🚫 Skipping CSG for marking feature');
      return false;
    }
    
    // Ne pas appliquer si explicitement désactivé
    if (params.skipCSG || params.noSubtraction) {
      console.log('🚫 CSG explicitly disabled for feature');
      return false;
    }
    
    // Appliquer pour les coupes et encoches
    const shouldApply = feature.type === FeatureType.CUT || 
           feature.type === FeatureType.NOTCH ||
           feature.type === FeatureType.CUTOUT ||
           feature.type === FeatureType.END_CUT;
           
    console.log(`🔍 Should apply CSG for ${feature.type}: ${shouldApply}`);
    return shouldApply;
  }
  
  /**
   * Applique l'opération CSG
   */
  private applyCSGOperation(
    baseGeometry: THREE.BufferGeometry,
    cutGeometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): THREE.BufferGeometry {
    // Réactivé avec une géométrie de coupe corrigée
    const ENABLE_CSG = true;
    const DEBUG_CUTS = true;
    
    try {
      // Si CSG est désactivé, retourner la géométrie de base sans modification
      if (!ENABLE_CSG) {
        if (DEBUG_CUTS) console.log(`⚠️ CSG DISABLED for feature ${feature.id}`);
        return baseGeometry;
      }
      
      if (DEBUG_CUTS) {
        console.log(`\n🔧 CSG OPERATION START`);
        console.log(`   Feature: ${feature.id}, Type: ${feature.type}`);
      }
      
      // Utiliser three-bvh-csg pour l'opération booléenne (imported at top)
      
      // Validation des géométries
      if (!this.validateGeometry(baseGeometry, 'base')) {
        if (DEBUG_CUTS) console.error(`❌ Invalid base geometry`);
        throw new Error('Invalid base geometry for CSG operation');
      }
      if (!this.validateGeometry(cutGeometry, 'cut')) {
        if (DEBUG_CUTS) console.error(`❌ Invalid cut geometry`);
        throw new Error('Invalid cut geometry for CSG operation');
      }
      
      const evaluator = new Evaluator();
      evaluator.useGroups = false;
      evaluator.attributes = ['position', 'normal', 'uv'];
      
      if (DEBUG_CUTS) {
        // Diagnostiquer les géométries avant CSG
        console.log(`📋 Geometry Diagnostics:`);
        console.log(`   Base: ${baseGeometry.attributes.position.count} vertices, normals=${!!baseGeometry.attributes.normal}`);
        console.log(`   Cut: ${cutGeometry.attributes.position.count} vertices, normals=${!!cutGeometry.attributes.normal}`);
        
        // Calculer les bounding boxes
        if (!baseGeometry.boundingBox) baseGeometry.computeBoundingBox();
        if (!cutGeometry.boundingBox) cutGeometry.computeBoundingBox();
        
        if (baseGeometry.boundingBox && cutGeometry.boundingBox) {
          console.log(`   Base bounds: ${baseGeometry.boundingBox.min.x.toFixed(1)},${baseGeometry.boundingBox.min.y.toFixed(1)},${baseGeometry.boundingBox.min.z.toFixed(1)} → ${baseGeometry.boundingBox.max.x.toFixed(1)},${baseGeometry.boundingBox.max.y.toFixed(1)},${baseGeometry.boundingBox.max.z.toFixed(1)}`);
          console.log(`   Cut bounds: ${cutGeometry.boundingBox.min.x.toFixed(1)},${cutGeometry.boundingBox.min.y.toFixed(1)},${cutGeometry.boundingBox.min.z.toFixed(1)} → ${cutGeometry.boundingBox.max.x.toFixed(1)},${cutGeometry.boundingBox.max.y.toFixed(1)},${cutGeometry.boundingBox.max.z.toFixed(1)}`);
        }
      }
      
      // Récupérer les paramètres avant l'opération CSG (pour le cas où il y a une erreur)
      const params = feature.parameters as any;
      
      // Créer des brushes (pas des meshes) - CORRECTION PRINCIPALE
      if (DEBUG_CUTS) console.log(`⚙️ Creating Brush objects...`);
      const baseBrush = new Brush(baseGeometry);
      baseBrush.updateMatrixWorld();
      
      const cutBrush = new Brush(cutGeometry);
      cutBrush.updateMatrixWorld();
      
      if (DEBUG_CUTS) console.log(`⚙️ Performing CSG subtraction...`);
      // Effectuer la soustraction
      const resultBrush = evaluator.evaluate(baseBrush, cutBrush, SUBTRACTION);
      const resultGeometry = resultBrush.geometry.clone();
      
      const resultVertices = resultGeometry.attributes.position.count;
      const baseVertices = baseGeometry.attributes.position.count;
      const verticesDiff = resultVertices - baseVertices;
      
      if (DEBUG_CUTS) {
        console.log(`📊 CSG Result Analysis:`);
        console.log(`   Result vertices: ${resultVertices}`);
        console.log(`   Original vertices: ${baseVertices}`);
        console.log(`   Difference: ${verticesDiff} (${verticesDiff > 0 ? '+' : ''}${((verticesDiff / baseVertices) * 100).toFixed(1)}%)`);
      }
      
      // L'analyse détaillée est déjà faite dans le bloc DEBUG_CUTS ci-dessus
      
      // VALIDATION CRITIQUE: Vérifier que CSG n'a pas supprimé toute la géométrie
      if (resultVertices === 0) {
        console.error(`❌ CRITICAL CSG ERROR: Result geometry has 0 vertices!`);
        console.error(`❌ This means the cut geometry completely consumed the base geometry`);
        console.error(`❌ Base vertices: ${baseVertices}, Cut vertices: ${cutGeometry.attributes.position.count}`);
        console.error(`❌ Feature: ${feature.id}, Type: ${feature.type}`);
        console.error(`❌ Returning original geometry to prevent piece disappearance`);
        
        // Nettoyer les ressources défaillantes
        resultBrush.geometry.dispose();
        cutGeometry.dispose();
        
        // Retourner la géométrie originale avec les métadonnées de coupe pour l'outline
        const preservedGeometry = baseGeometry.clone();
        return this.addCutMetadataOnly(preservedGeometry, feature, element, params);
      }
      
      // VALIDATION: Perte excessive de vertices (plus de 95%)
      const lossPercentage = Math.abs(verticesDiff) / baseVertices * 100;
      if (lossPercentage > 95) {
        console.warn(`⚠️ CSG WARNING: Excessive vertex loss ${lossPercentage.toFixed(1)}%`);
        console.warn(`⚠️ This might indicate geometry positioning issues`);
        console.warn(`⚠️ Cut geometry might be too large or mispositioned`);
      }
      
      // Nettoyer les ressources
      resultBrush.geometry.dispose();
      cutGeometry.dispose();
      
      // Optimiser la géométrie résultante
      resultGeometry.computeVertexNormals();
      resultGeometry.computeBoundingBox();
      resultGeometry.computeBoundingSphere();
      
      // Copier les métadonnées
      if (baseGeometry.userData) {
        resultGeometry.userData = { ...baseGeometry.userData };
      }
      
      // CRITICAL: Ajouter les cuts pour le FeatureOutlineRenderer
      if (!resultGeometry.userData.cuts) {
        resultGeometry.userData.cuts = baseGeometry.userData?.cuts || [];
      }
      
      // Les params ont déjà été déclarés plus haut
      
      // Calculer les bounds à partir des coordonnées réelles de la feature
      let bounds;
      if (params.x !== undefined && params.y !== undefined && params.z !== undefined) {
        // Utiliser les coordonnées de la feature avec une marge raisonnable
        const margin = 25; // 25mm margin around the cut point
        bounds = {
          minX: params.x - margin,
          maxX: params.x + margin,
          minY: params.y - margin,
          maxY: params.y + margin,
          minZ: params.z - margin,
          maxZ: params.z + margin
        };
      } else if (params.points && params.points.length > 0) {
        // Calculer bounds à partir des points du contour
        const xs = params.points.map((p: any) => p.x || 0).filter((x: number) => !isNaN(x));
        const ys = params.points.map((p: any) => p.y || 0).filter((y: number) => !isNaN(y));
        const zs = params.points.map((p: any) => p.z || 0).filter((z: number) => !isNaN(z));
        
        if (xs.length > 0 && ys.length > 0) {
          bounds = {
            minX: Math.min(...xs),
            maxX: Math.max(...xs),
            minY: Math.min(...ys),
            maxY: Math.max(...ys),
            minZ: zs.length > 0 ? Math.min(...zs) : 0,
            maxZ: zs.length > 0 ? Math.max(...zs) : 10
          };
        } else {
          // Fallback pour les bounds invalides
          console.warn(`⚠️ Invalid contour points for cut ${feature.id}, using default bounds`);
          bounds = { minX: 0, maxX: 50, minY: 0, maxY: 50, minZ: 0, maxZ: 10 };
        }
      } else if (feature.type === FeatureType.END_CUT || (feature.type as any) === 'END_CUT' || (feature.type as any) === 'end_cut') {
        // Pour les END_CUT, utiliser la position et les dimensions du profil
        const position = params.position || params.cutPosition || 'start';
        const profileLength = element?.dimensions?.length || 2000;
        const profileWidth = element?.dimensions?.width || 250;
        const profileHeight = element?.dimensions?.height || 150;
        
        // Position Z de la coupe (début ou fin)
        const cutZ = position === 'start' ? 0 : profileLength;
        const chamferLength = params.chamferLength || 50;
        
        console.log(`🎯 END_CUT bounds calculation: position=${position}, cutZ=${cutZ}, profile=${profileLength}x${profileWidth}x${profileHeight}`);
        
        bounds = {
          minX: -profileWidth/2,
          maxX: profileWidth/2,
          minY: -profileHeight/2,  
          maxY: profileHeight/2,
          minZ: cutZ - chamferLength/2,
          maxZ: cutZ + chamferLength/2
        };
      } else {
        // Fallback si aucune coordonnée valide
        console.warn(`⚠️ No valid coordinates found for cut ${feature.id}, using geometry bounds`);
        
        // Essayer d'utiliser la bounding box de la géométrie
        if (!baseGeometry.boundingBox) {
          baseGeometry.computeBoundingBox();
        }
        
        if (baseGeometry.boundingBox) {
          const bbox = baseGeometry.boundingBox;
          bounds = {
            minX: bbox.min.x,
            maxX: bbox.max.x,
            minY: bbox.min.y,
            maxY: bbox.max.y,
            minZ: bbox.min.z,
            maxZ: bbox.max.z
          };
        } else {
          bounds = {
            minX: params.minX || 0,
            maxX: params.maxX || 50,
            minY: params.minY || 0,
            maxY: params.maxY || 50,
            minZ: params.minZ || params.startZ || 0,
            maxZ: params.maxZ || params.endZ || 10
          };
        }
      }
      
      const cutMetadata = {
        id: feature.id,
        type: feature.type === FeatureType.END_CUT ? 'END_CUT' : 
              feature.parameters?.cutType === 'partial_notches' ? 'notch' : 'cut',
        face: feature.parameters?.face || feature.face || 'front',
        bounds: bounds,
        contourPoints: feature.parameters?.points || [
          { x: params.x || 0, y: params.y || 0, z: params.z || 0 }
        ],
        depth: feature.parameters?.depth || (params as any).chamferLength || 10,
        angle: feature.parameters?.angle || 0,
        cutType: feature.parameters?.cutType || feature.type
      };
      
      resultGeometry.userData.cuts.push(cutMetadata);
      
      console.log(`✅ Added cut metadata to userData.cuts:`, {
        id: cutMetadata.id,
        type: cutMetadata.type,
        face: cutMetadata.face,
        bounds: cutMetadata.bounds,
        totalCuts: resultGeometry.userData.cuts.length
      });
      
      // Ajouter les informations de la coupe
      resultGeometry.userData.lastCut = {
        featureId: feature.id,
        type: feature.type,
        timestamp: Date.now()
      };
      
      return resultGeometry;
      
    } catch (error) {
      console.error('❌ CSG operation failed:', error);
      console.error(`❌ Feature details: id=${feature.id}, type=${feature.type}`);
      console.error(`❌ Base geometry: ${baseGeometry.attributes.position?.count || 0} vertices`);
      console.error(`❌ Cut geometry: ${cutGeometry.attributes.position?.count || 0} vertices`);
      
      // Log specific error details for debugging
      if (error instanceof Error) {
        console.error(`❌ Error message: ${error.message}`);
        console.error(`❌ Error stack: ${error.stack?.substring(0, 200)}...`);
      }
      
      // Check if it's a three-bvh-csg specific error
      if (error instanceof Error && (error.message?.includes('Evaluator') || error.message?.includes('Brush'))) {
        console.error('❌ This appears to be a three-bvh-csg library error');
        console.error('❌ Check if geometries are valid meshes with proper attributes');
      }
      
      console.warn('⚠️ CSG failed, returning base geometry unchanged');
      console.warn('⚠️ Cut will NOT be applied but metadata will still be added for outline rendering');
      
      // Even if CSG fails, add the cut metadata for outline rendering
      const params = feature.parameters as any;
      let bounds;
      
      // Même logique de calcul des bounds que plus haut
      if (feature.type === FeatureType.END_CUT || (feature.type as any) === 'END_CUT' || (feature.type as any) === 'end_cut') {
        const position = params.position || params.cutPosition || 'start';
        const profileLength = element?.dimensions?.length || 2000;
        const profileWidth = element?.dimensions?.width || 250;
        const profileHeight = element?.dimensions?.height || 150;
        const cutZ = position === 'start' ? 0 : profileLength;
        const chamferLength = params.chamferLength || 50;
        
        bounds = {
          minX: -profileWidth/2,
          maxX: profileWidth/2,
          minY: -profileHeight/2,  
          maxY: profileHeight/2,
          minZ: cutZ - chamferLength/2,
          maxZ: cutZ + chamferLength/2
        };
      } else if (params.x !== undefined && params.y !== undefined) {
        const margin = 25;
        bounds = {
          minX: params.x - margin,
          maxX: params.x + margin,
          minY: params.y - margin,
          maxY: params.y + margin,
          minZ: (params.z || 0) - margin,
          maxZ: (params.z || 10) + margin
        };
      } else {
        // Fallback to geometry bounds
        if (!baseGeometry.boundingBox) {
          baseGeometry.computeBoundingBox();
        }
        bounds = baseGeometry.boundingBox ? {
          minX: baseGeometry.boundingBox.min.x,
          maxX: baseGeometry.boundingBox.max.x,
          minY: baseGeometry.boundingBox.min.y,
          maxY: baseGeometry.boundingBox.max.y,
          minZ: baseGeometry.boundingBox.min.z,
          maxZ: baseGeometry.boundingBox.max.z
        } : { minX: 0, maxX: 50, minY: 0, maxY: 50, minZ: 0, maxZ: 10 };
      }
      
      const cutMetadata = {
        id: feature.id,
        type: feature.type === FeatureType.END_CUT ? 'END_CUT' : 'cut',
        face: params?.face || 'front',
        bounds: bounds,
        contourPoints: params?.points || [{ x: params?.x || 0, y: params?.y || 0, z: params?.z || 0 }],
        depth: params?.depth || 10,
        angle: params?.angle || 0,
        cutType: params?.cutType || feature.type,
        csgFailed: true  // Flag to indicate CSG operation failed
      };
      
      // Add to base geometry userData for outline rendering
      if (!baseGeometry.userData.cuts) {
        baseGeometry.userData.cuts = [];
      }
      baseGeometry.userData.cuts.push(cutMetadata);
      
      console.log(`✅ Cut metadata added despite CSG failure for feature ${feature.id}`);
      
      return baseGeometry;
    }
  }
  
  /**
   * Détecte si c'est le pattern M1002 (notches partielles avec extension)
   */
  private isPartialNotchPattern(feature: Feature, element: PivotElement): boolean {
    const points = feature.parameters?.points;
    if (!points || !Array.isArray(points)) {
      return false;
    }
    
    // Pattern M1002 : 9 points avec extension au-delà de la longueur du profil
    if (points.length !== 9) {
      return false;
    }
    
    const profileLength = element.dimensions?.length || 2000;
    
    // Analyser les coordonnées X pour détecter l'extension
    const xCoords = points.map(point => {
      return Array.isArray(point) ? point[0] : point.x || 0;
    }).filter(x => !isNaN(x));
    
    if (xCoords.length === 0) {
      return false;
    }
    
    // Trier pour analyser la structure
    const sortedX = [...new Set(xCoords)].sort((a, b) => a - b);
    
    // Pattern M1002: extension au-delà de la longueur principale
    const maxX = Math.max(...xCoords);
    const hasExtension = maxX > profileLength - 100; // Tolerance pour les arrondis
    
    // Pattern M1002: doit avoir une section principale (0 -> ~1842) + extension (~1842 -> ~1912)
    const hasMainSection = sortedX.some(x => x > profileLength * 0.8 && x < profileLength);
    const hasExtensionSection = sortedX.some(x => x >= profileLength - 1);
    
    const isM1002 = hasExtension && hasMainSection && hasExtensionSection;
    
    if (isM1002) {
      console.log(`  📐 M1002 pattern detected:`);
      console.log(`    - Points: ${points.length}`);
      console.log(`    - Profile length: ${profileLength}mm`);
      console.log(`    - X coordinates: [${sortedX.map(x => x.toFixed(1)).join(', ')}]`);
      console.log(`    - Extension detected: ${maxX.toFixed(1)}mm > ${profileLength}mm`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Ajoute seulement les métadonnées de coupe sans CSG (fallback)
   */
  private addCutMetadataOnly(
    geometry: THREE.BufferGeometry, 
    feature: Feature, 
    element: PivotElement, 
    params: any
  ): THREE.BufferGeometry {
    // Ajouter les métadonnées de coupe pour l'outline renderer
    if (!geometry.userData.cuts) {
      geometry.userData.cuts = [];
    }
    
    const bounds = this.calculateCutBounds(feature, element, params);
    const cutMetadata = {
      id: feature.id,
      type: feature.type === FeatureType.END_CUT ? 'END_CUT' : 
            feature.parameters?.cutType === 'partial_notches' ? 'notch' : 'cut',
      face: feature.parameters?.face || feature.face || 'front',
      bounds: bounds,
      contourPoints: feature.parameters?.points || [
        { x: params.x || 0, y: params.y || 0, z: params.z || 0 }
      ],
      depth: feature.parameters?.depth || 10,
      angle: feature.parameters?.angle || 0,
      cutType: feature.parameters?.cutType || feature.type,
      csgSkipped: true  // Flag pour indiquer que CSG a été contourné
    };
    
    geometry.userData.cuts.push(cutMetadata);
    console.log(`✅ Added cut metadata without CSG for feature ${feature.id}`);
    
    return geometry;
  }
  
  /**
   * Calcule les bounds d'une coupe de manière consolidée
   */
  private calculateCutBounds(feature: Feature, element: PivotElement, params: any): any {
    if (params.x !== undefined && params.y !== undefined && params.z !== undefined) {
      const margin = 25;
      return {
        minX: params.x - margin, maxX: params.x + margin,
        minY: params.y - margin, maxY: params.y + margin,
        minZ: params.z - margin, maxZ: params.z + margin
      };
    } else if (params.points && params.points.length > 0) {
      const xs = params.points.map((p: any) => p.x || 0).filter((x: number) => !isNaN(x));
      const ys = params.points.map((p: any) => p.y || 0).filter((y: number) => !isNaN(y));
      const zs = params.points.map((p: any) => p.z || 0).filter((z: number) => !isNaN(z));
      
      if (xs.length > 0 && ys.length > 0) {
        return {
          minX: Math.min(...xs), maxX: Math.max(...xs),
          minY: Math.min(...ys), maxY: Math.max(...ys),
          minZ: zs.length > 0 ? Math.min(...zs) : 0,
          maxZ: zs.length > 0 ? Math.max(...zs) : 10
        };
      }
    }
    
    // Fallback: utiliser les dimensions du profil
    const profileLength = element?.dimensions?.length || 2000;
    const profileWidth = element?.dimensions?.width || 250;
    const profileHeight = element?.dimensions?.height || 150;
    
    return {
      minX: -profileWidth/2, maxX: profileWidth/2,
      minY: -profileHeight/2, maxY: profileHeight/2,
      minZ: 0, maxZ: profileLength
    };
  }

  /**
   * Validation de géométrie pour CSG
   */
  private validateGeometry(geometry: THREE.BufferGeometry, type: string): boolean {
    if (!geometry || !geometry.attributes || !geometry.attributes.position) {
      console.error(`❌ Invalid ${type} geometry: missing position attribute`);
      return false;
    }
    
    const positionCount = geometry.attributes.position.count;
    if (positionCount < 3) {
      console.error(`❌ Invalid ${type} geometry: insufficient vertices (${positionCount})`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Change le mode de l'adapter
   */
  setMode(mode: AdapterMode): void {
    this.mode = mode;
    this.adapter = getCutProcessorAdapter({
      mode: this.mode,
      // fallbackToLegacy: true,
      enableLogging: false
    });
  }
  
  /**
   * Active/désactive le logging
   */
  setLogging(enabled: boolean, level?: 'debug' | 'info' | 'warn' | 'error'): void {
    this.adapter = getCutProcessorAdapter({
      mode: this.mode,
      // fallbackToLegacy: true,
      enableLogging: enabled,
      logLevel: LogLevel[((level || 'info').toUpperCase() as keyof typeof LogLevel)] || LogLevel.INFO
    });
  }
  
  /**
   * Obtient les statistiques du processor
   */
  getStatistics(): {
    mode: string;
    handlersAvailable: number;
    supportedTypes: string[];
  } {
    const factory = require('./cut/core/CutHandlerFactory').getCutHandlerFactory();
    const stats = factory.getStatistics();
    
    return {
      mode: this.mode,
      handlersAvailable: stats.totalHandlers,
      supportedTypes: Array.from(stats.handlersByType.keys())
    };
  }
}

/**
 * Factory function pour créer un CutProcessor migré
 */
export function createCutProcessor(options?: {
  mode?: AdapterMode;
  enableLogging?: boolean;
}): CutProcessorMigrated {
  return new CutProcessorMigrated(
    options?.mode || AdapterMode.HYBRID
  );
}

/**
 * Singleton pour usage global (compatible avec l'ancien système)
 */
let defaultInstance: CutProcessorMigrated | null = null;

export function getDefaultCutProcessor(): CutProcessorMigrated {
  if (!defaultInstance) {
    defaultInstance = new CutProcessorMigrated(AdapterMode.HYBRID);
  }
  return defaultInstance;
}

/**
 * Export par défaut pour compatibilité
 */
export default CutProcessorMigrated;