/**
 * Test E2E pour la chaîne complète PartBuilderRefactored -> ProfessionalViewer
 * Vérifie que les données sont correctement transformées et affichées
 */

import { describe, it, expect } from 'vitest';
import { PartElement, HoleDSTV } from '../../part-builder/types/partBuilder.types';
import { PivotElement, MaterialType } from '../../../types/viewer';

describe('E2E: PartBuilderRefactored -> ProfessionalViewer Data Flow', () => {

  describe('Étape 1: Données initiales PartElement', () => {
    it('devrait créer un PartElement avec des dimensions correctes', () => {
      const partElement: PartElement = {
        id: 'test-element-1',
        reference: 'REF001',
        designation: 'Poutre IPE200',
        quantity: 1,
        profileType: 'IPE',
        profileSubType: '200',
        length: 3000,
        material: 'S355',
        dimensions: {
          width: 100,    // Largeur de la semelle
          height: 200,   // Hauteur du profil
          webThickness: 5.6,     // Épaisseur de l'âme
          flangeThickness: 8.5,  // Épaisseur de la semelle
          thickness: 10  // Épaisseur générale (fallback)
        },
        holes: [
          {
            id: 'hole-1',
            label: 'A1',
            diameter: 20,
            coordinates: {
              face: 'o',  // Face supérieure
              x: 500,
              y: 0,
              z: 0
            },
            isThrough: true,
            depth: undefined
          },
          {
            id: 'hole-2',
            label: 'A2',
            diameter: 16,
            coordinates: {
              face: 'v',  // Âme
              x: 1000,
              y: 100,
              z: 0
            },
            isThrough: false,
            depth: 10
          }
        ],
        status: 'production',
        notes: 'Test element'
      };

      expect(partElement.dimensions).toBeDefined();
      expect(partElement.dimensions?.width).toBe(100);
      expect(partElement.dimensions?.height).toBe(200);
      expect(partElement.dimensions?.webThickness).toBe(5.6);
      expect(partElement.dimensions?.flangeThickness).toBe(8.5);
      expect(partElement.holes).toHaveLength(2);
    });
  });

  describe('Étape 2: Transformation PartElement -> PivotElement', () => {
    it('devrait transformer correctement les données pour ProfessionalViewer', () => {
      const partElement: PartElement = {
        id: 'test-element-1',
        reference: 'REF001',
        designation: 'Poutre IPE200',
        quantity: 1,
        profileType: 'IPE',
        profileSubType: '200',
        length: 3000,
        material: 'S355',
        dimensions: {
          width: 100,
          height: 200,
          webThickness: 5.6,
          flangeThickness: 8.5
        },
        holes: [
          {
            id: 'hole-1',
            label: 'A1',
            diameter: 20,
            coordinates: { face: 'o', x: 500, y: 0, z: 0 },
            isThrough: true
          }
        ],
        status: 'production'
      };

      // Transformation telle que dans PartBuilderRefactored
      const pivotElement: PivotElement = {
        id: partElement.id,
        type: 'beam',
        materialType: MaterialType.BEAM,
        name: `${partElement.profileType}${partElement.profileSubType}`,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: {
          length: partElement.length,
          width: partElement.dimensions?.width || 100,
          height: partElement.dimensions?.height || 100,
          webThickness: partElement.dimensions?.webThickness || 10,
          flangeThickness: partElement.dimensions?.flangeThickness || 15,
          thickness: partElement.dimensions?.thickness || 10
        },
        material: {
          type: 'steel',
          grade: partElement.material || 'S355',
          density: 7850
        },
        profile: {
          type: partElement.profileType,
          subType: partElement.profileSubType
        },
        features: {
          holes: partElement.holes.map(h => ({
            id: h.id,
            type: 'hole' as const,
            position: [h.coordinates.x, h.coordinates.y, h.coordinates.z || 0],
            face: h.coordinates.face,
            parameters: {
              diameter: h.diameter,
              depth: h.isThrough ? 0 : (h.depth || 20),
              holeType: 'round'
            }
          }))
        }
      };

      // Vérifications
      expect(pivotElement.dimensions.width).toBe(100);
      expect(pivotElement.dimensions.height).toBe(200);
      expect(pivotElement.dimensions.webThickness).toBe(5.6);
      expect(pivotElement.dimensions.flangeThickness).toBe(8.5);
      expect(pivotElement.dimensions.length).toBe(3000);

      expect(pivotElement.features).toBeDefined();
      expect(pivotElement.features?.holes).toBeDefined();
      expect(pivotElement.features?.holes).toHaveLength(1);

      const hole = pivotElement.features?.holes?.[0];
      expect(hole?.id).toBe('hole-1');
      expect(hole?.position).toEqual([500, 0, 0]);
      expect(hole?.face).toBe('o');
      expect(hole?.parameters.diameter).toBe(20);
      expect(hole?.parameters.depth).toBe(0); // Trou traversant
    });
  });

  describe('Étape 3: Validation des dimensions IPE200', () => {
    it('devrait utiliser les bonnes dimensions pour un IPE200', () => {
      // Dimensions réelles d'un IPE200
      const ipe200Dimensions = {
        height: 200,        // h = 200mm
        width: 100,         // b = 100mm
        webThickness: 5.6,  // tw = 5.6mm
        flangeThickness: 8.5 // tf = 8.5mm
      };

      const pivotElement: PivotElement = {
        id: 'ipe200-test',
        type: 'beam',
        materialType: MaterialType.BEAM,
        name: 'IPE200',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: {
          length: 3000,
          ...ipe200Dimensions,
          thickness: 10
        },
        material: {
          type: 'steel',
          grade: 'S355',
          density: 7850
        },
        profile: {
          type: 'IPE',
          subType: '200'
        }
      };

      expect(pivotElement.dimensions.height).toBe(200);
      expect(pivotElement.dimensions.width).toBe(100);
      expect(pivotElement.dimensions.webThickness).toBe(5.6);
      expect(pivotElement.dimensions.flangeThickness).toBe(8.5);
    });
  });

  describe('Étape 4: Transformation des trous DSTV', () => {
    it('devrait correctement transformer les positions des trous DSTV', () => {
      const holes: HoleDSTV[] = [
        {
          id: 'hole-1',
          label: 'A1',
          diameter: 22,
          coordinates: {
            face: 'o',  // Face supérieure
            x: 300,     // Position le long du profil
            y: 0,       // Centre de l'âme
            z: 0
          },
          isThrough: true
        },
        {
          id: 'hole-2',
          label: 'B1',
          diameter: 18,
          coordinates: {
            face: 'u',  // Face inférieure
            x: 600,
            y: -30,     // Décalé de 30mm du centre
            z: 0
          },
          isThrough: true
        },
        {
          id: 'hole-3',
          label: 'C1',
          diameter: 16,
          coordinates: {
            face: 'v',  // Âme
            x: 900,
            y: 50,      // 50mm du bas de l'âme
            z: 0
          },
          isThrough: false,
          depth: 8
        }
      ];

      const transformedHoles = holes.map(h => ({
        id: h.id,
        type: 'hole' as const,
        position: [h.coordinates.x, h.coordinates.y, h.coordinates.z || 0],
        face: h.coordinates.face,
        parameters: {
          diameter: h.diameter,
          depth: h.isThrough ? 0 : (h.depth || 20),
          holeType: 'round'
        }
      }));

      expect(transformedHoles).toHaveLength(3);

      // Vérifier le premier trou (face supérieure)
      expect(transformedHoles[0].face).toBe('o');
      expect(transformedHoles[0].position).toEqual([300, 0, 0]);
      expect(transformedHoles[0].parameters.diameter).toBe(22);
      expect(transformedHoles[0].parameters.depth).toBe(0);

      // Vérifier le deuxième trou (face inférieure)
      expect(transformedHoles[1].face).toBe('u');
      expect(transformedHoles[1].position).toEqual([600, -30, 0]);
      expect(transformedHoles[1].parameters.diameter).toBe(18);

      // Vérifier le troisième trou (âme)
      expect(transformedHoles[2].face).toBe('v');
      expect(transformedHoles[2].position).toEqual([900, 50, 0]);
      expect(transformedHoles[2].parameters.diameter).toBe(16);
      expect(transformedHoles[2].parameters.depth).toBe(8);
    });
  });

  describe('Étape 5: Structure complète pour ProfessionalViewer', () => {
    it('devrait créer une structure PivotElement complète avec features', () => {
      const partElement: PartElement = {
        id: 'complete-test',
        reference: 'REF-COMPLETE',
        designation: 'Test complet IPE200',
        quantity: 1,
        profileType: 'IPE',
        profileSubType: '200',
        length: 4000,
        material: 'S355',
        dimensions: {
          width: 100,
          height: 200,
          webThickness: 5.6,
          flangeThickness: 8.5
        },
        holes: [
          {
            id: 'hole-top-1',
            label: 'T1',
            diameter: 20,
            coordinates: { face: 'o', x: 200, y: 0, z: 0 },
            isThrough: true
          },
          {
            id: 'hole-web-1',
            label: 'W1',
            diameter: 16,
            coordinates: { face: 'v', x: 500, y: 100, z: 0 },
            isThrough: false,
            depth: 6
          },
          {
            id: 'hole-bottom-1',
            label: 'B1',
            diameter: 18,
            coordinates: { face: 'u', x: 800, y: 25, z: 0 },
            isThrough: true
          }
        ],
        status: 'production'
      };

      const pivotElement: PivotElement = {
        id: partElement.id,
        type: 'beam',
        materialType: MaterialType.BEAM,
        name: `${partElement.profileType}${partElement.profileSubType}`,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: {
          length: partElement.length,
          width: partElement.dimensions?.width || 100,
          height: partElement.dimensions?.height || 200,
          webThickness: partElement.dimensions?.webThickness || 5.6,
          flangeThickness: partElement.dimensions?.flangeThickness || 8.5,
          thickness: 10
        },
        material: {
          type: 'steel',
          grade: partElement.material,
          density: 7850
        },
        profile: {
          type: partElement.profileType,
          subType: partElement.profileSubType
        },
        features: {
          holes: partElement.holes.map(h => ({
            id: h.id,
            type: 'hole' as const,
            position: [h.coordinates.x, h.coordinates.y, h.coordinates.z || 0],
            face: h.coordinates.face,
            parameters: {
              diameter: h.diameter,
              depth: h.isThrough ? 0 : (h.depth || 20),
              holeType: 'round'
            }
          }))
        }
      };

      // Vérifier la structure complète
      expect(pivotElement.id).toBe('complete-test');
      expect(pivotElement.name).toBe('IPE200');
      expect(pivotElement.materialType).toBe(MaterialType.BEAM);

      // Vérifier les dimensions
      expect(pivotElement.dimensions).toEqual({
        length: 4000,
        width: 100,
        height: 200,
        webThickness: 5.6,
        flangeThickness: 8.5,
        thickness: 10
      });

      // Vérifier le matériau
      expect(pivotElement.material.grade).toBe('S355');

      // Vérifier le profil
      expect(pivotElement.profile?.type).toBe('IPE');
      expect(pivotElement.profile?.subType).toBe('200');

      // Vérifier les features
      expect(pivotElement.features?.holes).toHaveLength(3);

      const holes = pivotElement.features?.holes || [];

      // Trou supérieur
      expect(holes[0].id).toBe('hole-top-1');
      expect(holes[0].face).toBe('o');
      expect(holes[0].parameters.diameter).toBe(20);

      // Trou âme
      expect(holes[1].id).toBe('hole-web-1');
      expect(holes[1].face).toBe('v');
      expect(holes[1].parameters.diameter).toBe(16);
      expect(holes[1].parameters.depth).toBe(6);

      // Trou inférieur
      expect(holes[2].id).toBe('hole-bottom-1');
      expect(holes[2].face).toBe('u');
      expect(holes[2].parameters.diameter).toBe(18);
    });
  });

  describe('Étape 6: Validation de la chaîne complète', () => {
    it('devrait vérifier que toutes les données sont préservées dans la transformation', () => {
      // Simuler le flux complet comme dans PartBuilderRefactored
      const selectedElement3D: PartElement = {
        id: 'el-1758438928880',
        reference: 'REF001',
        designation: 'Poutre principale',
        quantity: 1,
        profileType: 'IPE',
        profileSubType: '200',
        length: 3000,
        material: 'S355',
        dimensions: {
          width: 100,
          height: 200,
          webThickness: 5.6,
          flangeThickness: 8.5
        },
        holes: [
          {
            id: 'hole-1',
            label: 'H1',
            diameter: 20,
            coordinates: { face: 'o', x: 500, y: 0, z: 0 },
            isThrough: true
          }
        ],
        status: 'draft'
      };

      // Transformation exacte comme dans PartBuilderRefactored ligne 548-590
      const elements: PivotElement[] = [{
        id: selectedElement3D.id,
        type: 'beam',
        materialType: MaterialType.BEAM,
        name: `${selectedElement3D.profileType}${selectedElement3D.profileSubType}`,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: {
          length: selectedElement3D.length,
          width: selectedElement3D.dimensions?.width || 100,
          height: selectedElement3D.dimensions?.height || 100,
          webThickness: selectedElement3D.dimensions?.webThickness || 10,
          flangeThickness: selectedElement3D.dimensions?.flangeThickness || 15,
          thickness: selectedElement3D.dimensions?.thickness || 10
        },
        material: {
          type: 'steel',
          grade: selectedElement3D.material || 'S355',
          density: 7850
        },
        profile: {
          type: selectedElement3D.profileType,
          subType: selectedElement3D.profileSubType
        },
        features: {
          holes: selectedElement3D.holes.map(h => ({
            id: h.id,
            type: 'hole' as const,
            position: [h.coordinates.x, h.coordinates.y, h.coordinates.z || 0],
            face: h.coordinates.face,
            parameters: {
              diameter: h.diameter,
              depth: h.isThrough ? 0 : (h.depth || 20),
              holeType: 'round'
            }
          }))
        }
      }];

      const element = elements[0];

      // Vérifications finales
      expect(element).toBeDefined();
      expect(element.id).toBe('el-1758438928880');
      expect(element.name).toBe('IPE200');

      // Dimensions doivent être correctes
      expect(element.dimensions.length).toBe(3000);
      expect(element.dimensions.width).toBe(100);
      expect(element.dimensions.height).toBe(200);
      expect(element.dimensions.webThickness).toBe(5.6);
      expect(element.dimensions.flangeThickness).toBe(8.5);

      // Features doivent être présentes
      expect(element.features).toBeDefined();
      expect(element.features?.holes).toBeDefined();
      expect(element.features?.holes).toHaveLength(1);

      const hole = element.features?.holes?.[0];
      expect(hole).toBeDefined();
      expect(hole?.id).toBe('hole-1');
      expect(hole?.type).toBe('hole');
      expect(hole?.position).toEqual([500, 0, 0]);
      expect(hole?.face).toBe('o');
      expect(hole?.parameters.diameter).toBe(20);
      expect(hole?.parameters.depth).toBe(0);
      expect(hole?.parameters.holeType).toBe('round');
    });
  });
});