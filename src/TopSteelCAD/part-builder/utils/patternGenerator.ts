import { Vector3 } from './Vector3';
import { HolePattern, HolePatternType } from '../types';

export class PatternGenerator {
  static generateHolePositions(
    basePosition: Vector3,
    pattern: HolePattern
  ): Vector3[] {
    switch (pattern.type) {
      case 'SINGLE':
        return [basePosition];

      case 'LINE':
        return this.generateLinePattern(basePosition, pattern);

      case 'GRID':
        return this.generateGridPattern(basePosition, pattern);

      case 'CIRCULAR':
        return this.generateCircularPattern(basePosition, pattern);

      case 'CUSTOM':
        return pattern.customPositions || [basePosition];

      default:
        return [basePosition];
    }
  }

  private static generateLinePattern(
    basePosition: Vector3,
    pattern: HolePattern
  ): Vector3[] {
    const positions: Vector3[] = [];
    const count = pattern.count || 1;
    const spacing = pattern.columnSpacing || 50;

    for (let i = 0; i < count; i++) {
      positions.push(new Vector3(
        basePosition.x + i * spacing,
        basePosition.y,
        basePosition.z
      ));
    }

    return positions;
  }

  private static generateGridPattern(
    basePosition: Vector3,
    pattern: HolePattern
  ): Vector3[] {
    const positions: Vector3[] = [];
    const rows = pattern.rows || 1;
    const columns = pattern.columns || 1;
    const rowSpacing = pattern.rowSpacing || 50;
    const columnSpacing = pattern.columnSpacing || 50;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        positions.push(new Vector3(
          basePosition.x + col * columnSpacing,
          basePosition.y + row * rowSpacing,
          basePosition.z
        ));
      }
    }

    return positions;
  }

  private static generateCircularPattern(
    basePosition: Vector3,
    pattern: HolePattern
  ): Vector3[] {
    const positions: Vector3[] = [];
    const count = pattern.count || 1;
    const radius = pattern.radius || 100;
    const startAngle = pattern.angle || 0;
    const angleStep = 360 / count;

    for (let i = 0; i < count; i++) {
      const angle = (startAngle + i * angleStep) * Math.PI / 180;
      positions.push(new Vector3(
        basePosition.x + radius * Math.cos(angle),
        basePosition.y + radius * Math.sin(angle),
        basePosition.z
      ));
    }

    return positions;
  }

  static generateCommonPatterns() {
    return {
      single: { type: 'SINGLE' as HolePatternType },
      line2: { type: 'LINE' as HolePatternType, count: 2, columnSpacing: 50 },
      line3: { type: 'LINE' as HolePatternType, count: 3, columnSpacing: 50 },
      line4: { type: 'LINE' as HolePatternType, count: 4, columnSpacing: 50 },
      grid2x2: { type: 'GRID' as HolePatternType, rows: 2, columns: 2, rowSpacing: 50, columnSpacing: 50 },
      grid3x2: { type: 'GRID' as HolePatternType, rows: 2, columns: 3, rowSpacing: 50, columnSpacing: 50 },
      grid3x3: { type: 'GRID' as HolePatternType, rows: 3, columns: 3, rowSpacing: 50, columnSpacing: 50 },
      grid4x2: { type: 'GRID' as HolePatternType, rows: 2, columns: 4, rowSpacing: 50, columnSpacing: 50 },
      grid6x1: { type: 'GRID' as HolePatternType, rows: 1, columns: 6, rowSpacing: 50, columnSpacing: 50 },
      grid6x2: { type: 'GRID' as HolePatternType, rows: 2, columns: 6, rowSpacing: 50, columnSpacing: 50 },
      circular4: { type: 'CIRCULAR' as HolePatternType, count: 4, radius: 100 },
      circular6: { type: 'CIRCULAR' as HolePatternType, count: 6, radius: 100 },
      circular8: { type: 'CIRCULAR' as HolePatternType, count: 8, radius: 100 },
    };
  }
}