/**
 * Tests d'exemple pour le Building Estimator
 * Démontre l'utilisation de l'API
 */

import { describe, it, expect } from 'vitest';
import { BuildingEngine } from '../core/BuildingEngine';
import { FrameCalculator } from '../core/FrameCalculator';
import { NomenclatureBuilder } from '../core/NomenclatureBuilder';
import { defaultMonoPenteTemplate } from '../templates/monopente.template';
import { OpeningType, WallType } from '../types';

describe('Building Estimator - Example Usage', () => {
  it('should create a building from template', () => {
    const building = BuildingEngine.createFromTemplate('default');

    expect(building).toBeDefined();
    expect(building.name).toBe('Bâtiment Monopente Standard');
    expect(building.dimensions.length).toBe(20000);
    expect(building.dimensions.width).toBe(12000);
    expect(building.structure.posts.length).toBeGreaterThan(0);
  });

  it('should create a custom building', () => {
    const building = BuildingEngine.createMonoPenteBuilding({
      name: 'Mon Hangar',
      dimensions: {
        length: 15000,
        width: 10000,
        heightWall: 5000,
        slope: 8
      }
    });

    expect(building.name).toBe('Mon Hangar');
    expect(building.dimensions.length).toBe(15000);
    expect(building.structure).toBeDefined();
  });

  it('should calculate frame correctly', () => {
    const dimensions = {
      length: 20000,
      width: 12000,
      heightWall: 6000,
      slope: 10
    };

    const parameters = {
      postSpacing: 5000,
      purlinSpacing: 1500,
      railSpacing: 1200,
      postProfile: 'IPE 240',
      rafterProfile: 'IPE 200',
      purlinProfile: 'IPE 140',
      railProfile: 'UAP 80',
      steelGrade: 'S235' as const
    };

    const result = FrameCalculator.calculateMonoPenteFrame(
      dimensions,
      parameters
    );

    expect(result.postCount).toBe(5); // 20m / 5m = 4 intervalles + 1
    expect(result.rafterCount).toBe(5);
    expect(result.heightRidge).toBeGreaterThan(dimensions.heightWall);
    expect(result.totalCladdingArea).toBeGreaterThan(0);
    expect(result.totalRoofingArea).toBeGreaterThan(0);
  });

  it('should build nomenclature from building', () => {
    const building = BuildingEngine.createMonoPenteBuilding({
      name: 'Test Building',
      dimensions: {
        length: 20000,
        width: 12000,
        heightWall: 6000,
        slope: 10
      }
    });

    const nomenclature = NomenclatureBuilder.buildFromBuilding(building);

    expect(nomenclature).toBeDefined();
    expect(nomenclature.buildingName).toBe('Test Building');
    expect(nomenclature.sections.mainFrame.items.length).toBeGreaterThan(0);
    expect(nomenclature.totals.totalSteelWeight).toBeGreaterThan(0);
  });

  it('should export nomenclature to CSV', () => {
    const building = BuildingEngine.createFromTemplate('default');
    const nomenclature = NomenclatureBuilder.buildFromBuilding(building);

    const csv = NomenclatureBuilder.exportToCSV(nomenclature);

    expect(csv).toContain('NOMENCLATURE BATIMENT');
    expect(csv).toContain('OSSATURE PRINCIPALE');
    expect(csv).toContain('TOTAUX');
  });

  it('should validate building dimensions', () => {
    const validDimensions = {
      length: 20000,
      width: 12000,
      heightWall: 6000,
      slope: 10
    };

    const validation = FrameCalculator.validateDimensions(validDimensions);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should reject invalid dimensions', () => {
    const invalidDimensions = {
      length: 1000, // trop court
      width: 12000,
      heightWall: 6000,
      slope: 10
    };

    const validation = FrameCalculator.validateDimensions(invalidDimensions);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('should handle openings in calculations', () => {
    const building = BuildingEngine.createMonoPenteBuilding({
      name: 'Building with Openings',
      dimensions: {
        length: 20000,
        width: 12000,
        heightWall: 6000,
        slope: 10
      },
      openings: [
        {
          id: 'door-1',
          type: OpeningType.DOOR,
          wall: WallType.FRONT,
          position: { x: 10000, z: 0 },
          dimensions: { width: 3000, height: 4000 }
        },
        {
          id: 'window-1',
          type: OpeningType.WINDOW,
          wall: WallType.FRONT,
          position: { x: 5000, z: 2000 },
          dimensions: { width: 1500, height: 1200 }
        }
      ]
    });

    const nomenclature = NomenclatureBuilder.buildFromBuilding(building);

    expect(nomenclature.totals.doorCount).toBe(1);
    expect(nomenclature.totals.windowCount).toBe(1);
    expect(nomenclature.totals.totalOpeningArea).toBeGreaterThan(0);
    expect(nomenclature.totals.netCladdingArea).toBeLessThan(
      nomenclature.totals.totalCladdingArea
    );
  });

  it('should calculate steel weight', () => {
    const building = BuildingEngine.createFromTemplate('default');
    const nomenclature = NomenclatureBuilder.buildFromBuilding(building);

    expect(nomenclature.totals.totalSteelWeight).toBeGreaterThan(0);
    expect(nomenclature.totals.mainFrameWeight).toBeGreaterThan(0);
    expect(nomenclature.totals.secondaryFrameWeight).toBeGreaterThan(0);
  });

  it('should update building and regenerate structure', () => {
    const building = BuildingEngine.createFromTemplate('default');
    const originalPostCount = building.structure.posts.length;

    const updated = BuildingEngine.updateBuilding(building, {
      dimensions: {
        ...building.dimensions,
        length: 30000 // Augmenter la longueur
      }
    });

    expect(updated.structure.posts.length).toBeGreaterThan(originalPostCount);
  });

  it('should clone a building', () => {
    const original = BuildingEngine.createFromTemplate('default');
    const clone = BuildingEngine.cloneBuilding(original, 'Copie du bâtiment');

    expect(clone.id).not.toBe(original.id);
    expect(clone.name).toBe('Copie du bâtiment');
    expect(clone.dimensions).toEqual(original.dimensions);
  });
});
