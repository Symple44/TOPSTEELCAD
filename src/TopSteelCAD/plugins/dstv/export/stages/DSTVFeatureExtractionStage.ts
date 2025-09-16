/**
 * Stage d'extraction des features pour l'export DSTV
 * Organise et optimise les features pour la sérialisation
 */

import { BaseStage } from './BaseExportStage';
import { DSTVPluginConfig } from '../../DSTVPlugin';

interface ExtractedFeatures {
  geometry: any;
  features: any;
  transformed: any;
  organized: {
    byType: {
      holes: Map<string, any[]>;      // Groupés par face
      contours: Map<string, any[]>;   // Groupés par type et face
      markings: Map<string, any[]>;   // Groupés par face
      cuts: any[];
    };
    byFace: {
      v: { holes: any[]; contours: any[]; markings: any[] };
      u: { holes: any[]; contours: any[]; markings: any[] };
      o: { holes: any[]; contours: any[]; markings: any[] };
      s?: { holes: any[]; contours: any[]; markings: any[] };
      h?: { holes: any[]; contours: any[]; markings: any[] };
    };
    optimized: {
      mergedHoles: any[];     // Trous identiques fusionnés
      simplifiedContours: any[]; // Contours simplifiés
    };
  };
}

export class DSTVFeatureExtractionStage extends BaseStage {
  private config: DSTVPluginConfig;

  constructor(config: DSTVPluginConfig) {
    super({
      name: 'DSTV Feature Extraction',
      description: 'Extracts and organizes features for DSTV export'
    });
    this.config = config;
  }

  async process(context: any): Promise<any> {
    const data = context.output as any;
    
    // Extraire et organiser les features
    const extracted = this.extractFeatures(data);
    
    // Optimiser les features si configuré
    if (this.config.enableGeometryCache) {
      this.optimizeFeatures(extracted);
    }
    
    // Trier les features pour un export optimal
    this.sortFeatures(extracted);
    
    // Valider l'intégrité des features
    this.validateFeatureIntegrity(extracted);

    context.output = extracted;
    context.metadata.featuresExtracted = true;
    context.metadata.featureStats = this.getFeatureStatistics(extracted);

    return context;
  }

  private extractFeatures(data: any): ExtractedFeatures {
    const extracted: ExtractedFeatures = {
      ...data,
      organized: {
        byType: {
          holes: new Map(),
          contours: new Map(),
          markings: new Map(),
          cuts: []
        },
        byFace: {
          v: { holes: [], contours: [], markings: [] },
          u: { holes: [], contours: [], markings: [] },
          o: { holes: [], contours: [], markings: [] }
        },
        optimized: {
          mergedHoles: [],
          simplifiedContours: []
        }
      }
    };

    // Organiser par type et par face
    if (data.features) {
      // Trous
      if (data.features.holes) {
        for (const hole of data.features.holes) {
          // Par type
          const faceHoles = extracted.organized.byType.holes.get(hole.face) || [];
          faceHoles.push(hole);
          extracted.organized.byType.holes.set(hole.face, faceHoles);
          
          // Par face
          const face = hole.face as keyof typeof extracted.organized.byFace;
          if (face && extracted.organized.byFace[face]) {
            extracted.organized.byFace[face].holes.push(hole);
          }
        }
      }

      // Contours
      if (data.features.contours) {
        for (const contour of data.features.contours) {
          // Par type
          const key = `${contour.type}_${contour.face}`;
          const typeContours = extracted.organized.byType.contours.get(key) || [];
          typeContours.push(contour);
          extracted.organized.byType.contours.set(key, typeContours);
          
          // Par face
          const face = contour.face as keyof typeof extracted.organized.byFace;
          if (face && extracted.organized.byFace[face]) {
            extracted.organized.byFace[face].contours.push(contour);
          }
        }
      }

      // Marquages
      if (data.features.markings) {
        for (const marking of data.features.markings) {
          // Par type
          const faceMarkings = extracted.organized.byType.markings.get(marking.face) || [];
          faceMarkings.push(marking);
          extracted.organized.byType.markings.set(marking.face, faceMarkings);
          
          // Par face
          const face = marking.face as keyof typeof extracted.organized.byFace;
          if (face && extracted.organized.byFace[face]) {
            extracted.organized.byFace[face].markings.push(marking);
          }
        }
      }

      // Coupes
      if (data.features.cuts) {
        extracted.organized.byType.cuts = data.features.cuts;
      }
    }

    return extracted;
  }

  private optimizeFeatures(extracted: ExtractedFeatures) {
    // Fusionner les trous identiques
    this.mergeIdenticalHoles(extracted);
    
    // Simplifier les contours
    this.simplifyContours(extracted);
    
    // Optimiser l'ordre des features pour minimiser les mouvements machine
    this.optimizeFeatureOrder(extracted);
  }

  private mergeIdenticalHoles(extracted: ExtractedFeatures) {
    const mergedMap = new Map<string, any>();
    
    for (const [face, holes] of extracted.organized.byType.holes) {
      for (const hole of holes) {
        // Créer une clé unique pour le trou
        const key = `${face}_${hole.x.toFixed(2)}_${hole.y.toFixed(2)}_${hole.diameter.toFixed(2)}`;
        
        if (!mergedMap.has(key)) {
          mergedMap.set(key, hole);
        }
      }
    }
    
    extracted.organized.optimized.mergedHoles = Array.from(mergedMap.values());
    
    if (this.config.enableDebugLogs) {
      const originalCount = Array.from(extracted.organized.byType.holes.values())
        .reduce((sum, holes) => sum + holes.length, 0);
      const mergedCount = extracted.organized.optimized.mergedHoles.length;
      if (originalCount > mergedCount) {
        console.log(`[DSTVExport] Merged ${originalCount - mergedCount} duplicate holes`);
      }
    }
  }

  private simplifyContours(extracted: ExtractedFeatures) {
    extracted.organized.optimized.simplifiedContours = [];
    
    for (const contours of extracted.organized.byType.contours.values()) {
      for (const contour of contours) {
        const simplified = this.simplifyContour(contour);
        extracted.organized.optimized.simplifiedContours.push(simplified);
      }
    }
  }

  private simplifyContour(contour: any): any {
    // Algorithme de Douglas-Peucker pour simplifier les contours
    const tolerance = 0.01; // 0.01mm de tolérance
    
    if (contour.points.length <= 2) {
      return contour;
    }
    
    const simplifiedPoints = this.douglasPeucker(contour.points, tolerance);
    
    if (this.config.enableDebugLogs && simplifiedPoints.length < contour.points.length) {
      console.log(`[DSTVExport] Simplified contour from ${contour.points.length} to ${simplifiedPoints.length} points`);
    }
    
    return {
      ...contour,
      points: simplifiedPoints
    };
  }

  private douglasPeucker(points: any[], tolerance: number): any[] {
    if (points.length <= 2) {
      return points;
    }
    
    // Trouver le point le plus éloigné de la ligne
    let maxDistance = 0;
    let maxIndex = 0;
    
    const first = points[0];
    const last = points[points.length - 1];
    
    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.perpendicularDistance(points[i], first, last);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }
    
    // Si la distance max est supérieure à la tolérance, subdiviser
    if (maxDistance > tolerance) {
      const left = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
      const right = this.douglasPeucker(points.slice(maxIndex), tolerance);
      
      // Combiner les résultats (sans dupliquer le point du milieu)
      return [...left.slice(0, -1), ...right];
    } else {
      // Sinon, garder seulement les extrémités
      return [first, last];
    }
  }

  private perpendicularDistance(point: any, lineStart: any, lineEnd: any): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    
    if (dx === 0 && dy === 0) {
      // Le début et la fin sont identiques
      return Math.sqrt(
        Math.pow(point.x - lineStart.x, 2) + 
        Math.pow(point.y - lineStart.y, 2)
      );
    }
    
    const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / 
              (dx * dx + dy * dy);
    
    const projection = {
      x: lineStart.x + t * dx,
      y: lineStart.y + t * dy
    };
    
    return Math.sqrt(
      Math.pow(point.x - projection.x, 2) + 
      Math.pow(point.y - projection.y, 2)
    );
  }

  private optimizeFeatureOrder(extracted: ExtractedFeatures) {
    // Optimiser l'ordre des features pour minimiser les déplacements
    // Utiliser un algorithme de type "nearest neighbor" simplifié
    
    for (const face of ['v', 'u', 'o'] as const) {
      const faceData = extracted.organized.byFace[face];
      
      // Trier les trous par position X puis Y
      faceData.holes.sort((a, b) => {
        if (Math.abs(a.x - b.x) < 0.01) {
          return a.y - b.y;
        }
        return a.x - b.x;
      });
      
      // Trier les marquages par position X puis Y
      faceData.markings.sort((a, b) => {
        if (Math.abs(a.x - b.x) < 0.01) {
          return a.y - b.y;
        }
        return a.x - b.x;
      });
    }
  }

  private sortFeatures(extracted: ExtractedFeatures) {
    // Ordre de priorité pour l'export DSTV :
    // 1. Contours externes (AK)
    // 2. Contours internes (IK)
    // 3. Trous (BO, SI, etc.)
    // 4. Marquages (SI, PU, KO)
    // 5. Autres features

    // Trier les contours par type
    const sortedContours = new Map<string, any[]>();
    
    // D'abord les AK
    for (const [key, contours] of extracted.organized.byType.contours) {
      if (key.startsWith('AK_')) {
        sortedContours.set(key, contours);
      }
    }
    
    // Puis les IK
    for (const [key, contours] of extracted.organized.byType.contours) {
      if (key.startsWith('IK_')) {
        sortedContours.set(key, contours);
      }
    }
    
    extracted.organized.byType.contours = sortedContours;
  }

  private validateFeatureIntegrity(extracted: ExtractedFeatures) {
    // Vérifier l'intégrité des features extraites
    const errors: string[] = [];
    
    // Vérifier que les trous ne se chevauchent pas
    for (const [face, holes] of extracted.organized.byType.holes) {
      for (let i = 0; i < holes.length; i++) {
        for (let j = i + 1; j < holes.length; j++) {
          const h1 = holes[i];
          const h2 = holes[j];
          const distance = Math.sqrt(
            Math.pow(h2.x - h1.x, 2) + 
            Math.pow(h2.y - h1.y, 2)
          );
          const minDistance = (h1.diameter + h2.diameter) / 2;
          
          if (distance < minDistance) {
            errors.push(`Overlapping holes on face ${face}: positions (${h1.x}, ${h1.y}) and (${h2.x}, ${h2.y})`);
          }
        }
      }
    }
    
    if (errors.length > 0 && this.config.strictMode) {
      throw new Error(`Feature integrity check failed:\n${errors.join('\n')}`);
    }
  }

  private getFeatureStatistics(extracted: ExtractedFeatures): any {
    const stats = {
      totalHoles: 0,
      totalContours: 0,
      totalMarkings: 0,
      totalCuts: extracted.organized.byType.cuts.length,
      byFace: {} as Record<string, any>
    };
    
    for (const [face, holes] of extracted.organized.byType.holes) {
      stats.totalHoles += holes.length;
      if (!stats.byFace[face]) {
        stats.byFace[face] = { holes: 0, contours: 0, markings: 0 };
      }
      stats.byFace[face].holes = holes.length;
    }
    
    for (const [key, contours] of extracted.organized.byType.contours) {
      stats.totalContours += contours.length;
      const face = key.split('_')[1];
      if (!stats.byFace[face]) {
        stats.byFace[face] = { holes: 0, contours: 0, markings: 0 };
      }
      stats.byFace[face].contours += contours.length;
    }
    
    for (const [face, markings] of extracted.organized.byType.markings) {
      stats.totalMarkings += markings.length;
      if (!stats.byFace[face]) {
        stats.byFace[face] = { holes: 0, contours: 0, markings: 0 };
      }
      stats.byFace[face].markings = markings.length;
    }
    
    return stats;
  }
}