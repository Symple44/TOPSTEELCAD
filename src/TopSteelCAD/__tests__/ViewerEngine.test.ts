import { ViewerEngine } from '../core/ViewerEngine';
import { EventBus } from '../core/EventBus';
import { PivotElement, MaterialType } from '@/types/viewer';

describe('ViewerEngine', () => {
  let engine: ViewerEngine;
  let canvas: HTMLCanvasElement;
  let eventBus: EventBus;
  
  beforeEach(() => {
    // Create mock canvas
    canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    
    // Get instances
    engine = ViewerEngine.getInstance();
    eventBus = EventBus.getInstance();
  });
  
  afterEach(() => {
    // Cleanup
    engine.dispose();
    document.body.removeChild(canvas);
  });
  
  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await engine.initialize({
        canvas,
        backgroundColor: '#000000',
        antialias: true,
        shadows: true
      });
      
      expect(engine.isInitialized).toBe(true);
      expect(engine.scene).not.toBeNull();
      expect(engine.camera).not.toBeNull();
    });
    
    it('should not initialize twice', async () => {
      await engine.initialize({ canvas });
      const consoleSpy = jest.spyOn(console, 'warn');
      
      await engine.initialize({ canvas });
      
      expect(consoleSpy).toHaveBeenCalledWith('ViewerEngine already initialized');
      consoleSpy.mockRestore();
    });
  });
  
  describe('Element Management', () => {
    beforeEach(async () => {
      await engine.initialize({ canvas });
    });
    
    it('should add an element', () => {
      const element: PivotElement = {
        id: 'test-beam',
        name: 'Test Beam',
        materialType: MaterialType.BEAM,
        dimensions: {
          length: 1000,
          width: 100,
          height: 200,
          thickness: 10
        },
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        material: {
          grade: 'S355',
          density: 7850,
          color: '#888888',
          opacity: 1,
          metallic: 0.9,
          roughness: 0.4,
          reflectivity: 0.5
        },
        visible: true,
        metadata: {}
      };
      
      engine.addElement(element);
      
      expect(engine.elements.has('test-beam')).toBe(true);
      expect(engine.elements.get('test-beam')).toEqual(element);
    });
    
    it('should remove an element', () => {
      const element: PivotElement = {
        id: 'test-plate',
        name: 'Test Plate',
        materialType: MaterialType.PLATE,
        dimensions: {
          length: 500,
          width: 500,
          thickness: 20,
          height: 20
        },
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        material: {
          grade: 'S235',
          density: 7850,
          color: '#666666',
          opacity: 1,
          metallic: 0.8,
          roughness: 0.5,
          reflectivity: 0.4
        },
        visible: true,
        metadata: {}
      };
      
      engine.addElement(element);
      expect(engine.elements.has('test-plate')).toBe(true);
      
      engine.removeElement('test-plate');
      expect(engine.elements.has('test-plate')).toBe(false);
    });
    
    it('should load multiple elements', () => {
      const elements: PivotElement[] = [
        {
          id: 'beam-1',
          name: 'Beam 1',
          materialType: MaterialType.BEAM,
          dimensions: { length: 1000, width: 100, height: 200, thickness: 10 },
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          material: {
            grade: 'S355',
            density: 7850,
            color: '#888888',
            opacity: 1,
            metallic: 0.9,
            roughness: 0.4,
            reflectivity: 0.5
          },
          visible: true,
          metadata: {}
        },
        {
          id: 'beam-2',
          name: 'Beam 2',
          materialType: MaterialType.BEAM,
          dimensions: { length: 1000, width: 100, height: 200, thickness: 10 },
          position: [1000, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          material: {
            grade: 'S355',
            density: 7850,
            color: '#888888',
            opacity: 1,
            metallic: 0.9,
            roughness: 0.4,
            reflectivity: 0.5
          },
          visible: true,
          metadata: {}
        }
      ];
      
      engine.loadElements(elements);
      
      expect(engine.elements.size).toBe(2);
      expect(engine.elements.has('beam-1')).toBe(true);
      expect(engine.elements.has('beam-2')).toBe(true);
    });
    
    it('should clear all elements', () => {
      const element: PivotElement = {
        id: 'test-element',
        name: 'Test',
        materialType: MaterialType.BEAM,
        dimensions: { length: 1000, width: 100, height: 200, thickness: 10 },
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        material: {
          grade: 'S355',
          density: 7850,
          color: '#888888',
          opacity: 1,
          metallic: 0.9,
          roughness: 0.4,
          reflectivity: 0.5
        },
        visible: true,
        metadata: {}
      };
      
      engine.addElement(element);
      expect(engine.elements.size).toBe(1);
      
      engine.clearElements();
      expect(engine.elements.size).toBe(0);
    });
  });
  
  describe('Selection', () => {
    beforeEach(async () => {
      await engine.initialize({ canvas });
    });
    
    it('should select elements', (done) => {
      const element: PivotElement = {
        id: 'selectable',
        name: 'Selectable',
        materialType: MaterialType.BEAM,
        dimensions: { length: 1000, width: 100, height: 200, thickness: 10 },
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        material: {
          grade: 'S355',
          density: 7850,
          color: '#888888',
          opacity: 1,
          metallic: 0.9,
          roughness: 0.4,
          reflectivity: 0.5
        },
        visible: true,
        metadata: {}
      };
      
      engine.addElement(element);
      
      // Listen for selection event
      eventBus.on('selection:changed', (data: { ids: string[] }) => {
        expect(data.ids).toContain('selectable');
        done();
      });
      
      engine.selectElements(['selectable']);
    });
    
    it('should clear selection', (done) => {
      eventBus.on('selection:changed', (data: { ids: string[] }) => {
        if (data.ids.length === 0) {
          done();
        }
      });
      
      engine.clearSelection();
    });
  });
  
  describe('Rendering', () => {
    beforeEach(async () => {
      await engine.initialize({ canvas });
    });
    
    it('should pause and resume rendering', () => {
      const pauseSpy = jest.fn();
      const resumeSpy = jest.fn();
      
      eventBus.on('rendering:paused', pauseSpy);
      eventBus.on('rendering:resumed', resumeSpy);
      
      engine.pauseRendering();
      expect(pauseSpy).toHaveBeenCalled();
      
      engine.resumeRendering();
      expect(resumeSpy).toHaveBeenCalled();
    });
    
    it('should take a screenshot', () => {
      const screenshot = engine.takeScreenshot();
      
      expect(screenshot).toBeDefined();
      expect(screenshot).toContain('data:image/png');
    });
  });
  
  describe('Performance', () => {
    beforeEach(async () => {
      await engine.initialize({ canvas });
    });
    
    it('should provide FPS stats', () => {
      const stats = engine.stats;
      
      expect(stats).toBeDefined();
      expect(stats.fps).toBeDefined();
      expect(stats.fps).toBeGreaterThanOrEqual(0);
    });
    
    it('should provide render stats', () => {
      const stats = engine.stats;
      
      expect(stats.renderStats).toBeDefined();
      expect(stats.renderStats.drawCalls).toBeDefined();
      expect(stats.renderStats.triangles).toBeDefined();
      expect(stats.renderStats.memory).toBeDefined();
    });
  });
});