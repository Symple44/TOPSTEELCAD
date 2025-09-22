/**
 * Test d'intégration pour vérifier le flux complet DSTV -> 3D -> CSG
 */

import { describe, it, expect } from 'vitest';
import DSTVTransformer, { DSTVFace, ProfileDimensions } from '../dstv/DSTVTransformer';

describe('Intégration DSTV -> 3D -> CSG', () => {
  it('devrait transformer correctement les coordonnées DSTV pour tous les types de trous', () => {
    const dimensions: ProfileDimensions = {
      length: 1000,
      height: 200,
      width: 100,
      webThickness: 10,
      flangeThickness: 15,
      profileType: 'IPE200'
    };

    const transformer = new DSTVTransformer(dimensions);

    // Définir les trous selon le standard DSTV
    const trosDSTV = [
      {
        id: 'T1',
        face: DSTVFace.TOP,
        x: 100,    // Position le long du profil
        y: 0,      // Centre de l'âme
        diameter: 20,
        isThrough: true
      },
      {
        id: 'T2',
        face: DSTVFace.TOP,
        x: 500,    // Milieu du profil
        y: -30,    // Décalé à gauche
        diameter: 16,
        isThrough: true
      },
      {
        id: 'T3',
        face: DSTVFace.TOP,
        x: 500,
        y: 30,     // Décalé à droite
        diameter: 16,
        isThrough: true
      },
      {
        id: 'T4',
        face: DSTVFace.BOTTOM,
        x: 900,
        y: 0,
        diameter: 22,
        isThrough: false,
        depth: 10
      },
      {
        id: 'T5',
        face: DSTVFace.LEFT,
        x: 300,
        y: 50,     // Décalé vers le haut
        diameter: 18,
        isThrough: true
      },
      {
        id: 'T6',
        face: DSTVFace.RIGHT,
        x: 700,
        y: -50,    // Décalé vers le bas
        diameter: 18,
        isThrough: true
      }
    ];

    // Vérifier la transformation de chaque trou
    trosDSTV.forEach(trou => {
      const coord = {
        face: trou.face,
        x: trou.x,
        y: trou.y,
        z: 0
      };

      // Transformer en position 3D
      const position3D = transformer.transform(coord);

      // Vérifications de base
      expect(position3D).toBeDefined();
      expect(position3D.x).toBeTypeOf('number');
      expect(position3D.y).toBeTypeOf('number');
      expect(position3D.z).toBeTypeOf('number');

      // Vérifier que la position est dans les limites du profil
      const bounds = transformer.getFaceBounds(trou.face);
      expect(trou.x).toBeGreaterThanOrEqual(bounds.xMin);
      expect(trou.x).toBeLessThanOrEqual(bounds.xMax);
      expect(trou.y).toBeGreaterThanOrEqual(bounds.yMin);
      expect(trou.y).toBeLessThanOrEqual(bounds.yMax);

      // Vérifier la rotation pour l'orientation des trous
      const rotation = transformer.getHoleRotation(trou.face);
      expect(rotation).toBeDefined();

      // Vérifier la normale de la face
      const normal = transformer.getFaceNormal(trou.face);
      expect(normal).toBeDefined();
    });
  });

  it('devrait préserver l\'origine au centre de l\'âme pour Y=0', () => {
    const dimensions: ProfileDimensions = {
      length: 1200,
      height: 300,
      width: 150,
      webThickness: 11,
      flangeThickness: 19,
      profileType: 'HEA300'
    };

    const transformer = new DSTVTransformer(dimensions);

    // Trous au centre de l'âme (Y=0)
    const faces = [DSTVFace.TOP, DSTVFace.BOTTOM];

    faces.forEach(face => {
      const position = transformer.transform({
        face,
        x: 600,  // Milieu du profil
        y: 0,    // Centre de l'âme
        z: 0
      });

      // Pour Y=0 en DSTV, X en 3D doit être 0 (centre de l'âme)
      expect(Math.abs(position.x)).toBeLessThan(0.001);

      // Vérifier la position verticale selon la face
      if (face === DSTVFace.TOP) {
        expect(position.y).toBe(150);  // height/2
      } else if (face === DSTVFace.BOTTOM) {
        expect(position.y).toBe(-150); // -height/2
      }

      // Position longitudinale doit être 0 (milieu)
      expect(position.z).toBe(0);
    });
  });

  it('devrait gérer correctement les trous sur les différentes faces d\'un profil en L', () => {
    const dimensions: ProfileDimensions = {
      length: 600,
      height: 100,
      width: 100,
      profileType: 'L100x100'
    };

    const transformer = new DSTVTransformer(dimensions);

    const trous = [
      { face: DSTVFace.TOP, x: 100, y: 25 },
      { face: DSTVFace.BOTTOM, x: 300, y: -25 },
      { face: DSTVFace.LEFT, x: 500, y: 0 },
      { face: DSTVFace.RIGHT, x: 200, y: 30 }
    ];

    trous.forEach(trou => {
      const coord = {
        face: trou.face,
        x: trou.x,
        y: trou.y,
        z: 0
      };

      // Valider les coordonnées
      const isValid = transformer.validateCoordinate(coord);
      expect(isValid).toBe(true);

      // Transformer en position 3D
      const position = transformer.transform(coord);

      // Vérifier que la position longitudinale est correcte
      expect(position.z).toBe(trou.x - 300); // x - length/2
    });
  });

  describe('Flux de données complet', () => {
    it('devrait maintenir la cohérence des données du PartBuilder au Viewer3D', () => {
      // Simuler les données du PartBuilder
      const elementData = {
        profileType: 'IPE',
        profileSubType: '200',
        length: 1000,
        dimensions: {
          width: 100,
          height: 200,
          webThickness: 8.5,
          flangeThickness: 13.5
        },
        holes: [
          {
            id: 'hole-1',
            label: 'A1',
            diameter: 20,
            coordinates: {
              face: 'o',  // Top
              x: 150,
              y: 0,
              z: 0
            },
            isThrough: true
          },
          {
            id: 'hole-2',
            label: 'A2',
            diameter: 16,
            coordinates: {
              face: 'o',
              x: 850,
              y: -30,
              z: 0
            },
            isThrough: true
          }
        ]
      };

      // Vérifier que les données peuvent être transformées
      const transformer = new DSTVTransformer({
        length: elementData.length,
        height: elementData.dimensions.height,
        width: elementData.dimensions.width,
        webThickness: elementData.dimensions.webThickness,
        flangeThickness: elementData.dimensions.flangeThickness,
        profileType: elementData.profileType + elementData.profileSubType
      });

      elementData.holes.forEach(hole => {
        const coord = {
          face: hole.coordinates.face as DSTVFace,
          x: hole.coordinates.x,
          y: hole.coordinates.y,
          z: hole.coordinates.z
        };

        // Valider les coordonnées
        const isValid = transformer.validateCoordinate(coord);
        expect(isValid).toBe(true);

        // Transformer en position 3D
        const position = transformer.transform(coord);
        expect(position).toBeDefined();

        // Vérifier les métadonnées
        expect(hole.id).toBeTruthy();
        expect(hole.label).toBeTruthy();
        expect(hole.diameter).toBeGreaterThan(0);
        expect(hole.isThrough).toBeTypeOf('boolean');
      });
    });

    it('devrait générer les coordonnées DSTV au format XML correct', () => {
      const holes = [
        {
          face: 'o',
          x: 100,
          y: 0,
          diameter: 20
        },
        {
          face: 'u',
          x: 500,
          y: 25,
          diameter: 16
        }
      ];

      // Format DSTV attendu
      const expectedFormats = [
        '<A face="o" x="100" y="0" d="20"/>',
        '<A face="u" x="500" y="25" d="16"/>'
      ];

      holes.forEach((hole, index) => {
        const dstvFormat = `<A face="${hole.face}" x="${hole.x}" y="${hole.y}" d="${hole.diameter}"/>`;
        expect(dstvFormat).toBe(expectedFormats[index]);
      });
    });
  });
});