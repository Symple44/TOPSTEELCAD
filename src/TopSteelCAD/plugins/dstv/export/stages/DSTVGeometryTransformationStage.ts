/**
 * Stage de transformation de la géométrie pour l'export DSTV
 * Convertit les coordonnées 3D vers le système DSTV
 */

import { BaseStage } from './BaseExportStage';
import { DSTVPluginConfig } from '../../DSTVPlugin';
import { DSTVExportData } from '../DSTVExportPipeline';

interface TransformedData extends DSTVExportData {
  transformed: {
    coordinateSystem: 'DSTV';
    origin: { x: number; y: number; z: number };
    axes: {
      x: 'along_profile';
      y: 'lateral';
      z: 'vertical';
    };
  };
}

export class DSTVGeometryTransformationStage extends BaseStage {
  private config: DSTVPluginConfig;

  constructor(config: DSTVPluginConfig) {
    super({
      name: 'DSTV Geometry Transformation',
      description: 'Transforms 3D geometry to DSTV coordinate system'
    });
    this.config = config;
  }

  async process(context: any): Promise<any> {
    const data = context.output as DSTVExportData;
    
    // Transformer les données selon le système de coordonnées DSTV
    const transformedData = this.transformToDSTVCoordinates(data);
    
    // Normaliser les faces selon la convention DSTV
    this.normalizeFaceIndicators(transformedData);
    
    // Appliquer les transformations spécifiques au type de profil
    this.applyProfileSpecificTransformations(transformedData);
    
    // Arrondir les valeurs selon la précision DSTV (0.01mm)
    this.roundToDSTVPrecision(transformedData);

    context.output = transformedData;
    context.metadata.transformationApplied = true;

    return context;
  }

  private transformToDSTVCoordinates(data: DSTVExportData): TransformedData {
    const transformed: TransformedData = {
      ...data,
      transformed: {
        coordinateSystem: 'DSTV',
        origin: { x: 0, y: 0, z: 0 },
        axes: {
          x: 'along_profile',
          y: 'lateral',
          z: 'vertical'
        }
      }
    };

    // Système de coordonnées DSTV :
    // - X : le long du profil (0 à la gauche)
    // - Y : latéral (perpendiculaire à l'axe du profil)
    // - Z : vertical (hauteur)
    // - Origine : coin inférieur gauche de la face de référence

    // Transformer les features si nécessaires
    if (data.features) {
      // Les coordonnées sont déjà en DSTV si elles viennent de l'import
      // Sinon, appliquer la transformation
      transformed.features = this.transformFeatures(data.features, data.geometry.profile);
    }

    return transformed;
  }

  private transformFeatures(
    features: DSTVExportData['features'],
    profile: DSTVExportData['geometry']['profile']
  ): DSTVExportData['features'] {
    const transformed = { ...features };

    // Transformer les trous
    if (features.holes) {
      transformed.holes = features.holes.map(hole => {
        return this.transformHoleCoordinates(hole, profile);
      });
    }

    // Transformer les contours
    if (features.contours) {
      transformed.contours = features.contours.map(contour => {
        return {
          ...contour,
          points: contour.points.map(point => 
            this.transformPointCoordinates(point, contour.face, profile)
          )
        };
      });
    }

    // Transformer les marquages
    if (features.markings) {
      transformed.markings = features.markings.map(marking => {
        return this.transformMarkingCoordinates(marking, profile);
      });
    }

    return transformed;
  }

  private transformHoleCoordinates(
    hole: DSTVExportData['features']['holes'][0],
    profile: DSTVExportData['geometry']['profile']
  ) {
    // Pour les trous sur les ailes (v, u), les coordonnées sont :
    // - X : position le long du profil
    // - Y : position latérale sur l'aile (depuis le bord de l'âme)
    
    // Pour les trous sur l'âme (o), les coordonnées sont :
    // - X : position le long du profil
    // - Y : position verticale sur l'âme (depuis le bas)

    const normalizedFace = this.normalizeFace(hole.face);
    
    if (normalizedFace === 'v' || normalizedFace === 'u') {
      // Ailes : vérifier que Y ne dépasse pas la largeur de l'aile
      const maxY = (profile.dimensions.width - profile.dimensions.webThickness) / 2;
      if (Math.abs(hole.y) > maxY) {
        console.warn(`Hole Y coordinate ${hole.y} exceeds flange width ${maxY}`);
      }
    } else if (normalizedFace === 'o') {
      // Âme : vérifier que Y ne dépasse pas la hauteur
      const maxY = profile.dimensions.height - 2 * profile.dimensions.flangeThickness;
      if (hole.y > maxY) {
        console.warn(`Hole Y coordinate ${hole.y} exceeds web height ${maxY}`);
      }
    }

    return {
      ...hole,
      face: normalizedFace
    };
  }

  private transformPointCoordinates(
    point: { x: number; y: number },
    _face: string,
    _profile: DSTVExportData['geometry']['profile']
  ): { x: number; y: number } {
    // Les coordonnées des points de contour suivent les mêmes règles
    // que les trous selon la face
    return point;
  }

  private transformMarkingCoordinates(
    marking: DSTVExportData['features']['markings'][0],
    _profile: DSTVExportData['geometry']['profile']
  ) {
    // Les marquages utilisent le même système que les trous
    // mais peuvent avoir un angle de rotation supplémentaire
    const normalizedFace = this.normalizeFace(marking.face);
    
    return {
      ...marking,
      face: normalizedFace,
      angle: marking.angle || 0
    };
  }

  private normalizeFaceIndicators(data: TransformedData) {
    // Normaliser tous les indicateurs de face vers la convention DSTV
    if (data.features) {
      if (data.features.holes) {
        data.features.holes.forEach(hole => {
          hole.face = this.normalizeFace(hole.face);
        });
      }
      
      if (data.features.contours) {
        data.features.contours.forEach(contour => {
          contour.face = this.normalizeFace(contour.face);
        });
      }
      
      if (data.features.markings) {
        data.features.markings.forEach(marking => {
          marking.face = this.normalizeFace(marking.face);
        });
      }
    }
  }

  private normalizeFace(face: string): string {
    // Convertir vers la nomenclature DSTV standard
    const mapping: Record<string, string> = {
      'top_flange': 'v',
      'bottom_flange': 'u',
      'web': 'o',
      'top': 'v',
      'bottom': 'u',
      'left': 's',
      'right': 'h',
      // Déjà en format DSTV
      'v': 'v',
      'u': 'u',
      'o': 'o',
      's': 's',
      'h': 'h'
    };
    
    return mapping[face?.toLowerCase()] || 'o';
  }

  private applyProfileSpecificTransformations(data: TransformedData) {
    const profileType = data.geometry.profile.type;
    
    // Transformations spécifiques selon le type de profil
    if (profileType.startsWith('IPE') || profileType.startsWith('HE')) {
      // Profils en I : pas de transformation supplémentaire
    } else if (profileType.startsWith('UPN') || profileType.startsWith('UPE')) {
      // Profils en U : ajuster les coordonnées pour l'âme unique
      this.transformUProfile(data);
    } else if (profileType.startsWith('L')) {
      // Cornières : transformation spéciale pour les deux ailes
      this.transformLProfile(data);
    } else if (profileType === 'FLAT') {
      // Plat : une seule face principale
      this.transformFlatProfile(data);
    }
  }

  private transformUProfile(data: TransformedData) {
    // Pour les profils en U, l'âme est verticale
    // Les ailes sont horizontales (gauche et droite)
    if (data.features?.holes) {
      data.features.holes.forEach(hole => {
        if (hole.face === 'o') {
          // L'âme d'un U est différente de celle d'un I
          // Ajuster si nécessaire
        }
      });
    }
  }

  private transformLProfile(_data: TransformedData) {
    // Pour les cornières, deux ailes perpendiculaires
    // Nécessite une transformation spéciale des coordonnées
  }

  private transformFlatProfile(data: TransformedData) {
    // Pour les plats, toutes les features sont sur la face principale
    if (data.features) {
      if (data.features.holes) {
        data.features.holes.forEach(hole => {
          hole.face = 'o'; // Tout est sur la face principale
        });
      }
      if (data.features.markings) {
        data.features.markings.forEach(marking => {
          marking.face = 'o';
        });
      }
    }
  }

  private roundToDSTVPrecision(data: TransformedData) {
    const precision = 0.01; // Précision DSTV : 0.01mm

    // Arrondir toutes les valeurs numériques
    if (data.features) {
      if (data.features.holes) {
        data.features.holes.forEach(hole => {
          hole.x = Math.round(hole.x / precision) * precision;
          hole.y = Math.round(hole.y / precision) * precision;
          hole.diameter = Math.round(hole.diameter / precision) * precision;
        });
      }
      
      if (data.features.contours) {
        data.features.contours.forEach(contour => {
          contour.points.forEach(point => {
            point.x = Math.round(point.x / precision) * precision;
            point.y = Math.round(point.y / precision) * precision;
          });
        });
      }
      
      if (data.features.markings) {
        data.features.markings.forEach(marking => {
          marking.x = Math.round(marking.x / precision) * precision;
          marking.y = Math.round(marking.y / precision) * precision;
          marking.height = Math.round(marking.height / precision) * precision;
        });
      }
    }

    // Arrondir les dimensions du profil
    const dims = data.geometry.profile.dimensions;
    dims.length = Math.round(dims.length / precision) * precision;
    dims.height = Math.round(dims.height / precision) * precision;
    dims.width = Math.round(dims.width / precision) * precision;
    dims.webThickness = Math.round(dims.webThickness / precision) * precision;
    dims.flangeThickness = Math.round(dims.flangeThickness / precision) * precision;
  }
}