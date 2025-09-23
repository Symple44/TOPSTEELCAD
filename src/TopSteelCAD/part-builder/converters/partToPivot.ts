import { PartElement, HoleDSTV } from '../types/partBuilder.types';
import {
  PivotElement,
  MaterialType,
  FeatureType,
  SelectableFeature,
  MaterialProperties,
  MetalDimensions
} from '../../../types/viewer';

/**
 * Convertit un PartElement du Part Builder vers un PivotElement du viewer 3D
 * Gère la conversion propre des types et la normalisation des données
 */
export function convertPartElementToPivotElement(partElement: PartElement): PivotElement {
  // Conversion des dimensions avec valeurs par défaut
  const dimensions: MetalDimensions = {
    length: partElement.length,
    width: partElement.dimensions?.width || 100,
    height: partElement.dimensions?.height || 100,
    thickness: partElement.dimensions?.webThickness || 10,
    flangeThickness: partElement.dimensions?.flangeThickness || 15,
    webThickness: partElement.dimensions?.webThickness || 10,
    flangeWidth: partElement.dimensions?.width || 100,
    webHeight: partElement.dimensions?.height || 100
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
  const materialType = getMaterialTypeFromProfile(partElement.profileType);

  // Conversion des trous en features sélectionnables
  const holeFeatures: SelectableFeature[] = partElement.holes.map(hole =>
    convertHoleToSelectableFeature(hole, partElement.id)
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
      features: partElement.holes.map(hole => convertHoleToFeatureData(hole)),

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

/**
 * Détermine le MaterialType basé sur le ProfileType
 */
function getMaterialTypeFromProfile(profileType: string): MaterialType {
  const profileTypeUpper = profileType.toUpperCase();

  switch (profileTypeUpper) {
    case 'IPE':
    case 'HEA':
    case 'HEB':
    case 'HEM':
      return MaterialType.BEAM;

    case 'UPN':
    case 'UAP':
    case 'UPE':
      return MaterialType.CHANNEL;

    case 'L_EQUAL':
    case 'L_UNEQUAL':
    case 'CORNIERE':
    case 'L':
      return MaterialType.ANGLE;

    case 'TEE':
    case 'T':
    case 'T_PROFILE':
      return MaterialType.TEE;

    case 'TUBE_ROUND':
    case 'TUBE_CIRCULAR':
    case 'CHS':
      return MaterialType.TUBE;

    case 'TUBE_SQUARE':
    case 'TUBE_RECTANGULAR':
    case 'TUBE_RECT':
    case 'RHS':
    case 'SHS':
      return MaterialType.TUBE;

    case 'PLATE':
    case 'FLAT':
    case 'TOLE':
      return MaterialType.PLATE;

    case 'ROUND_BAR':
    case 'SQUARE_BAR':
    case 'ROND':
    case 'CARRE':
      return MaterialType.BAR;

    default:
      return MaterialType.BEAM; // Type par défaut
  }
}

/**
 * Convertit un trou DSTV en SelectableFeature
 */
function convertHoleToSelectableFeature(hole: HoleDSTV, elementId: string): SelectableFeature {
  return {
    id: hole.id,
    type: FeatureType.HOLE,
    elementId: elementId,
    position: [
      hole.coordinates.x,
      hole.coordinates.y,
      hole.coordinates.z || 0
    ],
    boundingBox: {
      min: [
        hole.coordinates.x - hole.diameter / 2,
        hole.coordinates.y - hole.diameter / 2,
        (hole.coordinates.z || 0) - hole.diameter / 2
      ],
      max: [
        hole.coordinates.x + hole.diameter / 2,
        hole.coordinates.y + hole.diameter / 2,
        (hole.coordinates.z || 0) + hole.diameter / 2
      ]
    },
    selectable: true,
    visible: true,
    highlighted: false,
    metadata: {
      diameter: hole.diameter,
      depth: hole.isThrough ? 0 : (hole.depth || 20),
      isThrough: hole.isThrough,
      face: hole.coordinates.face,
      label: hole.label,
      holeType: 'round'
    }
  };
}

/**
 * Convertit un trou DSTV en données de feature pour FeatureApplicator
 */
function convertHoleToFeatureData(hole: HoleDSTV) {
  return {
    id: hole.id,
    type: 'hole' as const,
    position: [
      hole.coordinates.x,
      hole.coordinates.y,
      hole.coordinates.z || 0
    ],
    face: hole.coordinates.face,
    parameters: {
      diameter: hole.diameter,
      depth: hole.isThrough ? 0 : (hole.depth || 20),
      holeType: 'round',
      isThrough: hole.isThrough,
      label: hole.label
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