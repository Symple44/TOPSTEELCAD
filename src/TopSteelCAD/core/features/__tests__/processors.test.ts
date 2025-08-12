/**
 * Tests unitaires pour les processeurs de features
 */

import * as THREE from 'three';
import { 
  HoleProcessor,
  SlotProcessor,
  CutoutProcessor,
  ContourProcessor,
  NotchProcessor,
  TappedHoleProcessor,
  CounterSinkProcessor,
  DrillPatternProcessor,
  CopingProcessor,
  BevelProcessor,
  ChamferProcessor,
  MarkingProcessor,
  TextProcessor,
  WeldProcessor
} from '../processors';
import { Feature, FeatureType, ProfileFace, CoordinateSystem } from '../types';
import { PivotElement, MaterialType } from '@/types/viewer';

/**
 * Crée un élément de test IPE300
 */
function createTestElement(): PivotElement {
  return {
    id: 'test-element',
    name: 'IPE300 Test',
    materialType: MaterialType.BEAM,
    partNumber: 'IPE300',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    dimensions: {
      length: 6000,
      height: 300,
      width: 150,
      thickness: 10.7
    },
    metadata: {
      profile: 'IPE300',
      webThickness: 7.1,
      flangeThickness: 10.7
    }
  };
}

/**
 * Crée une géométrie de test (box simple)
 */
function createTestGeometry(): THREE.BufferGeometry {
  return new THREE.BoxGeometry(6000, 300, 150);
}

describe('HoleProcessor', () => {
  let processor: HoleProcessor;
  let testElement: PivotElement;
  let testGeometry: THREE.BufferGeometry;

  beforeEach(() => {
    processor = new HoleProcessor();
    testElement = createTestElement();
    testGeometry = createTestGeometry();
  });

  afterEach(() => {
    testGeometry.dispose();
    processor.dispose?.();
  });

  test('devrait créer un trou standard', () => {
    const feature: Feature = {
      id: 'hole-1',
      type: FeatureType.HOLE,
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(500, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      face: ProfileFace.WEB,
      parameters: {
        diameter: 22,
        depth: -1 // Traversant
      }
    };

    const result = processor.process(testGeometry, feature, testElement);
    
    expect(result.success).toBe(true);
    expect(result.geometry).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  test('devrait valider les paramètres du trou', () => {
    const feature: Feature = {
      id: 'hole-2',
      type: FeatureType.HOLE,
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      parameters: {} // Pas de diamètre
    };

    const errors = processor.validateFeature(feature, testElement);
    expect(errors).toContain('Le diamètre du trou est requis');
  });

  test('devrait traiter plusieurs trous en batch', () => {
    const holes: Feature[] = [
      {
        id: 'hole-batch-1',
        type: FeatureType.HOLE,
        coordinateSystem: CoordinateSystem.LOCAL,
        position: new THREE.Vector3(100, 0, 0),
        rotation: new THREE.Euler(0, 0, 0),
        parameters: { diameter: 20, depth: -1 }
      },
      {
        id: 'hole-batch-2',
        type: FeatureType.HOLE,
        coordinateSystem: CoordinateSystem.LOCAL,
        position: new THREE.Vector3(200, 0, 0),
        rotation: new THREE.Euler(0, 0, 0),
        parameters: { diameter: 20, depth: -1 }
      }
    ];

    if (processor.processBatch) {
      const result = processor.processBatch(testGeometry, holes, testElement);
      expect(result.success).toBe(true);
      expect(result.geometry).toBeDefined();
    }
  });
});

describe('TappedHoleProcessor', () => {
  let processor: TappedHoleProcessor;
  let testElement: PivotElement;
  let testGeometry: THREE.BufferGeometry;

  beforeEach(() => {
    processor = new TappedHoleProcessor();
    testElement = createTestElement();
    testGeometry = createTestGeometry();
  });

  afterEach(() => {
    testGeometry.dispose();
    processor.dispose?.();
  });

  test('devrait créer un trou taraudé métrique', () => {
    const feature: Feature = {
      id: 'tapped-1',
      type: FeatureType.TAPPED_HOLE,
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(500, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      parameters: {
        diameter: 20,
        depth: 30,
        threadType: 'metric',
        threadPitch: 2.5,
        threadClass: '6H'
      }
    };

    const result = processor.process(testGeometry, feature, testElement);
    
    expect(result.success).toBe(true);
    expect(result.geometry).toBeDefined();
  });

  test('devrait valider le pas de filetage', () => {
    const feature: Feature = {
      id: 'tapped-2',
      type: FeatureType.TAPPED_HOLE,
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      parameters: {
        diameter: 20,
        threadType: 'metric'
        // Pas de threadPitch
      }
    };

    const errors = processor.validateFeature(feature, testElement);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('CounterSinkProcessor', () => {
  let processor: CounterSinkProcessor;
  let testElement: PivotElement;
  let testGeometry: THREE.BufferGeometry;

  beforeEach(() => {
    processor = new CounterSinkProcessor();
    testElement = createTestElement();
    testGeometry = createTestGeometry();
  });

  afterEach(() => {
    testGeometry.dispose();
    processor.dispose?.();
  });

  test('devrait créer un fraisage', () => {
    const feature: Feature = {
      id: 'countersink-1',
      type: FeatureType.COUNTERSINK,
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(1000, 50, 140),
      rotation: new THREE.Euler(0, 0, 0),
      face: ProfileFace.TOP_FLANGE,
      parameters: {
        diameter: 12,
        sinkDiameter: 24,
        sinkDepth: 6,
        sinkAngle: 90,
        sinkType: 'countersink'
      }
    };

    const result = processor.process(testGeometry, feature, testElement);
    
    expect(result.success).toBe(true);
    expect(result.geometry).toBeDefined();
  });

  test('devrait créer un lamage', () => {
    const feature: Feature = {
      id: 'counterbore-1',
      type: FeatureType.COUNTERBORE,
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(1500, -50, -140),
      rotation: new THREE.Euler(0, 0, 0),
      face: ProfileFace.BOTTOM_FLANGE,
      parameters: {
        diameter: 10,
        sinkDiameter: 20,
        sinkDepth: 5,
        sinkType: 'counterbore'
      }
    };

    const result = processor.process(testGeometry, feature, testElement);
    
    expect(result.success).toBe(true);
    expect(result.geometry).toBeDefined();
  });
});

describe('SlotProcessor', () => {
  let processor: SlotProcessor;
  let testElement: PivotElement;
  let testGeometry: THREE.BufferGeometry;

  beforeEach(() => {
    processor = new SlotProcessor();
    testElement = createTestElement();
    testGeometry = createTestGeometry();
  });

  afterEach(() => {
    testGeometry.dispose();
    processor.dispose?.();
  });

  test('devrait créer un oblong horizontal', () => {
    const feature: Feature = {
      id: 'slot-1',
      type: FeatureType.SLOT,
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(2000, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      parameters: {
        length: 80,
        width: 20,
        depth: -1
      }
    };

    const result = processor.process(testGeometry, feature, testElement);
    
    expect(result.success).toBe(true);
    expect(result.geometry).toBeDefined();
  });

  test('devrait créer un oblong vertical', () => {
    const feature: Feature = {
      id: 'slot-2',
      type: FeatureType.SLOT,
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(2500, 0, 0),
      rotation: new THREE.Euler(0, 0, Math.PI / 2),
      parameters: {
        length: 60,
        width: 15,
        depth: -1
      }
    };

    const result = processor.process(testGeometry, feature, testElement);
    
    expect(result.success).toBe(true);
    expect(result.geometry).toBeDefined();
  });
});

describe('NotchProcessor', () => {
  let processor: NotchProcessor;
  let testElement: PivotElement;
  let testGeometry: THREE.BufferGeometry;

  beforeEach(() => {
    processor = new NotchProcessor();
    testElement = createTestElement();
    testGeometry = createTestGeometry();
  });

  afterEach(() => {
    testGeometry.dispose();
    processor.dispose?.();
  });

  test('devrait créer une entaille rectangulaire', () => {
    const feature: Feature = {
      id: 'notch-1',
      type: FeatureType.NOTCH,
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(5500, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      parameters: {
        notchType: 'rectangular',
        length: 150,
        width: 80
      }
    };

    const result = processor.process(testGeometry, feature, testElement);
    
    expect(result.success).toBe(true);
    expect(result.geometry).toBeDefined();
  });

  test('devrait créer une entaille arrondie', () => {
    const feature: Feature = {
      id: 'notch-2',
      type: FeatureType.NOTCH,
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(5800, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      parameters: {
        notchType: 'rounded',
        length: 100,
        width: 60
      }
    };

    const result = processor.process(testGeometry, feature, testElement);
    
    expect(result.success).toBe(true);
    expect(result.geometry).toBeDefined();
  });
});

describe('DrillPatternProcessor', () => {
  let processor: DrillPatternProcessor;
  let testElement: PivotElement;
  let testGeometry: THREE.BufferGeometry;

  beforeEach(() => {
    processor = new DrillPatternProcessor();
    testElement = createTestElement();
    testGeometry = createTestGeometry();
  });

  afterEach(() => {
    testGeometry.dispose();
    processor.dispose?.();
  });

  test('devrait créer un motif linéaire', () => {
    const feature: Feature = {
      id: 'pattern-linear',
      type: FeatureType.DRILL_PATTERN,
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(1000, -100, 0),
      rotation: new THREE.Euler(0, 0, 0),
      parameters: {
        patternType: 'linear',
        count: 5,
        spacing: 100,
        diameter: 12
      }
    };

    const result = processor.process(testGeometry, feature, testElement);
    
    expect(result.success).toBe(true);
    expect(result.geometry).toBeDefined();
  });

  test('devrait créer un motif circulaire', () => {
    const feature: Feature = {
      id: 'pattern-circular',
      type: FeatureType.DRILL_PATTERN,
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(3000, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      parameters: {
        patternType: 'circular',
        count: 8,
        radius: 80,
        diameter: 10,
        startAngle: 0
      }
    };

    const result = processor.process(testGeometry, feature, testElement);
    
    expect(result.success).toBe(true);
    expect(result.geometry).toBeDefined();
  });

  test('devrait créer un motif rectangulaire', () => {
    const feature: Feature = {
      id: 'pattern-rectangular',
      type: FeatureType.DRILL_PATTERN,
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(4500, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      parameters: {
        patternType: 'rectangular',
        rows: 3,
        columns: 4,
        rowSpacing: 50,
        columnSpacing: 60,
        diameter: 8
      }
    };

    const result = processor.process(testGeometry, feature, testElement);
    
    expect(result.success).toBe(true);
    expect(result.geometry).toBeDefined();
  });
});

describe('CopingProcessor', () => {
  let processor: CopingProcessor;
  let testElement: PivotElement;
  let testGeometry: THREE.BufferGeometry;

  beforeEach(() => {
    processor = new CopingProcessor();
    testElement = createTestElement();
    testGeometry = createTestGeometry();
  });

  afterEach(() => {
    testGeometry.dispose();
    processor.dispose?.();
  });

  test('devrait créer une découpe d\'adaptation pour profil', () => {
    const feature: Feature = {
      id: 'coping-1',
      type: FeatureType.COPING,
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(5900, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      parameters: {
        copingType: 'profile_fit',
        targetProfile: 'HEB200',
        angle: 90,
        clearance: 2
      }
    };

    const result = processor.process(testGeometry, feature, testElement);
    
    expect(result.success).toBe(true);
    expect(result.geometry).toBeDefined();
  });

  test('devrait créer une découpe en selle pour tube', () => {
    const feature: Feature = {
      id: 'coping-2',
      type: FeatureType.COPING,
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(3900, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      parameters: {
        copingType: 'saddle',
        targetProfile: 'CHS150',
        angle: 90,
        clearance: 2
      }
    };

    const result = processor.process(testGeometry, feature, testElement);
    
    expect(result.success).toBe(true);
    expect(result.geometry).toBeDefined();
  });
});

describe('ContourProcessor', () => {
  let processor: ContourProcessor;
  let testElement: PivotElement;
  let testGeometry: THREE.BufferGeometry;

  beforeEach(() => {
    processor = new ContourProcessor();
    testElement = createTestElement();
    testGeometry = createTestGeometry();
  });

  afterEach(() => {
    testGeometry.dispose();
    processor.dispose?.();
  });

  test('devrait créer un contour complexe avec arcs', () => {
    const points = [
      new THREE.Vector2(-200, -150),
      new THREE.Vector2(-100, -150),
      new THREE.Vector2(-100, -50),
      new THREE.Vector2(0, -50),
      new THREE.Vector2(0, 50),
      new THREE.Vector2(100, 50),
      new THREE.Vector2(100, 150),
      new THREE.Vector2(-200, 150)
    ];

    const feature: Feature = {
      id: 'contour-1',
      type: FeatureType.CONTOUR,
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      parameters: {
        points,
        closed: true,
        bulge: [0, 0.5, 0, -0.3, 0, 0, 0.7, 0] // Arcs sur certains segments
      }
    };

    const result = processor.process(testGeometry, feature, testElement);
    
    expect(result.success).toBe(true);
    expect(result.geometry).toBeDefined();
  });

  test('devrait valider les points du contour', () => {
    const feature: Feature = {
      id: 'contour-2',
      type: FeatureType.CONTOUR,
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      parameters: {
        points: [], // Pas de points
        closed: true
      }
    };

    const errors = processor.validateFeature(feature, testElement);
    expect(errors).toContain('Le contour doit avoir au moins 3 points');
  });
});

describe('MarkingProcessor', () => {
  let processor: MarkingProcessor;
  let testElement: PivotElement;
  let testGeometry: THREE.BufferGeometry;

  beforeEach(() => {
    processor = new MarkingProcessor();
    testElement = createTestElement();
    testGeometry = createTestGeometry();
  });

  afterEach(() => {
    testGeometry.dispose();
    processor.dispose?.();
  });

  test('devrait créer un marquage par pointage', () => {
    const feature: Feature = {
      id: 'marking-1',
      type: FeatureType.MARKING,
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(100, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      parameters: {
        markingType: 'center_punch',
        depth: 0.5
      }
    };

    const result = processor.process(testGeometry, feature, testElement);
    
    expect(result.success).toBe(true);
    expect(result.geometry).toBeDefined();
  });

  test('devrait créer un marquage de perçage', () => {
    const feature: Feature = {
      id: 'marking-2',
      type: FeatureType.MARKING,
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(200, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      parameters: {
        markingType: 'drill_point',
        depth: 1
      }
    };

    const result = processor.process(testGeometry, feature, testElement);
    
    expect(result.success).toBe(true);
    expect(result.geometry).toBeDefined();
  });
});

describe('Integration Tests', () => {
  test('devrait appliquer plusieurs features successivement', () => {
    const testElement = createTestElement();
    const testGeometry = createTestGeometry();
    
    // Créer plusieurs processeurs
    const holeProcessor = new HoleProcessor();
    const slotProcessor = new SlotProcessor();
    const notchProcessor = new NotchProcessor();
    
    let currentGeometry = testGeometry;
    
    // Appliquer un trou
    const holeFeature: Feature = {
      id: 'integration-hole',
      type: FeatureType.HOLE,
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(500, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      parameters: { diameter: 20, depth: -1 }
    };
    
    let result = holeProcessor.process(currentGeometry, holeFeature, testElement);
    expect(result.success).toBe(true);
    if (result.geometry) currentGeometry = result.geometry;
    
    // Appliquer un oblong
    const slotFeature: Feature = {
      id: 'integration-slot',
      type: FeatureType.SLOT,
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(1000, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      parameters: { length: 60, width: 20, depth: -1 }
    };
    
    result = slotProcessor.process(currentGeometry, slotFeature, testElement);
    expect(result.success).toBe(true);
    if (result.geometry) currentGeometry = result.geometry;
    
    // Appliquer une entaille
    const notchFeature: Feature = {
      id: 'integration-notch',
      type: FeatureType.NOTCH,
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(5900, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      parameters: { notchType: 'rectangular', length: 100, width: 50 }
    };
    
    result = notchProcessor.process(currentGeometry, notchFeature, testElement);
    expect(result.success).toBe(true);
    expect(result.geometry).toBeDefined();
    
    // Nettoyer
    currentGeometry.dispose();
    holeProcessor.dispose?.();
    slotProcessor.dispose?.();
    notchProcessor.dispose?.();
  });
});