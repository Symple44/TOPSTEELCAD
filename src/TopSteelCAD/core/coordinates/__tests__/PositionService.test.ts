/**
 * Tests unitaires pour le PositionService
 */

import * as THREE from 'three';
import { PositionService } from '../../services/PositionService';
import { StandardFace, PositionContext } from '../types';

describe('PositionService', () => {
  let positionService: PositionService;
  
  beforeEach(() => {
    positionService = PositionService.getInstance();
    positionService.clearCache();
    positionService.setDebugMode(false);
  });
  
  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PositionService.getInstance();
      const instance2 = PositionService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
  
  describe('DSTV Position Conversion', () => {
    const context: PositionContext = {
      profileType: 'I_PROFILE',
      dimensions: {
        length: 2000,
        height: 300,
        width: 150,
        thickness: 10
      },
      face: 'v'
    };
    
    it('should convert DSTV position to standard position', () => {
      const dstvPosition = { x: 1000, y: 150, z: 0 };
      
      const result = positionService.convertPosition(
        dstvPosition,
        'dstv',
        context
      );
      
      expect(result.position).toBeInstanceOf(THREE.Vector3);
      expect(result.position.z).toBe(0); // X DSTV (1000) - length/2 (1000) = 0
      expect(result.position.y).toBe(0); // Y DSTV (150) - height/2 (150) = 0
      expect(result.metadata.source).toBe('dstv');
    });
    
    it('should center the position correctly', () => {
      const dstvPosition = { x: 0, y: 0, z: 0 };
      
      const result = positionService.convertPosition(
        dstvPosition,
        'dstv',
        context
      );
      
      // DSTV origin at corner -> Standard centered
      expect(result.position.z).toBe(-1000); // -length/2
      expect(result.position.y).toBe(-150);  // -height/2
    });
    
    it('should handle different faces correctly', () => {
      // Test Web face
      const webContext = { ...context, face: 'o' };
      const webResult = positionService.convertPosition(
        { x: 1000, y: 150, z: 0 },
        'dstv',
        webContext
      );
      expect(webResult.face).toBe(StandardFace.WEB);
      expect(webResult.position.x).toBe(0); // Web is centered at X=0
      
      // Test Bottom flange face
      const bottomContext = { ...context, face: 'u' };
      const bottomResult = positionService.convertPosition(
        { x: 1000, y: 75, z: 0 },
        'dstv',
        bottomContext
      );
      expect(bottomResult.face).toBe(StandardFace.BOTTOM_FLANGE);
      expect(bottomResult.position.y).toBe(-150); // Bottom flange at -height/2
    });
  });
  
  describe('Face Conversion', () => {
    const context: PositionContext = {
      profileType: 'I_PROFILE',
      dimensions: {
        length: 2000,
        height: 300,
        width: 150
      }
    };
    
    it('should convert DSTV face indicators correctly', () => {
      expect(positionService.convertFace('v', 'dstv', context)).toBe(StandardFace.WEB);
      expect(positionService.convertFace('o', 'dstv', context)).toBe(StandardFace.WEB);
      expect(positionService.convertFace('u', 'dstv', context)).toBe(StandardFace.BOTTOM_FLANGE);
      expect(positionService.convertFace('h', 'dstv', context)).toBe(StandardFace.FRONT);
    });
    
    it('should handle face aliases', () => {
      expect(positionService.convertFace('web', 'dstv', context)).toBe(StandardFace.WEB);
      expect(positionService.convertFace('bottom', 'dstv', context)).toBe(StandardFace.BOTTOM_FLANGE);
    });
  });
  
  describe('Position Validation', () => {
    const context: PositionContext = {
      profileType: 'I_PROFILE',
      dimensions: {
        length: 2000,
        height: 300,
        width: 150
      }
    };
    
    it('should validate positions within bounds', () => {
      const validPosition = { x: 500, y: 100, z: 0 };
      const result = positionService.convertPosition(
        validPosition,
        'dstv',
        context
      );
      
      expect(result).toBeDefined();
      expect(result.position).toBeInstanceOf(THREE.Vector3);
    });
    
    it('should correct positions outside bounds', () => {
      // Position way outside the profile
      const invalidPosition = { x: 5000, y: 1000, z: 0 };
      
      const result = positionService.convertPosition(
        invalidPosition,
        'dstv',
        context
      );
      
      // Should be corrected to within bounds
      expect(Math.abs(result.position.z)).toBeLessThanOrEqual(1000); // Within length/2
      expect(Math.abs(result.position.y)).toBeLessThanOrEqual(450);  // Within height/2 * 1.5
    });
  });
  
  describe('Feature Position Calculation', () => {
    const element = {
      type: 'I_PROFILE',
      dimensions: {
        length: 2000,
        height: 300,
        width: 150,
        thickness: 10
      }
    };
    
    it('should calculate feature position with rotation', () => {
      const featurePosition = { x: 1000, y: 150, z: 0 };
      
      const result = positionService.calculateFeaturePosition(
        element,
        featurePosition,
        'v',
        'dstv'
      );
      
      expect(result.position).toBeInstanceOf(THREE.Vector3);
      expect(result.rotation).toBeInstanceOf(THREE.Euler);
      expect(result.depth).toBeGreaterThan(0);
      expect(result.normal).toBeInstanceOf(THREE.Vector3);
      expect(result.face).toBe(StandardFace.WEB);
    });
    
    it('should apply correct rotation for web face', () => {
      const result = positionService.calculateFeaturePosition(
        element,
        { x: 1000, y: 150, z: 0 },
        'o',
        'dstv'
      );
      
      // Web face should have 90° rotation around Y
      expect(result.rotation.y).toBeCloseTo(Math.PI / 2);
    });
    
    it('should apply no rotation for flange faces', () => {
      const result = positionService.calculateFeaturePosition(
        element,
        { x: 1000, y: 75, z: 0 },
        'u',
        'dstv'
      );
      
      // Flange faces should have no rotation
      expect(result.rotation.x).toBe(0);
      expect(result.rotation.y).toBe(0);
      expect(result.rotation.z).toBe(0);
    });
  });
  
  describe('Caching', () => {
    const context: PositionContext = {
      profileType: 'I_PROFILE',
      dimensions: {
        length: 2000,
        height: 300,
        width: 150
      }
    };
    
    it('should cache converted positions', () => {
      const position = { x: 1000, y: 150, z: 0 };
      
      // First call
      const result1 = positionService.convertPosition(position, 'dstv', context);
      
      // Second call - should come from cache
      const result2 = positionService.convertPosition(position, 'dstv', context);
      
      // Should return the same object reference
      expect(result1).toEqual(result2);
      
      // Check cache statistics
      const stats = positionService.getStatistics();
      expect(stats.cacheSize).toBeGreaterThan(0);
    });
    
    it('should clear cache when requested', () => {
      const position = { x: 1000, y: 150, z: 0 };
      positionService.convertPosition(position, 'dstv', context);
      
      let stats = positionService.getStatistics();
      expect(stats.cacheSize).toBeGreaterThan(0);
      
      positionService.clearCache();
      
      stats = positionService.getStatistics();
      expect(stats.cacheSize).toBe(0);
    });
  });
  
  describe('Statistics and History', () => {
    it('should track statistics', () => {
      const stats = positionService.getStatistics();
      
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('adaptersCount');
      expect(stats).toHaveProperty('adapters');
      expect(stats.adapters).toContain('dstv');
    });
    
    it('should export history', () => {
      const context: PositionContext = {
        profileType: 'I_PROFILE',
        dimensions: { length: 2000, height: 300, width: 150 }
      };
      
      positionService.convertPosition({ x: 1000, y: 150, z: 0 }, 'dstv', context);
      
      const history = positionService.exportHistory();
      expect(history).toBeDefined();
      expect(typeof history).toBe('string');
      
      const parsed = JSON.parse(history);
      expect(parsed).toHaveProperty('dstv');
    });
  });
  
  describe('Round-trip Conversion', () => {
    const context: PositionContext = {
      profileType: 'I_PROFILE',
      dimensions: {
        length: 2000,
        height: 300,
        width: 150
      },
      face: 'v'
    };
    
    it('should convert from DSTV to standard and back', () => {
      const originalDstv = { x: 1000, y: 150, z: 0 };
      
      // Convert to standard
      const standardPos = positionService.convertPosition(
        originalDstv,
        'dstv',
        context
      );
      
      // Convert back to DSTV
      const backToDstv = positionService.convertToPluginFormat(
        standardPos,
        'dstv',
        context
      );
      
      // Should be close to original (within tolerance)
      expect(backToDstv.x).toBeCloseTo(originalDstv.x, 1);
      expect(backToDstv.y).toBeCloseTo(originalDstv.y, 1);
      expect(backToDstv.z).toBeCloseTo(originalDstv.z, 1);
    });
  });
});