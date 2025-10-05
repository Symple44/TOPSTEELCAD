/**
 * Exemples d'utilisation des profils personnalisés
 * @module CustomProfileExamples
 */

import {
  CustomProfile,
  Shape2D,
  SegmentType,
  Point2D,
  CustomProfileLibrary
} from '../types/custom-profile.types';

import {
  createCustomProfile,
  createSimpleContour,
  createCustomIProfile,
  createCustomTProfile,
  validateCustomProfile,
  calculateGeometryProperties
} from '../utils/customProfileHelpers';

// ============================================================================
// EXEMPLE 1: Profil Rectangulaire Simple
// ============================================================================

export function example1_RectangularProfile(): CustomProfile {
  // Créer un contour rectangulaire simple
  const rectangle = createSimpleContour({
    type: 'rectangle',
    width: 200,    // 200mm de largeur
    height: 100,   // 100mm de hauteur
    center: { x: 0, y: 0 }
  });

  const shape: Shape2D = {
    outerContour: rectangle
  };

  return createCustomProfile({
    name: 'Rectangle 200x100',
    designation: 'RECT-200x100',
    description: 'Profil rectangulaire plein 200mm x 100mm',
    shape,
    author: 'Jean Dupont',
    tags: ['rectangle', 'simple'],
    defaultMaterial: {
      grade: 'S235',
      density: 7.85,
      yieldStrength: 235,
      tensileStrength: 360
    }
  });
}

// ============================================================================
// EXEMPLE 2: Profil en T Personnalisé
// ============================================================================

export function example2_TProfile(): CustomProfile {
  // Utiliser le helper pour créer un profil en T
  return createCustomTProfile(
    200,  // hauteur totale
    150,  // largeur de la semelle
    10,   // épaisseur de l'âme
    15,   // épaisseur de la semelle
    'T-Profile Standard'
  );
}

// ============================================================================
// EXEMPLE 3: Profil en I Personnalisé
// ============================================================================

export function example3_IProfile(): CustomProfile {
  // Utiliser le helper pour créer un profil en I
  return createCustomIProfile(
    300,  // hauteur
    150,  // largeur des semelles
    7.1,  // épaisseur de l'âme
    10.7, // épaisseur des semelles
    'I-Profile Custom 300x150'
  );
}

// ============================================================================
// EXEMPLE 4: Profil avec Trou Circulaire
// ============================================================================

export function example4_ProfileWithHole(): CustomProfile {
  // Contour extérieur: rectangle 300x200
  const outerContour = createSimpleContour({
    type: 'rectangle',
    width: 300,
    height: 200,
    center: { x: 0, y: 0 }
  });

  // Trou circulaire au centre
  const hole = createSimpleContour({
    type: 'circle',
    radius: 40,
    center: { x: 0, y: 0 }
  });

  const shape: Shape2D = {
    outerContour,
    holes: [hole]
  };

  return createCustomProfile({
    name: 'Plaque Percée 300x200',
    designation: 'PLATE-300x200-H80',
    description: 'Plaque rectangulaire 300x200 avec trou central Ø80mm',
    shape,
    tags: ['plaque', 'percée', 'trou'],
    defaultMaterial: {
      grade: 'S355',
      density: 7.85
    }
  });
}

// ============================================================================
// EXEMPLE 5: Profil en L (Cornière Personnalisée)
// ============================================================================

export function example5_LProfile(): CustomProfile {
  const segments = [
    { type: SegmentType.LINE, start: { x: 0, y: 0 }, end: { x: 100, y: 0 } },
    { type: SegmentType.LINE, start: { x: 100, y: 0 }, end: { x: 100, y: 10 } },
    { type: SegmentType.LINE, start: { x: 100, y: 10 }, end: { x: 10, y: 10 } },
    { type: SegmentType.LINE, start: { x: 10, y: 10 }, end: { x: 10, y: 100 } },
    { type: SegmentType.LINE, start: { x: 10, y: 100 }, end: { x: 0, y: 100 } },
    { type: SegmentType.LINE, start: { x: 0, y: 100 }, end: { x: 0, y: 0 } }
  ];

  const shape: Shape2D = {
    outerContour: {
      id: 'l-profile-contour',
      segments,
      closed: true
    }
  };

  return createCustomProfile({
    name: 'Cornière 100x100x10',
    designation: 'L-100x100x10-CUSTOM',
    description: 'Cornière à ailes égales 100x100, épaisseur 10mm',
    shape,
    tags: ['cornière', 'L'],
    defaultMaterial: {
      grade: 'S275',
      density: 7.85
    }
  });
}

// ============================================================================
// EXEMPLE 6: Profil avec Coins Arrondis (Arcs)
// ============================================================================

export function example6_RoundedRectangle(): CustomProfile {
  const width = 200;
  const height = 100;
  const cornerRadius = 10;

  const segments = [
    // Bas (ligne droite)
    {
      type: SegmentType.LINE,
      start: { x: -width/2 + cornerRadius, y: -height/2 },
      end: { x: width/2 - cornerRadius, y: -height/2 }
    },
    // Coin bas-droit (arc)
    {
      type: SegmentType.ARC,
      center: { x: width/2 - cornerRadius, y: -height/2 + cornerRadius },
      radius: cornerRadius,
      startAngle: -Math.PI / 2,
      endAngle: 0,
      counterClockwise: false
    },
    // Droite (ligne droite)
    {
      type: SegmentType.LINE,
      start: { x: width/2, y: -height/2 + cornerRadius },
      end: { x: width/2, y: height/2 - cornerRadius }
    },
    // Coin haut-droit (arc)
    {
      type: SegmentType.ARC,
      center: { x: width/2 - cornerRadius, y: height/2 - cornerRadius },
      radius: cornerRadius,
      startAngle: 0,
      endAngle: Math.PI / 2,
      counterClockwise: false
    },
    // Haut (ligne droite)
    {
      type: SegmentType.LINE,
      start: { x: width/2 - cornerRadius, y: height/2 },
      end: { x: -width/2 + cornerRadius, y: height/2 }
    },
    // Coin haut-gauche (arc)
    {
      type: SegmentType.ARC,
      center: { x: -width/2 + cornerRadius, y: height/2 - cornerRadius },
      radius: cornerRadius,
      startAngle: Math.PI / 2,
      endAngle: Math.PI,
      counterClockwise: false
    },
    // Gauche (ligne droite)
    {
      type: SegmentType.LINE,
      start: { x: -width/2, y: height/2 - cornerRadius },
      end: { x: -width/2, y: -height/2 + cornerRadius }
    },
    // Coin bas-gauche (arc)
    {
      type: SegmentType.ARC,
      center: { x: -width/2 + cornerRadius, y: -height/2 + cornerRadius },
      radius: cornerRadius,
      startAngle: Math.PI,
      endAngle: 3 * Math.PI / 2,
      counterClockwise: false
    }
  ];

  const shape: Shape2D = {
    outerContour: {
      id: 'rounded-rect-contour',
      segments,
      closed: true
    }
  };

  return createCustomProfile({
    name: 'Rectangle Arrondi 200x100 R10',
    designation: 'RECT-ROUND-200x100-R10',
    description: 'Rectangle 200x100 avec coins arrondis rayon 10mm',
    shape,
    tags: ['rectangle', 'arrondi'],
    defaultMaterial: {
      grade: 'S355',
      density: 7.85
    }
  });
}

// ============================================================================
// EXEMPLE 7: Profil Oméga (Utilisant Courbes de Bézier)
// ============================================================================

export function example7_OmegaProfile(): CustomProfile {
  const width = 100;
  const height = 80;
  const thickness = 5;

  const segments = [
    // Base gauche
    { type: SegmentType.LINE, start: { x: -width/2, y: 0 }, end: { x: -width/2, y: thickness } },

    // Courbe gauche montante (Bézier quadratique)
    {
      type: SegmentType.BEZIER_QUADRATIC,
      start: { x: -width/2, y: thickness },
      control: { x: -width/2, y: height/2 },
      end: { x: -width/4, y: height }
    },

    // Sommet
    { type: SegmentType.LINE, start: { x: -width/4, y: height }, end: { x: width/4, y: height } },

    // Courbe droite descendante
    {
      type: SegmentType.BEZIER_QUADRATIC,
      start: { x: width/4, y: height },
      control: { x: width/2, y: height/2 },
      end: { x: width/2, y: thickness }
    },

    // Base droite
    { type: SegmentType.LINE, start: { x: width/2, y: thickness }, end: { x: width/2, y: 0 } },

    // Retour (fermeture)
    { type: SegmentType.LINE, start: { x: width/2, y: 0 }, end: { x: -width/2, y: 0 } }
  ];

  const shape: Shape2D = {
    outerContour: {
      id: 'omega-contour',
      segments,
      closed: true
    }
  };

  return createCustomProfile({
    name: 'Profil Oméga 100x80',
    designation: 'OMEGA-100x80-CUSTOM',
    description: 'Profil en forme Oméga avec courbes',
    shape,
    tags: ['omega', 'courbe', 'formé à froid'],
    defaultMaterial: {
      grade: 'S250',
      density: 7.85
    }
  });
}

// ============================================================================
// EXEMPLE 8: Profil Composite Soudé (Multi-sections)
// ============================================================================

export function example8_WeldedComposite(): CustomProfile {
  // Profil en I avec plaques additionnelles soudées
  // Simulation d'un profil renforcé

  const segments = [
    // Semelle inférieure large
    { type: SegmentType.LINE, start: { x: -120, y: 0 }, end: { x: 120, y: 0 } },
    { type: SegmentType.LINE, start: { x: 120, y: 0 }, end: { x: 120, y: 20 } },
    { type: SegmentType.LINE, start: { x: 120, y: 20 }, end: { x: 75, y: 20 } },

    // Transition vers âme
    { type: SegmentType.LINE, start: { x: 75, y: 20 }, end: { x: 10, y: 30 } },

    // Âme
    { type: SegmentType.LINE, start: { x: 10, y: 30 }, end: { x: 10, y: 270 } },

    // Transition vers semelle supérieure
    { type: SegmentType.LINE, start: { x: 10, y: 270 }, end: { x: 75, y: 280 } },

    // Semelle supérieure
    { type: SegmentType.LINE, start: { x: 75, y: 280 }, end: { x: 120, y: 280 } },
    { type: SegmentType.LINE, start: { x: 120, y: 280 }, end: { x: 120, y: 300 } },
    { type: SegmentType.LINE, start: { x: 120, y: 300 }, end: { x: -120, y: 300 } },
    { type: SegmentType.LINE, start: { x: -120, y: 300 }, end: { x: -120, y: 280 } },
    { type: SegmentType.LINE, start: { x: -120, y: 280 }, end: { x: -75, y: 280 } },

    // Transition gauche
    { type: SegmentType.LINE, start: { x: -75, y: 280 }, end: { x: -10, y: 270 } },

    // Âme gauche
    { type: SegmentType.LINE, start: { x: -10, y: 270 }, end: { x: -10, y: 30 } },

    // Transition vers semelle inférieure
    { type: SegmentType.LINE, start: { x: -10, y: 30 }, end: { x: -75, y: 20 } },

    // Retour semelle inférieure
    { type: SegmentType.LINE, start: { x: -75, y: 20 }, end: { x: -120, y: 20 } },
    { type: SegmentType.LINE, start: { x: -120, y: 20 }, end: { x: -120, y: 0 } }
  ];

  const shape: Shape2D = {
    outerContour: {
      id: 'welded-composite-contour',
      segments,
      closed: true
    }
  };

  return createCustomProfile({
    name: 'Poutre Composite Soudée 300mm',
    designation: 'WELDED-I-300-CUSTOM',
    description: 'Profil en I soudé avec plaques renforcées, hauteur 300mm',
    shape,
    tags: ['composite', 'soudé', 'renforcé'],
    defaultMaterial: {
      grade: 'S355',
      density: 7.85,
      yieldStrength: 355,
      tensileStrength: 510
    }
  });
}

// ============================================================================
// EXEMPLE 9: Création d'une Bibliothèque
// ============================================================================

export function example9_CreateLibrary(): CustomProfileLibrary {
  return {
    id: 'lib-custom-profiles-example',
    name: 'Bibliothèque de Profils Personnalisés - Exemples',
    description: 'Collection de profils d\'exemple pour démonstration',
    version: '1.0.0',

    profiles: [
      example1_RectangularProfile(),
      example2_TProfile(),
      example3_IProfile(),
      example4_ProfileWithHole(),
      example5_LProfile(),
      example6_RoundedRectangle(),
      example7_OmegaProfile(),
      example8_WeldedComposite()
    ],

    metadata: {
      author: 'TopSteelCAD Team',
      organization: 'TopSteelCAD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['exemples', 'demo', 'tutoriel']
    }
  };
}

// ============================================================================
// EXEMPLE 10: Validation d'un Profil
// ============================================================================

export function example10_ValidateProfile(): void {
  // Créer un profil
  const profile = example3_IProfile();

  // Valider avec règles par défaut
  const result = validateCustomProfile(profile);

  console.log('=== Résultat de validation ===');
  console.log('Valide:', result.isValid);
  console.log('Erreurs:', result.errors);
  console.log('Avertissements:', result.warnings);

  // Valider avec règles personnalisées
  const strictResult = validateCustomProfile(profile, {
    minArea: 50,         // Minimum 50 cm²
    maxArea: 500,        // Maximum 500 cm²
    minPerimeter: 500,   // Minimum 500 mm
    maxSegments: 50,     // Maximum 50 segments
    requireClosed: true,
    validateHoles: true,
    checkSelfIntersection: false
  });

  console.log('\n=== Validation stricte ===');
  console.log('Valide:', strictResult.isValid);
  console.log('Erreurs:', strictResult.errors);
  console.log('Avertissements:', strictResult.warnings);
}

// ============================================================================
// EXEMPLE 11: Calcul des Propriétés
// ============================================================================

export function example11_CalculateProperties(): void {
  const profile = example2_TProfile();

  console.log('=== Propriétés du profil ===');
  console.log('Nom:', profile.name);
  console.log('Désignation:', profile.designation);
  console.log('Aire:', profile.properties.area.toFixed(2), 'cm²');
  console.log('Périmètre:', profile.properties.perimeter.toFixed(2), 'mm');
  console.log('Centre de gravité:', {
    x: profile.properties.centroid.x.toFixed(2),
    y: profile.properties.centroid.y.toFixed(2)
  });

  if (profile.weight) {
    console.log('Poids linéique:', profile.weight.toFixed(3), 'kg/m');
  }

  if (profile.referenceDimensions) {
    console.log('Dimensions de référence:');
    console.log('  Hauteur:', profile.referenceDimensions.height?.toFixed(2), 'mm');
    console.log('  Largeur:', profile.referenceDimensions.width?.toFixed(2), 'mm');
  }
}

// ============================================================================
// EXEMPLE 12: Export JSON
// ============================================================================

export function example12_ExportToJSON(): string {
  const profile = example3_IProfile();

  // Créer l'objet d'export
  const exportData = {
    formatVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    type: 'single' as const,
    profile
  };

  // Convertir en JSON formaté
  return JSON.stringify(exportData, null, 2);
}

// ============================================================================
// EXEMPLE 13: Export Bibliothèque JSON
// ============================================================================

export function example13_ExportLibraryToJSON(): string {
  const library = example9_CreateLibrary();

  const exportData = {
    formatVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    type: 'library' as const,
    library
  };

  return JSON.stringify(exportData, null, 2);
}

// ============================================================================
// UTILISATION
// ============================================================================

// Décommenter pour tester:
// console.log(example12_ExportToJSON());
// example10_ValidateProfile();
// example11_CalculateProperties();

/*
EXEMPLES D'UTILISATION:

1. Créer un profil simple:
   const profile = example1_RectangularProfile();

2. Créer un profil en T:
   const tProfile = createCustomTProfile(200, 150, 10, 15);

3. Créer un profil avec trou:
   const plateWithHole = example4_ProfileWithHole();

4. Valider un profil:
   const result = validateCustomProfile(profile);
   if (!result.isValid) {
     console.error('Erreurs:', result.errors);
   }

5. Exporter en JSON:
   const json = example12_ExportToJSON();
   // Sauvegarder dans un fichier ou LocalStorage

6. Créer une bibliothèque:
   const library = example9_CreateLibrary();
   // Stocker dans LocalStorage ou base de données
*/
