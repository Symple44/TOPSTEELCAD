import { PartElement, HoleDSTV } from '../types/partBuilder.types';
import {
  PivotElement,
  MaterialType,
  FeatureType,
  SelectableFeature,
  MaterialProperties,
  MetalDimensions
} from '../../../types/viewer';
import { transformHoleCoordinates } from '../utils/coordinateTransform';
import { ProfileTypeService } from '../services/ProfileTypeService';

/**
 * Parse le profileSubType pour extraire les dimensions
 * Exemples : "40x20x2" (RHS), "40x40x2" (SHS), "40x2" (CHS), "200" (IPE), "20x3" (FLAT)
 */
function parseDimensionsFromProfileSubType(profileType: string, profileSubType: string): {
  width?: number;
  height?: number;
  diameter?: number;
  thickness?: number;
} {
  const normalizedType = ProfileTypeService.normalize(profileType).toUpperCase();

  // Enlever les espaces et convertir en minuscules pour parser
  const subType = profileSubType.trim().toLowerCase();

  // Format: "WxHxT" (RHS rectangulaire) ou "SxSxT" (SHS carré)
  if (['RHS', 'SHS'].includes(normalizedType)) {
    const match = subType.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/);
    if (match) {
      return {
        width: parseFloat(match[1]),
        height: parseFloat(match[2]),
        thickness: parseFloat(match[3])
      };
    }
  }

  // Format: "DxT" (CHS tube rond)
  if (normalizedType === 'CHS') {
    const match = subType.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/);
    if (match) {
      return {
        diameter: parseFloat(match[1]),
        thickness: parseFloat(match[2])
      };
    }
  }

  // Format: "WxHxT" pour cornières (L, LA)
  if (['L', 'LA'].includes(normalizedType)) {
    const match = subType.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/);
    if (match) {
      return {
        width: parseFloat(match[1]),
        height: parseFloat(match[2]),
        thickness: parseFloat(match[3])
      };
    }
  }

  // Format: "WxHxT" pour profilés T
  if (normalizedType === 'T') {
    const match = subType.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/);
    if (match) {
      return {
        width: parseFloat(match[1]),
        height: parseFloat(match[2]),
        thickness: parseFloat(match[3])
      };
    }
  }

  // Format: "WxT" pour plats (FLAT)
  if (normalizedType === 'FLAT') {
    const match = subType.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/);
    if (match) {
      return {
        width: parseFloat(match[1]),
        thickness: parseFloat(match[2]),
        height: parseFloat(match[2]) // Pour les plats, height = thickness
      };
    }
  }

  // Format: "D" pour barres rondes (ROUND_BAR)
  if (normalizedType === 'ROUND_BAR') {
    const match = subType.match(/^(\d+(?:\.\d+)?)$/);
    if (match) {
      const diameter = parseFloat(match[1]);
      return {
        diameter: diameter,
        width: diameter,
        height: diameter
      };
    }
  }

  // Format: "S" pour barres carrées (SQUARE_BAR)
  if (normalizedType === 'SQUARE_BAR') {
    const match = subType.match(/^(\d+(?:\.\d+)?)$/);
    if (match) {
      const size = parseFloat(match[1]);
      return {
        width: size,
        height: size
      };
    }
  }

  // Format: juste un nombre (ex: "200" pour IPE200, HEA200, UPN200, C200, Z200, etc.)
  const singleNumber = subType.match(/^(\d+(?:\.\d+)?)$/);
  if (singleNumber) {
    const value = parseFloat(singleNumber[1]);
    return {
      height: value
    };
  }

  return {};
}

/**
 * Convertit un PartElement du Part Builder vers un PivotElement du viewer 3D
 * Gère la conversion propre des types et la normalisation des données
 */
export function convertPartElementToPivotElement(partElement: PartElement): PivotElement {
  // Conversion des dimensions avec valeurs par défaut
  // Gérer les cas spéciaux pour les tubes circulaires qui ont outerDiameter au lieu de width/height
  const dims = partElement.dimensions as any;

  // Si partElement.dimensions est undefined ou vide, parser le profileSubType
  const parsedDims = (!dims || Object.keys(dims).length === 0)
    ? parseDimensionsFromProfileSubType(partElement.profileType, partElement.profileSubType)
    : {};

  // Extraction des dimensions avec priorité sur les valeurs parsées
  const diameter = dims?.outerDiameter || dims?.diameter || parsedDims.diameter;
  const thickness = dims?.thickness || dims?.webThickness || parsedDims.thickness || 10;

  // Pour width et height, utiliser les valeurs parsées en priorité
  // Ne fallback sur diameter que si on n'a pas de width/height parsé
  const width = dims?.width || parsedDims.width || diameter || 100;
  const height = dims?.height || parsedDims.height || diameter || 100;

  const dimensions: MetalDimensions = {
    length: partElement.length,
    width: width,
    height: height,
    thickness: thickness,
    flangeThickness: dims?.flangeThickness || thickness, // Utiliser thickness parsé au lieu de 15
    webThickness: dims?.webThickness || thickness,
    flangeWidth: width,
    webHeight: height,
    // Ne mettre diameter que s'il est réellement défini (pour tubes circulaires)
    diameter: diameter || undefined
  };

  // Conversion des propriétés matériau
  const material: MaterialProperties = {
    grade: partElement.material || 'S355',
    density: 7850, // kg/m³ pour l'acier standard
    color: '#8B8B8B', // Gris métallique
    opacity: 1.0,
    metallic: 0.8,
    roughness: 0.2,
    reflectivity: 0.7
  };

  // Détermination du MaterialType basé sur le ProfileType
  // Utilisation du ProfileTypeService centralisé
  const materialType = ProfileTypeService.toMaterialType(partElement.profileType);

  console.log('🔄 Converting PartElement to PivotElement:', {
    profileType: partElement.profileType,
    profileSubType: partElement.profileSubType,
    materialType: materialType,
    dimensions: dimensions
  });

  // Conversion des trous en features sélectionnables
  // CORRIGÉ : Passe maintenant l'élément pour la transformation des coordonnées
  const holeFeatures: SelectableFeature[] = partElement.holes.map(hole =>
    convertHoleToSelectableFeature(hole, partElement.id, partElement)
  );

  // Construction de l'objet PivotElement
  const pivotElement: PivotElement = {
    // Identification
    id: partElement.id,
    name: `${partElement.profileType}${partElement.profileSubType}`,
    description: partElement.designation,

    // Type et géométrie
    materialType: materialType,
    type: 'beam', // Type legacy pour compatibilité
    profile: `${partElement.profileType}${partElement.profileSubType}`,
    dimensions: dimensions,

    // Transformation spatiale (format tableau [x, y, z])
    position: [0, 0, 0], // Position par défaut au centre
    rotation: [0, 0, 0], // Rotation par défaut
    scale: [1, 1, 1],    // Échelle par défaut

    // Propriétés matériau
    material: material,

    // Features sélectionnables (trous)
    features: holeFeatures,

    // Métadonnées métier
    partNumber: partElement.reference,
    weight: partElement.weight,
    volume: calculateVolume(dimensions),

    // Métadonnées étendues avec duplication pour compatibilité
    metadata: {
      // Données originales du PartElement
      originalElement: partElement,

      // Features dans metadata pour FeatureApplicator
      // CORRIGÉ : Passe maintenant l'élément pour la transformation
      features: partElement.holes.map(hole => convertHoleToFeatureData(hole, partElement)),

      // Informations supplémentaires
      quantity: partElement.quantity,
      status: partElement.status,
      notes: partElement.notes,
      profileType: partElement.profileType,
      profileSubType: partElement.profileSubType
    },

    // Données de fabrication
    cuttingData: {
      profile: `${partElement.profileType}${partElement.profileSubType}`,
      length: partElement.length,
      angle: partElement.startCut?.angle || 90
    },

    // Données originales pour traçabilité
    sourceFormat: 'manual',
    originalData: partElement,

    // État d'affichage
    visible: true,
    selected: false,
    highlighted: false,

    // Timestamps
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return pivotElement;
}

// Note: La fonction getMaterialTypeFromProfile() a été supprimée.
// Elle est maintenant remplacée par ProfileTypeService.toMaterialType()
// qui centralise toute la logique de conversion dans un seul service.

/**
 * Convertit un trou DSTV en SelectableFeature
 * CORRIGÉ : Utilise maintenant la transformation des coordonnées selon la face
 */
function convertHoleToSelectableFeature(hole: HoleDSTV, elementId: string, element: PartElement): SelectableFeature {
  // Transformation des coordonnées 2D (face) vers 3D (globales)
  const globalCoords = transformHoleCoordinates(hole, element);

  const radius = hole.diameter / 2;

  // Créer le feature avec toutes les propriétés nécessaires
  const feature: any = {
    id: hole.id,
    type: FeatureType.HOLE,
    elementId: elementId,
    position: [
      globalCoords.x,
      globalCoords.y,
      globalCoords.z
    ],
    boundingBox: {
      min: [
        globalCoords.x - radius,
        globalCoords.y - radius,
        globalCoords.z - radius
      ],
      max: [
        globalCoords.x + radius,
        globalCoords.y + radius,
        globalCoords.z + radius
      ]
    },
    selectable: true,
    visible: true,
    highlighted: false,

    // Propriétés du trou
    diameter: hole.diameter,
    depth: hole.isThrough ? 0 : (hole.depth || 20),
    isThrough: hole.isThrough,
    face: hole.coordinates.face,
    label: hole.label,
    holeType: 'round',

    // Coordonnées DSTV pour le renderer
    originalDSTVCoords: [hole.coordinates.x, hole.coordinates.y, 0],
    originalPosition: [hole.coordinates.x, hole.coordinates.y, 0],

    metadata: {
      diameter: hole.diameter,
      depth: hole.isThrough ? 0 : (hole.depth || 20),
      isThrough: hole.isThrough,
      face: hole.coordinates.face,
      label: hole.label,
      holeType: 'round',
      // Conserver les coordonnées DSTV originales pour référence
      dstvCoordinates: {
        x: hole.coordinates.x,
        y: hole.coordinates.y,
        face: hole.coordinates.face
      },
      // Pour compatibilité avec FeatureOutlineRenderer
      originalDSTVCoords: [hole.coordinates.x, hole.coordinates.y, 0]
    }
  };

  return feature as SelectableFeature;
}

/**
 * Convertit un trou DSTV en données de feature pour FeatureApplicator
 * CORRIGÉ : Utilise maintenant la transformation des coordonnées
 */
function convertHoleToFeatureData(hole: HoleDSTV, element: PartElement) {
  // Transformation des coordonnées 2D (face) vers 3D (globales)
  const globalCoords = transformHoleCoordinates(hole, element);

  return {
    id: hole.id,
    type: 'hole' as const,
    position: [
      globalCoords.x,
      globalCoords.y,
      globalCoords.z
    ],
    face: hole.coordinates.face,

    // Propriétés du trou (à la racine pour le processor)
    diameter: hole.diameter,
    depth: hole.isThrough ? 0 : (hole.depth || 20),
    isThrough: hole.isThrough,
    label: hole.label,
    holeType: 'round',

    // Coordonnées DSTV originales pour le renderer
    originalDSTVCoords: [hole.coordinates.x, hole.coordinates.y, 0],
    originalPosition: [hole.coordinates.x, hole.coordinates.y, 0],

    parameters: {
      diameter: hole.diameter,
      depth: hole.isThrough ? 0 : (hole.depth || 20),
      holeType: 'round',
      isThrough: hole.isThrough,
      label: hole.label,
      // Coordonnées DSTV originales
      dstvX: hole.coordinates.x,
      dstvY: hole.coordinates.y
    }
  };
}

/**
 * Calcule le volume approximatif basé sur les dimensions
 */
function calculateVolume(dimensions: MetalDimensions): number {
  // Volume en m³
  const lengthM = dimensions.length / 1000;
  const widthM = dimensions.width / 1000;
  const heightM = (dimensions.height || dimensions.thickness) / 1000;

  return lengthM * widthM * heightM;
}


/**
 * Convertit un tableau de PartElement en tableau de PivotElement
 */
export function convertPartElementsToPivotElements(partElements: PartElement[]): PivotElement[] {
  return partElements.map(convertPartElementToPivotElement);
}

/**
 * Met à jour un PivotElement existant avec les nouvelles données d'un PartElement
 */
export function updatePivotElementFromPartElement(
  existingPivotElement: PivotElement,
  updatedPartElement: PartElement
): PivotElement {
  const newPivotElement = convertPartElementToPivotElement(updatedPartElement);

  // Preserve certaines propriétés de l'élément existant
  return {
    ...newPivotElement,
    id: existingPivotElement.id, // Garde l'ID original
    position: existingPivotElement.position, // Garde la position
    rotation: existingPivotElement.rotation, // Garde la rotation
    scale: existingPivotElement.scale, // Garde l'échelle
    selected: existingPivotElement.selected, // Garde l'état de sélection
    highlighted: existingPivotElement.highlighted, // Garde l'état de surbrillance
    createdAt: existingPivotElement.createdAt // Garde la date de création
  };
}