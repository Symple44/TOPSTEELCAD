/**
 * index.test.ts - Tests d'intégration pour tous les handlers
 * Vérifie que tous les handlers peuvent être importés et instanciés
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExteriorCutHandler } from '../../handlers/ExteriorCutHandler';
import { PlateHandler } from '../../handlers/PlateHandler';
import { KontourHandler } from '../../handlers/KontourHandler';
import { CutType } from '../../types/CutTypes';

// Mock minimal pour éviter les erreurs d'import
vi.mock('three', () => ({}));
vi.mock('../../services/GeometryCreationService', () => ({
  getGeometryService: () => ({}),
}));
vi.mock('../../services/CSGOperationService', () => ({
  getCSGService: () => ({}),
}));

describe('Handlers Integration Tests', () => {
  let exteriorHandler: ExteriorCutHandler;
  let plateHandler: PlateHandler;
  let kontourHandler: KontourHandler;

  beforeEach(() => {
    exteriorHandler = new ExteriorCutHandler();
    plateHandler = new PlateHandler();
    kontourHandler = new KontourHandler();
  });

  describe('Handler Instantiation', () => {
    it('should instantiate all handlers successfully', () => {
      expect(exteriorHandler).toBeInstanceOf(ExteriorCutHandler);
      expect(plateHandler).toBeInstanceOf(PlateHandler);
      expect(kontourHandler).toBeInstanceOf(KontourHandler);
    });

    it('should have correct handler names', () => {
      expect(exteriorHandler.name).toBe('ExteriorCutHandler');
      expect(plateHandler.name).toBe('PlateHandler');
      expect(kontourHandler.name).toBe('KontourHandler');
    });

    it('should have unique priorities', () => {
      const priorities = [
        exteriorHandler.priority,
        plateHandler.priority,
        kontourHandler.priority,
      ];
      
      const uniquePriorities = new Set(priorities);
      expect(uniquePriorities.size).toBe(priorities.length);
    });
  });

  describe('Handler Capabilities', () => {
    it('should have distinct supported types', () => {
      const exteriorTypes = exteriorHandler.supportedTypes;
      const plateTypes = plateHandler.supportedTypes;
      const kontourTypes = kontourHandler.supportedTypes;

      expect(exteriorTypes).toContain(CutType.EXTERIOR_CUT);
      expect(plateTypes).toContain(CutType.CONTOUR_CUT);
      expect(kontourTypes).toContain(CutType.UNRESTRICTED_CONTOUR);
    });

    it('should implement required interface methods', () => {
      const handlers = [exteriorHandler, plateHandler, kontourHandler];

      handlers.forEach(handler => {
        expect(handler).toHaveProperty('canHandle');
        expect(handler).toHaveProperty('validate');
        expect(handler).toHaveProperty('createCutGeometry');
        expect(handler).toHaveProperty('generateMetadata');
        expect(typeof handler.canHandle).toBe('function');
        expect(typeof handler.validate).toBe('function');
        expect(typeof handler.createCutGeometry).toBe('function');
        expect(typeof handler.generateMetadata).toBe('function');
      });
    });
  });

  describe('Priority Ordering', () => {
    it('should have correct priority order for handler selection', () => {
      // KontourHandler (68) > PlateHandler (65) > ExteriorCutHandler (70)
      // Wait, ExteriorCutHandler has higher priority (70)
      expect(exteriorHandler.priority).toBe(70);
      expect(kontourHandler.priority).toBe(68);
      expect(plateHandler.priority).toBe(65);

      // Higher priority number means higher priority
      expect(exteriorHandler.priority).toBeGreaterThan(kontourHandler.priority);
      expect(kontourHandler.priority).toBeGreaterThan(plateHandler.priority);
    });
  });

  describe('Type Coverage', () => {
    it('should cover all major cut types between handlers', () => {
      const allSupportedTypes = [
        ...exteriorHandler.supportedTypes,
        ...plateHandler.supportedTypes,
        ...kontourHandler.supportedTypes,
      ];

      const uniqueTypes = new Set(allSupportedTypes);
      
      // Vérifier que les types principaux sont couverts
      expect(uniqueTypes).toContain(CutType.EXTERIOR_CUT);
      expect(uniqueTypes).toContain(CutType.CONTOUR_CUT);
      expect(uniqueTypes).toContain(CutType.THROUGH_CUT);
      expect(uniqueTypes).toContain(CutType.PARTIAL_CUT);
      expect(uniqueTypes).toContain(CutType.UNRESTRICTED_CONTOUR);
      expect(uniqueTypes).toContain(CutType.COPING_CUT);
      expect(uniqueTypes).toContain(CutType.INTERIOR_CUT);
    });
  });
});