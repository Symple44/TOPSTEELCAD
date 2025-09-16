'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { PivotElement, MaterialType } from '../types/viewer';
import { 
  Loader2, EyeOff,
  Layers, Info, 
  ChevronLeft, ChevronRight, Sun, Moon
} from 'lucide-react';
import { ViewerEngine } from './core/ViewerEngine';
import { EventBus } from './core/EventBus';
import { SimpleMeasurementTool } from './tools/SimpleMeasurementTool';
import { Toolbar } from './components/toolbar';
import { FileImporter, ImportResult } from './utils/FileImporter';
import { FileExporter, ExportFormat } from './utils/FileExporter';
import { SelectionManager } from './selection/SelectionManager';
import { FeatureOutlineRenderer } from './viewer/FeatureOutlineRenderer';
import { ViewCube } from './ui/ViewCube';

/**
 * ProfessionalViewer - Mode professionnel basé sur le Standard avec ajouts pro
 * Reprend toute la base du StandardViewer (TopSteelCAD) + hiérarchie + barre d'outils
 */
interface ProfessionalViewerProps {
  elements?: PivotElement[];
  selectedElementIds?: string[];
  onElementSelect?: (ids: string[]) => void;
  onElementChange?: (element: PivotElement) => void;
  onThemeChange?: (theme: 'light' | 'dark') => void;
  theme?: 'light' | 'dark';
  className?: string;
}

export const ProfessionalViewer: React.FC<ProfessionalViewerProps> = ({
  elements: initialElements = [],
  selectedElementIds,
  onElementSelect,
  onElementChange,
  onThemeChange,
  theme = 'dark',
  className: _className = ''
}) => {
  // Références essentielles (comme dans Standard)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ViewerEngine | null>(null);
  const eventBusRef = useRef<EventBus | null>(null);
  const measurementToolRef = useRef<SimpleMeasurementTool | null>(null);
  const selectionManagerRef = useRef<SelectionManager | null>(null);
  const featureRendererRef = useRef<FeatureOutlineRenderer | null>(null);
  const cameraControllerRef = useRef<any>(null);
  
  // États de base (comme dans Standard)
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedElementIds || []);
  const [selectedFeatures, setSelectedFeatures] = useState<Array<{elementId: string; featureId: string}>>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<{elementId: string; featureId: string} | null>(null);
  const [isEngineReady, setIsEngineReady] = useState(false);
  // Feature selection is now always enabled
  const featureSelectionEnabled = true;
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set());
  const elementsAddedRef = useRef(false);
  
  // État local pour stocker tous les éléments (initiaux + importés)
  const [allElements, setAllElements] = useState<PivotElement[]>(initialElements);
  const [updateKey, setUpdateKey] = useState(0); // Clé pour forcer le re-render
  
  // Synchroniser allElements avec initialElements SEULEMENT au montage initial
  useEffect(() => {
    console.log('🔄 Initialisation avec initialElements:', initialElements.length);
    if (initialElements.length > 0) {
      setAllElements(initialElements);
    }
  }, []); // Pas de dépendance sur initialElements pour éviter d'écraser les imports
  
  // Déboguer les changements de allElements
  useEffect(() => {
    console.log('📊 allElements a changé:', allElements.length, 'éléments');
    console.log('📊 Contenu:', allElements);
  }, [allElements]);
  
  // États des outils professionnels
  const [measurementMode, setMeasurementMode] = useState(false);
  const [isolateMode, setIsolateMode] = useState(false);
  const [isOrthographic, setIsOrthographic] = useState(false);
  
  // États des panneaux
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  // Synchronisation des props de sélection
  useEffect(() => {
    if (selectedElementIds !== undefined && JSON.stringify(selectedElementIds) !== JSON.stringify(selectedIds)) {
      setSelectedIds(selectedElementIds);
      if (engineRef.current) {
        updateSelectionVisuals(selectedElementIds);
      }
    }
  }, [selectedElementIds]);

  // === FONCTIONS UTILITAIRES (reprises du Standard) ===
  
  const calculateSceneBounds = () => {
    if (!engineRef.current || allElements.length === 0) {
      return { size: 10000, center: new THREE.Vector3(0, 0, 0), minY: 0 };
    }

    const bounds = new THREE.Box3();
    
    allElements.forEach(element => {
      // Vérifier que l'élément a des dimensions et une position
      if (!element.dimensions || !element.position) {
        return;
      }
      
      const pos = new THREE.Vector3(element.position[0], element.position[1], element.position[2]);
      const size = new THREE.Vector3(
        element.dimensions.length || element.dimensions.width || 100, 
        element.dimensions.height || element.dimensions.thickness || 100,
        element.dimensions.width || element.dimensions.length || 100
      );
      
      bounds.expandByPoint(pos.clone().sub(size.clone().multiplyScalar(0.5)));
      bounds.expandByPoint(pos.clone().add(size.clone().multiplyScalar(0.5)));
    });

    if (bounds.isEmpty()) {
      return { size: 10000, center: new THREE.Vector3(0, 0, 0), minY: 0 };
    }

    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const minY = bounds.min.y;
    
    let gridSize: number;
    if (maxDim <= 1000) {
      gridSize = Math.ceil((maxDim * 1.2) / 500) * 500;
    } else if (maxDim <= 5000) {
      gridSize = Math.ceil((maxDim * 1.2) / 1000) * 1000;
    } else {
      gridSize = Math.ceil((maxDim * 1.15) / 2000) * 2000;
    }
    
    return { size: Math.max(gridSize, 1000), center, minY };
  };

  const createAdaptiveGrid = (isDark: boolean = false) => {
    const { size, minY } = calculateSceneBounds();
    const divisions = size / 100;

    const colorMain = isDark ? '#4b5563' : '#d1d5db';
    const colorCenter = isDark ? '#374151' : '#e5e7eb';
    
    const grid = new THREE.GridHelper(size, Math.floor(divisions), colorMain, colorCenter);
    grid.name = 'AdaptiveGrid';
    grid.position.y = minY - 10;
    
    const gridMaterial = grid.material as THREE.LineBasicMaterial;
    gridMaterial.opacity = isDark ? 0.3 : 0.4;
    gridMaterial.transparent = true;
    gridMaterial.linewidth = 1;
    gridMaterial.depthWrite = false;
    gridMaterial.depthTest = true;
    
    return grid;
  };

  const updateAdaptiveGrid = (isDark: boolean = false) => {
    if (!engineRef.current) return;
    
    const scene = engineRef.current.getScene();
    if (!scene) return;
    
    const gridsToRemove: THREE.Object3D[] = [];
    scene.traverse((child) => {
      if (child instanceof THREE.GridHelper) {
        gridsToRemove.push(child);
      }
    });
    
    gridsToRemove.forEach(grid => {
      scene.remove(grid);
    });
    
    const newGrid = createAdaptiveGrid(isDark);
    scene.add(newGrid);
  };

  // === INITIALISATION DU MOTEUR (comme Standard) ===
  
  useEffect(() => {
    if (canvasRef.current && containerRef.current && !engineRef.current) {
      try {
        // Utiliser le singleton EventBus pour partager avec ViewerEngine
        eventBusRef.current = EventBus.getInstance();
        
        // Initialiser le SelectionManager et FeatureOutlineRenderer
        selectionManagerRef.current = new SelectionManager(eventBusRef.current, {
          mode: 'multiple' as any,
          highlightColor: '#ff6600',
          highlightOpacity: 0.3,
          enableHover: true,
          hoverColor: '#ffaa00',
          // Feature selection is now always enabled
          featureHighlightColor: '#00ff66',
          featureHighlightOpacity: 0.5
        });
        
        // Ne pas créer une nouvelle instance, utiliser celle du SceneManager
        // qui est créée automatiquement lors de l'initialisation
        // featureRendererRef.current sera défini après l'initialisation de l'engine
        
        const initEngine = async () => {
          engineRef.current = new ViewerEngine();
          
          await engineRef.current.initialize({
            canvas: canvasRef.current!,
            antialias: true,
            shadows: false,
            backgroundColor: theme === 'dark' ? '#1f2937' : '#e6f2ff',
            maxFPS: 60,
            logarithmicDepthBuffer: true,
            precision: 'highp',
            powerPreference: 'high-performance'
          });
          
          // Récupérer le FeatureOutlineRenderer depuis le SceneManager
          const sceneManager = (engineRef.current as any).sceneManager;
          if (sceneManager && sceneManager.featureOutlineRenderer) {
            featureRendererRef.current = sceneManager.featureOutlineRenderer;
            console.log('✅ Using FeatureOutlineRenderer from SceneManager');
          } else {
            console.warn('⚠️ Could not get FeatureOutlineRenderer from SceneManager');
          }
          
          // Récupérer le CameraController pour le ViewCube
          cameraControllerRef.current = engineRef.current.getCameraController();
          
          if (canvasRef.current) {
            (canvasRef.current as any).__renderer = engineRef.current.getRenderer();
            (canvasRef.current as any).__scene = engineRef.current.getScene();
            (canvasRef.current as any).__camera = engineRef.current.getCamera();
          }
          
          if (containerRef.current && canvasRef.current) {
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;
            engineRef.current.handleResize(width, height);
          }
          
          setIsEngineReady(true);
          
          const scene = engineRef.current.getScene();
          if (scene) {
            const bgColor = theme === 'dark' ? '#1f2937' : '#e6f2ff';
            scene.background = new THREE.Color(bgColor);
            scene.fog = null;
            
            const controlsManager = engineRef.current?.getControlsManager();
            if (controlsManager) {
              const { size: sceneSize } = calculateSceneBounds();
              controlsManager.updateZoomLimits(sceneSize);
            }
            
            // Éclairage CAD
            const ambientLight = new THREE.AmbientLight('#ffffff', 0.8);
            scene.add(ambientLight);
            
            const mainLight = new THREE.DirectionalLight('#ffffff', 0.5);
            mainLight.position.set(1, 1, 1);
            mainLight.castShadow = false;
            scene.add(mainLight);
            
            const fillLight = new THREE.DirectionalLight('#ffffff', 0.3);
            fillLight.position.set(-1, 0.5, -1);
            scene.add(fillLight);
            
            setTimeout(() => {
              updateAdaptiveGrid(theme === 'dark');
            }, 50);
            
            // Axes
            const axesHelper = new THREE.AxesHelper(1500);
            const axesMaterials = (axesHelper as any).material as THREE.LineBasicMaterial[];
            if (axesMaterials && axesMaterials.length >= 3) {
              axesMaterials[0].color = new THREE.Color('#dc2626'); // Rouge pour X
              axesMaterials[1].color = new THREE.Color('#16a34a'); // Vert pour Y
              axesMaterials[2].color = new THREE.Color('#2563eb'); // Bleu pour Z
              axesMaterials.forEach(mat => {
                mat.opacity = 0.9;
                mat.linewidth = 2;
              });
            }
            axesHelper.name = 'Axes';
            scene.add(axesHelper);
            
            // Ajouter des labels pour les axes
            // Créer des sprites pour les labels (plus simple que le texte 3D)
            const createAxisLabel = (text: string, position: THREE.Vector3, color: string) => {
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              if (!context) return null;
              
              canvas.width = 256;
              canvas.height = 128;
              
              context.fillStyle = color;
              context.font = 'bold 72px Arial';
              context.textAlign = 'center';
              context.textBaseline = 'middle';
              context.fillText(text, 128, 64);
              
              const texture = new THREE.CanvasTexture(canvas);
              const spriteMaterial = new THREE.SpriteMaterial({ 
                map: texture,
                transparent: true,
                depthTest: false,
                depthWrite: false
              });
              
              const sprite = new THREE.Sprite(spriteMaterial);
              sprite.position.copy(position);
              sprite.scale.set(100, 50, 1);
              sprite.name = `AxisLabel_${text}`;
              
              return sprite;
            };
            
            // Ajouter les labels aux extrémités des axes
            const xLabel = createAxisLabel('X', new THREE.Vector3(1600, 0, 0), '#dc2626');
            const yLabel = createAxisLabel('Y', new THREE.Vector3(0, 1600, 0), '#16a34a');
            const zLabel = createAxisLabel('Z', new THREE.Vector3(0, 0, 1600), '#2563eb');
            
            if (xLabel) scene.add(xLabel);
            if (yLabel) scene.add(yLabel);
            if (zLabel) scene.add(zLabel);
            
            // Ajouter des indicateurs de coordonnées à intervalles réguliers
            const addCoordinateMarkers = () => {
              const intervals = [500, 1000];
              
              intervals.forEach(distance => {
                // Marqueurs sur l'axe X (rouge)
                [-distance, distance].forEach(x => {
                  const markerX = createAxisLabel(`${x}`, new THREE.Vector3(x, -50, 0), '#dc2626');
                  if (markerX) {
                    markerX.scale.set(60, 30, 1);
                    scene.add(markerX);
                  }
                });
                
                // Marqueurs sur l'axe Y (vert)
                [-distance, distance].forEach(y => {
                  const markerY = createAxisLabel(`${y}`, new THREE.Vector3(-50, y, 0), '#16a34a');
                  if (markerY) {
                    markerY.scale.set(60, 30, 1);
                    scene.add(markerY);
                  }
                });
                
                // Marqueurs sur l'axe Z (bleu)
                [-distance, distance].forEach(z => {
                  const markerZ = createAxisLabel(`${z}`, new THREE.Vector3(0, -50, z), '#2563eb');
                  if (markerZ) {
                    markerZ.scale.set(60, 30, 1);
                    scene.add(markerZ);
                  }
                });
              });
            };
            
            addCoordinateMarkers();
            
            // Plan de référence
            const { minY: planeY } = calculateSceneBounds();
            const workplaneGeometry = new THREE.PlaneGeometry(30000, 30000, 1, 1);
            const workplaneMaterial = new THREE.MeshBasicMaterial({ 
              color: '#cce7ff',
              transparent: true,
              opacity: 0.02,
              side: THREE.DoubleSide
            });
            const workplane = new THREE.Mesh(workplaneGeometry, workplaneMaterial);
            workplane.rotation.x = -Math.PI / 2;
            workplane.position.y = planeY - 10;
            workplane.name = 'Workplane';
            scene.add(workplane);
          }
          
          const camera = engineRef.current.getCamera();
          if (camera) {
            camera.position.set(3000, 3000, 3000);
            camera.lookAt(0, 0, 0);
            
            // Vérifier et corriger les contrôles de caméra
            const controlsManager = engineRef.current.getControlsManager();
            if (controlsManager) {
              const controls = controlsManager.getOrbitControls();
              if (controls) {
                controls.enabled = true;
                controls.update();
                console.log('🎮 Contrôles de caméra activés');
              } else {
                console.warn('⚠️ OrbitControls non trouvés');
              }
            }
            
            // Initialiser l'outil de mesure
            if (scene && canvasRef.current) {
              measurementToolRef.current = new SimpleMeasurementTool(scene, camera, canvasRef.current);
            }
            
            // Configurer les événements de sélection de features
            setupFeatureSelectionEvents();
          }
        };
        
        initEngine();
      } catch (err) {
        setError('Erreur lors de l\'initialisation du viewer professionnel');
      }
    }
    
    return () => {
      if (measurementToolRef.current) {
        measurementToolRef.current.dispose();
        measurementToolRef.current = null;
      }
      if (selectionManagerRef.current) {
        selectionManagerRef.current.dispose();
        selectionManagerRef.current = null;
      }
      // Ne pas disposer le FeatureOutlineRenderer car il appartient au SceneManager
      if (featureRendererRef.current) {
        // Juste nettoyer la référence
        featureRendererRef.current = null;
      }
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
      if (eventBusRef.current) {
        eventBusRef.current.removeAllListeners();
        eventBusRef.current = null;
      }
    };
  }, []);

  // === GESTION DE LA SÉLECTION (comme Standard) ===
  
  useEffect(() => {
    if (engineRef.current && canvasRef.current && eventBusRef.current) {
      const cleanup = setupSelectionEvents();
      return cleanup;
    }
  }, [selectedIds]);

  // Fonction pour configurer les événements de sélection de features
  const setupFeatureSelectionEvents = () => {
    if (!eventBusRef.current || !selectionManagerRef.current) return;
    
    const eventBus = eventBusRef.current;
    
    // Écouter les changements de sélection de features
    eventBus.on('feature:selection:changed', (data: { features: Array<{elementId: string; featureId: string}> }) => {
      setSelectedFeatures(data.features);
      console.log('🎯 Features sélectionnées:', data.features);
    });
    
    // Écouter les changements de survol de features
    eventBus.on('feature:hover:changed', (data: {elementId: string; featureId: string} | null) => {
      setHoveredFeature(data);
    });
    
    // Feature selection is now always enabled - removed event listener
  };
  
  const setupSelectionEvents = () => {
    if (!canvasRef.current || !eventBusRef.current) return;
    
    const canvas = canvasRef.current;
    const eventBus = eventBusRef.current;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    
    let isMouseDown = false;
    let mouseDownTime = 0;
    let mouseDownPos = { x: 0, y: 0 };
    let hasMoved = false;
    
    const handleMouseDown = (event: MouseEvent) => {
      isMouseDown = true;
      mouseDownTime = Date.now();
      mouseDownPos = { x: event.clientX, y: event.clientY };
      hasMoved = false;
    };
    
    const handleMouseMoveCombi = (event: MouseEvent) => {
      if (isMouseDown) {
        const deltaX = Math.abs(event.clientX - mouseDownPos.x);
        const deltaY = Math.abs(event.clientY - mouseDownPos.y);
        if (deltaX > 3 || deltaY > 3) {
          hasMoved = true;
        }
      }
      
      if (!isMouseDown && !measurementMode && engineRef.current) {
        const rect = canvas.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        const camera = engineRef.current.getCamera();
        const scene = engineRef.current.getScene();
        
        if (camera && scene) {
          raycaster.setFromCamera(pointer, camera);
          
          const meshes: THREE.Mesh[] = [];
          scene.traverse((child) => {
            if (child instanceof THREE.Mesh && child.userData.elementId) {
              meshes.push(child);
            }
          });
          
          const intersects = raycaster.intersectObjects(meshes, false);
          
          if (intersects.length > 0) {
            const hoveredObject = intersects[0].object;
            const elementId = hoveredObject.userData.elementId;
            
            if (elementId !== hoveredId) {
              setHoveredId(elementId);
              canvas.style.cursor = 'pointer';
              eventBus.emit('hover:changed', { id: elementId });
            }
          } else {
            if (hoveredId) {
              setHoveredId(null);
              canvas.style.cursor = 'default';
              eventBus.emit('hover:changed', { id: null });
            }
          }
        }
      }
    };
    
    const handleMouseUp = (event: MouseEvent) => {
      if (!isMouseDown) return;
      
      isMouseDown = false;
      const clickDuration = Date.now() - mouseDownTime;
      
      if (!hasMoved && clickDuration < 200 && event.button === 0) {
        handleSelection(event);
      }
    };
    
    const handleMouseMove = (event: MouseEvent) => {
      if (!engineRef.current) return;
      
      // Si en mode mesure, utiliser l'outil de mesure pour le snap
      if (measurementMode && measurementToolRef.current) {
        measurementToolRef.current.handleMouseMove(event);
      }
    };
    
    const handleSelection = (event: MouseEvent) => {
      if (!engineRef.current) return;
      
      // Si en mode mesure, utiliser l'outil de mesure
      if (measurementMode && measurementToolRef.current) {
        const handled = measurementToolRef.current.handleClick(event);
        if (handled) return;
      }
      
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      const camera = engineRef.current.getCamera();
      const scene = engineRef.current.getScene();
      
      if (camera && scene) {
        raycaster.setFromCamera(pointer, camera);
        
        const meshes: THREE.Mesh[] = [];
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh && child.userData.elementId) {
            meshes.push(child);
          }
        });
        
        const intersects = raycaster.intersectObjects(meshes, false);
        
        if (intersects.length > 0) {
          const clickedObject = intersects[0].object;
          const elementId = clickedObject.userData.elementId;
          
          if (elementId) {
            let newSelection: string[];
            if (event.ctrlKey || event.metaKey) {
              newSelection = selectedIds.includes(elementId)
                ? selectedIds.filter(id => id !== elementId)
                : [...selectedIds, elementId];
            } else {
              newSelection = [elementId];
              updateOrbitTarget(clickedObject.position);
            }
            
            setSelectedIds(newSelection);
            onElementSelect?.(newSelection);
            eventBus.emit('selection:changed', { ids: newSelection });
            updateSelectionVisuals(newSelection);
          }
        } else {
          if (!event.ctrlKey && !event.metaKey) {
            setSelectedIds([]);
            onElementSelect?.([]);
            eventBus.emit('selection:changed', { ids: [] });
            updateOrbitTarget(new THREE.Vector3(0, 0, 0));
            updateSelectionVisuals([]);
          }
        }
      }
    };
    
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key.toLowerCase()) {
        case 'escape':
          event.preventDefault();
          if (measurementMode) {
            setMeasurementMode(false);
            canvas.style.cursor = 'default';
          } else {
            setSelectedIds([]);
            onElementSelect?.([]);
            eventBusRef.current?.emit('selection:changed', { ids: [] });
            updateSelectionVisuals([]);
            updateOrbitTarget(new THREE.Vector3(0, 0, 0));
          }
          break;
          
        case 'm': {
          event.preventDefault();
          const newMeasureMode = !measurementMode;
          setMeasurementMode(newMeasureMode);
          if (measurementToolRef.current) {
            measurementToolRef.current.setActive(newMeasureMode);
          }
          canvas.style.cursor = newMeasureMode ? 'crosshair' : 'default';
          console.log(`📏 Mode mesure: ${newMeasureMode ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
          break;
        }
          
        case 'c':
          // Effacer toutes les mesures avec Ctrl+C
          if ((event.ctrlKey || event.metaKey) && measurementToolRef.current) {
            event.preventDefault();
            measurementToolRef.current.clearAllMeasurements();
            console.log('🗑️ Mesures effacées');
          }
          break;
          
        case 'a':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            const allIds = allElements.map(e => e.id);
            setSelectedIds(allIds);
            onElementSelect?.(allIds);
            eventBusRef.current?.emit('selection:changed', { ids: allIds });
            updateSelectionVisuals(allIds);
          }
          break;
          
        case 'f':
          // Feature selection is now always enabled - just focus on selection
          if (selectedIds.length > 0 || selectedFeatures.length > 0) {
            focusOnSelection();
          }
          break;
          
        case 'h':
          event.preventDefault();
          setLeftPanelOpen(!leftPanelOpen);
          break;
          
        case 'p':
          event.preventDefault();
          setRightPanelOpen(!rightPanelOpen);
          break;
          
        case 'o':
          event.preventDefault();
          toggleCameraProjection();
          break;
          
        case 's':
          // Capture d'écran seulement si pas de Ctrl/Cmd (éviter conflit avec Ctrl+S)
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            takeScreenshot();
          }
          break;
          
        case 'i':
          // Import avec Ctrl+I
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            // Déclencher la sélection de fichier
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.dstv,.dwg,.ifc,.json,.obj,.gltf,.glb';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleImport(file);
            };
            input.click();
          }
          break;
          
        case 'e':
          // Export avec Ctrl+E
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleExport('json');
          }
          break;
      }
    };
    
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMoveCombi);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.tabIndex = -1;
    canvas.addEventListener('click', () => canvas.focus());
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMoveCombi);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
  };

  const updateOrbitTarget = (position: THREE.Vector3) => {
    if (!engineRef.current) return;
    
    const controlsManager = engineRef.current.getControlsManager();
    if (controlsManager) {
      const controls = controlsManager.getOrbitControls();
      if (controls) {
        controls.target.copy(position);
        controls.update();
      }
    }
  };

  const updateSelectionVisuals = (selectedIds: string[]) => {
    if (!engineRef.current) return;
    
    const scene = engineRef.current.getScene();
    if (!scene) return;
    
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.elementId) {
        const isSelected = selectedIds.includes(child.userData.elementId);
        
        if (child.material) {
          if (child.material instanceof THREE.MeshStandardMaterial) {
            if (isSelected) {
              child.material.emissive = new THREE.Color('#ff6600');
              child.material.emissiveIntensity = 0.3;
              child.material.needsUpdate = true;
            } else {
              child.material.emissive = new THREE.Color('#000000');
              child.material.emissiveIntensity = 0;
              child.material.needsUpdate = true;
            }
          } else if (child.material instanceof THREE.MeshBasicMaterial || 
                   child.material instanceof THREE.MeshPhongMaterial ||
                   child.material instanceof THREE.MeshLambertMaterial) {
            if (!child.userData.originalColor) {
              child.userData.originalColor = child.material.color.getHex();
            }
            
            if (isSelected) {
              child.material.color = new THREE.Color('#ff9900');
            } else {
              child.material.color = new THREE.Color(child.userData.originalColor);
            }
            child.material.needsUpdate = true;
          }
        }
      }
    });
  };

  const focusOnSelection = () => {
    if (!engineRef.current || selectedIds.length === 0) return;
    
    const scene = engineRef.current.getScene();
    const camera = engineRef.current.getCamera();
    
    if (scene && camera) {
      const box = new THREE.Box3();
      let hasObjects = false;
      
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && selectedIds.includes(child.userData.elementId)) {
          box.expandByObject(child);
          hasObjects = true;
        }
      });
      
      if (hasObjects) {
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 2;
        
        const direction = new THREE.Vector3(1, 1, 1).normalize();
        camera.position.copy(center).add(direction.multiplyScalar(distance));
        updateOrbitTarget(center);
      }
    }
  };

  // === MÉTHODES PROFESSIONNELLES ===
  
  const fitToView = () => {
    if (!engineRef.current || initialElements.length === 0) return;
    
    const { size, center } = calculateSceneBounds();
    const camera = engineRef.current.getCamera();
    if (camera) {
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = 35;
        camera.updateProjectionMatrix();
      }
      
      const distance = Math.max(size * 0.4, 2000);
      camera.position.set(
        center.x + distance * 0.6,
        center.y + distance * 0.8,
        center.z + distance * 0.6
      );
      camera.lookAt(center);
      updateOrbitTarget(center);
    }
    
    setSelectedIds([]);
    onElementSelect?.([]);
  };


  const activateIsolate = () => {
    if (selectedIds.length > 0) {
      setIsolateMode(true);
      
      if (engineRef.current) {
        const scene = engineRef.current.getScene();
        if (scene) {
          scene.traverse((child) => {
            if (child instanceof THREE.Mesh && child.userData.elementId) {
              child.visible = selectedIds.includes(child.userData.elementId);
            }
          });
        }
      }
    }
  };

  const showAll = () => {
    setIsolateMode(false);
    
    if (engineRef.current) {
      const scene = engineRef.current.getScene();
      if (scene) {
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh && child.userData.elementId) {
            child.visible = true;
          }
        });
      }
    }
  };

  const toggleCameraProjection = () => {
    if (!engineRef.current) return;
    
    const cameraController = engineRef.current.getCameraController();
    if (cameraController) {
      const newMode = !isOrthographic;
      setIsOrthographic(newMode);
      
      // Basculer le mode de caméra
      if (newMode) {
        cameraController.switchToOrthographic();
      } else {
        cameraController.switchToPerspective();
      }
      
      // Mettre à jour les contrôles
      const controlsManager = engineRef.current.getControlsManager();
      if (controlsManager) {
        const controls = controlsManager.getOrbitControls();
        if (controls) {
          controls.object = cameraController.camera;
          controls.update();
        }
      }
      
      console.log(`📷 Caméra: ${newMode ? 'ORTHOGRAPHIQUE' : 'PERSPECTIVE'}`);
    }
  };

  const takeScreenshot = () => {
    if (!engineRef.current) {
      console.error('Engine non disponible pour la capture');
      return;
    }

    try {
      // Prendre la capture d'écran
      const dataURL = engineRef.current.takeScreenshot('png', 0.95);
      
      // Créer un nom de fichier avec timestamp
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `TopSteelCAD_${timestamp}.png`;
      
      // Créer et déclencher le téléchargement
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`📸 Capture d'écran sauvegardée: ${filename}`);
    } catch (error) {
      console.error('Erreur lors de la capture d\'écran:', error);
    }
  };

  const handleImport = async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`📁 Import en cours: ${file.name}`);
      const result: ImportResult = await FileImporter.importFile(file);
      
      if (result.success && result.elements) {
        console.log(`📊 État actuel avant import:`, allElements);
        console.log(`📊 Éléments à importer:`, result.elements);
        
        // Générer des IDs uniques pour éviter les doublons
        const timestamp = Date.now();
        const elementsWithUniqueIds = result.elements.map((element, index) => ({
          ...element,
          id: `${element.id}_${timestamp}_${index}` // Ajouter timestamp et index pour garantir l'unicité
        }));
        
        // Option: Demander à l'utilisateur s'il veut remplacer ou ajouter
        // Pour l'instant, on ajoute toujours
        const newElements = [...allElements, ...elementsWithUniqueIds];
        
        console.log(`📊 Avant import: ${allElements.length} éléments`);
        console.log(`📊 Nouveaux éléments: ${elementsWithUniqueIds.length}`);
        console.log(`📊 Total après import: ${newElements.length} éléments`);
        console.log(`📊 Nouveau tableau complet:`, newElements);
        
        // Mettre à jour l'état local des éléments immédiatement
        console.log('📝 Mise à jour immédiate de allElements avec:', newElements);
        setAllElements(newElements);
        // Forcer le re-render en incrémentant la clé
        setUpdateKey(prev => prev + 1);
        
        // Mettre à jour via les props parent si disponible
        if (onElementChange) {
          // Notifier pour chaque élément ajouté
          elementsWithUniqueIds.forEach(element => {
            onElementChange(element);
          });
        }
        
        // Ajouter seulement les nouveaux éléments à la scène (sans tout effacer)
        if (engineRef.current) {
          await Promise.all(
            elementsWithUniqueIds.map(element => 
              engineRef.current!.addElement(element)
            )
          );
        }
        
        // Sélectionner automatiquement le premier élément importé pour afficher ses propriétés
        if (elementsWithUniqueIds.length > 0) {
          const firstElementId = elementsWithUniqueIds[0].id;
          setSelectedIds([firstElementId]);
          if (onElementSelect) {
            onElementSelect([firstElementId]);
          }
          
          // Forcer la mise à jour de la sélection visuelle
          setTimeout(() => {
            updateSelectionVisuals([firstElementId]);
          }, 100);
        }
        
        // Mise à jour de la grille et ajustement de la vue
        updateAdaptiveGrid(theme === 'dark');
        
        console.log(`✅ Import réussi: ${result.elements.length} éléments ajoutés`);
        
        // Afficher les warnings s'il y en a
        if (result.warnings && result.warnings.length > 0) {
          console.warn('⚠️ Avertissements:', result.warnings);
        }
        
      } else {
        throw new Error(result.error || 'Échec de l\'import');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur d\'import inconnue';
      setError(`Erreur lors de l'import: ${errorMessage}`);
      console.error('❌ Erreur d\'import:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearScene = () => {
    // Vider tous les éléments
    setAllElements([]);
    setSelectedIds([]);
    
    // Vider la scène 3D
    if (engineRef.current) {
      engineRef.current.clearElements();
    }
    
    // Forcer le re-render
    setUpdateKey(prev => prev + 1);
    
    console.log('✅ Scène vidée');
  };

  const handleExport = async (format: ExportFormat, options?: any) => {
    try {
      console.log(`📤 Export en cours (format: ${format})`);
      
      // Utiliser les options du modal ou les defaults
      const exportOptions = options || {
        selectedOnly: selectedIds.length > 0,
        includeMetadata: true,
        includeFeatures: true,
        precision: 2
      };
      
      // Utiliser directement allElements (état React)
      console.log(`📊 État allElements: ${allElements.length} éléments`);
      console.log('📊 Détail des éléments:', allElements);
      
      // Vérifier si on a des éléments
      if (!allElements || allElements.length === 0) {
        console.error('❌ Aucun élément dans allElements');
        console.log('📊 selectedIds:', selectedIds);
        console.log('📊 initialElements:', initialElements);
        throw new Error('Aucun élément disponible. Veuillez importer un fichier ou créer des éléments.');
      }
      
      const currentElements = allElements;
      
      // Exporter les éléments selon les options
      const elementsToExport = exportOptions.selectedOnly && selectedIds.length > 0
        ? currentElements.filter(el => selectedIds.includes(el.id))
        : currentElements;
      
      if (elementsToExport.length === 0) {
        throw new Error('Aucun élément à exporter');
      }
      
      const result = await FileExporter.exportScene(elementsToExport, {
        format,
        ...exportOptions
      });
      
      if (result.success) {
        console.log(`✅ Export réussi: ${result.fileName} (${result.metadata?.elementsCount} éléments)`);
      } else {
        throw new Error(result.error || 'Échec de l\'export');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur d\'export inconnue';
      setError(`Erreur lors de l'export: ${errorMessage}`);
      console.error('❌ Erreur d\'export:', error);
    }
  };

  // === GESTION DU THÈME ===
  
  useEffect(() => {
    if (engineRef.current && engineRef.current.isInitialized) {
      const bgColor = theme === 'dark' ? '#1f2937' : '#e6f2ff';
      engineRef.current.setBackgroundColor(bgColor);
      updateAdaptiveGrid(theme === 'dark');
      
      const scene = engineRef.current.getScene();
      if (scene) {
        const workplane = scene.getObjectByName('Workplane');
        if (workplane && workplane instanceof THREE.Mesh) {
          const workplaneMaterial = workplane.material as THREE.MeshBasicMaterial;
          workplaneMaterial.color = new THREE.Color(theme === 'dark' ? '#1f2937' : '#cce7ff');
          workplaneMaterial.opacity = theme === 'dark' ? 0.01 : 0.015;
        }
      }
    }
  }, [theme]);

  // === REDIMENSIONNEMENT ===
  
  useEffect(() => {
    const handleResize = () => {
      if (engineRef.current && containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        engineRef.current.handleResize(clientWidth, clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // === CHARGEMENT DES ÉLÉMENTS ===
  
  useEffect(() => {
    if (isEngineReady && engineRef.current && !elementsAddedRef.current && allElements.length > 0) {
      elementsAddedRef.current = true;
      setIsLoading(true);
      
      allElements.forEach(element => {
        engineRef.current?.addElement(element);
      });
      
      updateAdaptiveGrid(theme === 'dark');
      
      const { size } = calculateSceneBounds();
      const controlsManager = engineRef.current?.getControlsManager();
      if (controlsManager) {
        controlsManager.updateZoomLimits(size);
      }
      
      setTimeout(() => {
        fitToView();
        setIsLoading(false);
      }, 100);
    }
  }, [isEngineReady, theme, allElements]);

  // Log quand les features sélectionnées changent
  useEffect(() => {
    console.log('🎯 Selected features updated in ProfessionalViewer:', selectedFeatures);
    // Le FeatureOutlineRenderer écoute déjà l'événement 'feature:selection:changed'
    // et met à jour automatiquement la surbrillance via updateSelectedFeatures
  }, [selectedFeatures]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      backgroundColor: theme === 'dark' ? '#0f172a' : '#f8fafc'
    }}>
      {/* PANNEAU GAUCHE - HIÉRARCHIE */}
      {leftPanelOpen && (
        <div style={{
          width: '260px',
          backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
          borderRight: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}>
          <div style={{
            padding: '1rem',
            borderBottom: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 'bold',
              color: theme === 'dark' ? '#f1f5f9' : '#1e293b'
            }}>
              <Layers size={16} />
              Hiérarchie
            </div>
            <button
              onClick={() => setLeftPanelOpen(false)}
              style={{
                padding: '0.25rem',
                backgroundColor: 'transparent',
                border: 'none',
                color: theme === 'dark' ? '#94a3b8' : '#64748b',
                cursor: 'pointer'
              }}
            >
              <ChevronLeft size={16} />
            </button>
          </div>
          
          <div 
            key={`hierarchy-list-${updateKey}`}
            style={{
            flex: 1,
            overflow: 'auto',
            padding: '0.75rem'
          }}>
            {allElements.map(element => {
              const hasFeatures = element.features && element.features.length > 0;
              const isExpanded = expandedElements.has(element.id);
              
              return (
                <div key={element.id}>
                  {/* Elément principal */}
                  <div
                    onClick={() => {
                      setSelectedIds([element.id]);
                      onElementSelect?.([element.id]);
                      updateSelectionVisuals([element.id]);
                    }}
                    style={{
                      padding: '0.5rem 0.75rem',
                      marginBottom: '0.125rem',
                      backgroundColor: selectedIds.includes(element.id)
                        ? (theme === 'dark' ? '#3b82f6' : '#dbeafe')
                        : 'transparent',
                      color: selectedIds.includes(element.id)
                        ? (theme === 'dark' ? '#ffffff' : '#1e40af')
                        : (theme === 'dark' ? '#cbd5e1' : '#475569'),
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedIds.includes(element.id)) {
                        e.currentTarget.style.backgroundColor = theme === 'dark' ? '#334155' : '#f1f5f9';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedIds.includes(element.id)) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {/* Bouton expand/collapse */}
                    {hasFeatures && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newExpanded = new Set(expandedElements);
                          if (isExpanded) {
                            newExpanded.delete(element.id);
                          } else {
                            newExpanded.add(element.id);
                          }
                          setExpandedElements(newExpanded);
                        }}
                        style={{
                          padding: 0,
                          border: 'none',
                          background: 'transparent',
                          color: 'inherit',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'transform 0.2s'
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          style={{
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s'
                          }}
                        >
                          <path d="M9 6l6 6-6 6z" />
                        </svg>
                      </button>
                    )}
                    
                    {/* Icône de l'élément */}
                    <span style={{ marginLeft: !hasFeatures ? '16px' : '0' }}>
                      {element.materialType === MaterialType.PLATE ? '🔲' : 
                       element.materialType === MaterialType.COLUMN ? '🏛️' : '📐'}
                    </span>
                    
                    {/* Nom de l'élément */}
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {element.name || element.id}
                    </span>
                    
                    {/* Badge du nombre de features */}
                    {hasFeatures && (
                      <span style={{
                        backgroundColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '0.75rem',
                        fontSize: '0.7rem',
                        fontWeight: '600'
                      }}>
                        {element.features?.length || 0}
                      </span>
                    )}
                    
                    {element.visible === false && <EyeOff size={14} />}
                  </div>
                  
                  {/* Features enfants (si expandé) */}
                  {hasFeatures && isExpanded && (
                    <div style={{
                      marginLeft: '1.75rem',
                      marginTop: '0.125rem',
                      marginBottom: '0.25rem'
                    }}>
                      {element.features?.map((feature) => {
                        const isFeatureSelected = selectedFeatures.some(
                          f => f.elementId === element.id && f.featureId === feature.id
                        );
                        const isFeatureHovered = hoveredFeature?.elementId === element.id && 
                                                hoveredFeature?.featureId === feature.id;
                        
                        return (
                          <div
                            key={feature.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('🖱️ Feature clicked:', {
                                elementId: element.id,
                                featureId: feature.id,
                                featureSelectionEnabled,
                                hasSelectionManager: !!selectionManagerRef.current
                              });
                              if (selectionManagerRef.current && featureSelectionEnabled) {
                                eventBusRef.current?.emit('feature:click', {
                                  elementId: element.id,
                                  featureId: feature.id,
                                  event: e.nativeEvent
                                });
                              }
                            }}
                            onMouseEnter={() => {
                              if (featureSelectionEnabled) {
                                eventBusRef.current?.emit('feature:hover', {
                                  elementId: element.id,
                                  featureId: feature.id
                                });
                              }
                            }}
                            onMouseLeave={() => {
                              if (featureSelectionEnabled) {
                                eventBusRef.current?.emit('feature:hover', {
                                  elementId: element.id,
                                  featureId: null
                                });
                              }
                            }}
                            style={{
                              padding: '0.375rem 0.5rem',
                              marginBottom: '0.0625rem',
                              fontSize: '0.8rem',
                              backgroundColor: isFeatureSelected
                                ? (theme === 'dark' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)')
                                : isFeatureHovered
                                ? (theme === 'dark' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(251, 191, 36, 0.1)')
                                : 'transparent',
                              color: isFeatureSelected
                                ? '#10b981'
                                : isFeatureHovered
                                ? '#fbbf24'
                                : (theme === 'dark' ? '#94a3b8' : '#64748b'),
                              borderLeft: `2px solid ${
                                isFeatureSelected ? '#10b981' : 
                                isFeatureHovered ? '#fbbf24' : 
                                (theme === 'dark' ? '#334155' : '#e2e8f0')
                              }`,
                              borderRadius: '0.25rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.375rem'
                            }}
                          >
                            {/* Icône de la feature */}
                            <span style={{ fontSize: '0.9rem' }}>
                              {feature.type === 'HOLE' ? '⚫' : 
                               feature.type === 'SLOT' ? '➖' : 
                               feature.type === 'CUTOUT' ? '✂️' :
                               feature.type === 'NOTCH' ? '🕳️' :
                               feature.type === 'MARKING' ? '✍️' :
                               feature.type === 'TEXT' ? '🔤' :
                               '🔧'}
                            </span>
                            
                            {/* Type et ID de la feature */}
                            <span style={{ flex: 1 }}>
                              {feature.type === 'HOLE' ? 'Trou' :
                               feature.type === 'SLOT' ? 'Oblong' :
                               feature.type === 'CUTOUT' ? 'Découpe' :
                               feature.type === 'NOTCH' ? 'Encoche' :
                               feature.type === 'MARKING' ? 'Marquage' :
                               feature.type === 'TEXT' ? 'Texte' :
                               feature.type} 
                              <span style={{ 
                                marginLeft: '0.25rem',
                                fontSize: '0.7rem',
                                opacity: 0.7 
                              }}>
                                #{feature.id.split('_').pop()}
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div style={{
            padding: '0.75rem',
            borderTop: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
            fontSize: '0.75rem',
            color: theme === 'dark' ? '#94a3b8' : '#64748b'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                {allElements.length} éléments • {selectedIds.length} sélectionné(s)
                {selectedFeatures.length > 0 && ` • ${selectedFeatures.length} feature(s)`}
              </span>
              {allElements.some(e => e.features && e.features.length > 0) && (
                <button
                  onClick={() => {
                    if (expandedElements.size === allElements.filter(e => e.features && e.features.length > 0).length) {
                      setExpandedElements(new Set());
                    } else {
                      setExpandedElements(new Set(allElements.filter(e => e.features && e.features.length > 0).map(e => e.id)));
                    }
                  }}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.7rem',
                    backgroundColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                    color: theme === 'dark' ? '#d1d5db' : '#4b5563',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme === 'dark' ? '#4b5563' : '#d1d5db';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme === 'dark' ? '#374151' : '#e5e7eb';
                  }}
                >
                  {expandedElements.size === allElements.filter(e => e.features && e.features.length > 0).length
                    ? 'Réduire tout'
                    : 'Étendre tout'
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* BOUTON POUR OUVRIR LE PANNEAU GAUCHE */}
      {!leftPanelOpen && (
        <button
          onClick={() => setLeftPanelOpen(true)}
          style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            padding: '0.5rem',
            backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            border: `1px solid ${theme === 'dark' ? '#475569' : '#e2e8f0'}`,
            borderRadius: '0.375rem',
            cursor: 'pointer',
            zIndex: 100,
            backdropFilter: 'blur(8px)'
          }}
        >
          <ChevronRight size={20} color={theme === 'dark' ? '#cbd5e1' : '#475569'} />
        </button>
      )}

      {/* ZONE CENTRALE - CANVAS + CONTRÔLES */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block'
          }}
        />

        {/* BARRE D'OUTILS PROFESSIONNELLE */}
        <Toolbar
          theme={theme}
          measurementMode={measurementMode}
          isOrthographic={isOrthographic}
          isolateMode={isolateMode}
          selectedIds={selectedIds}
          totalElements={allElements.length}
          onHome={fitToView}
          onScreenshot={takeScreenshot}
          onToggleMeasurement={() => {
            const newMeasureMode = !measurementMode;
            setMeasurementMode(newMeasureMode);
            if (measurementToolRef.current && canvasRef.current) {
              measurementToolRef.current.setActive(newMeasureMode);
            }
            if (canvasRef.current) {
              canvasRef.current.style.cursor = newMeasureMode ? 'crosshair' : 'default';
            }
            console.log(`📏 Mode mesure toolbar: ${newMeasureMode ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
          }}
          onToggleProjection={toggleCameraProjection}
          onIsolate={activateIsolate}
          onShowAll={showAll}
          onImport={handleImport}
          onExport={handleExport}
          onClearScene={handleClearScene}
        />

        {/* CONTRÔLES STANDARD (comme dans Standard) */}
        <div style={{
          position: 'absolute',
          bottom: '2rem',
          right: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          {/* Bouton Thème */}
          <button
            onClick={() => {
              const newTheme = theme === 'dark' ? 'light' : 'dark';
              onThemeChange?.(newTheme);
            }}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
              color: theme === 'dark' ? '#e2e8f0' : '#334155',
              border: `1px solid ${theme === 'dark' ? '#475569' : '#cbd5e1'}`,
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              backdropFilter: 'blur(8px)',
              boxShadow: theme === 'dark'
                ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'dark' ? 'Clair' : 'Sombre'}
          </button>
          {/* Bouton Propriétés */}
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: rightPanelOpen 
                ? (theme === 'dark' ? 'rgba(59, 130, 246, 0.9)' : 'rgba(59, 130, 246, 0.1)')
                : (theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)'),
              color: rightPanelOpen
                ? (theme === 'dark' ? '#ffffff' : '#1e40af')
                : (theme === 'dark' ? '#e2e8f0' : '#334155'),
              border: `1px solid ${rightPanelOpen 
                ? (theme === 'dark' ? '#3b82f6' : '#93c5fd')
                : (theme === 'dark' ? '#475569' : '#cbd5e1')}`,
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Info size={16} />
            Propriétés
          </button>
        </div>

        {/* VIEWCUBE - Cube de navigation 3D */}
        {isEngineReady && cameraControllerRef.current && (
          <ViewCube
            cameraController={cameraControllerRef.current}
            theme={theme}
            size={120}
            position="top-right"
            onViewChange={(view) => {
              console.log(`🎯 ViewCube: Changement de vue vers ${view}`);
            }}
            enableDrag={true}
            enableDoubleClick={true}
            animationDuration={500}
          />
        )}

        {/* INFO SÉLECTION (comme dans Standard) */}
        {(selectedIds.length > 0 || selectedFeatures.length > 0) && (
          <div style={{
            position: 'absolute',
            bottom: '2rem',
            left: leftPanelOpen ? '300px' : '2rem',
            transition: 'left 0.3s ease',
            padding: '0.75rem 1rem',
            backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.9)' : 'rgba(59, 130, 246, 0.1)',
            color: theme === 'dark' ? '#dbeafe' : '#1e40af',
            border: `1px solid ${theme === 'dark' ? '#3b82f6' : '#93c5fd'}`,
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            backdropFilter: 'blur(8px)',
            boxShadow: theme === 'dark'
              ? '0 2px 4px -1px rgba(59, 130, 246, 0.3)'
              : '0 2px 4px -1px rgba(59, 130, 246, 0.1)'
          }}>
            {selectedFeatures.length > 0 ? (
              <div>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                  🎯 {selectedFeatures.length} feature{selectedFeatures.length > 1 ? 's' : ''} sélectionnée{selectedFeatures.length > 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                  {selectedFeatures.map(f => f.featureId).join(', ')}
                </div>
              </div>
            ) : selectedIds.length === 1 ? (
              (() => {
                const element = allElements.find(e => e.id === selectedIds[0]);
                if (!element) return `1 élément sélectionné`;
                
                return (
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                      {element.name || 'Élément'}
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                      {element.metadata?.profile && `Profil: ${element.metadata.profile}`}
                    </div>
                  </div>
                );
              })()
            ) : (
              `${selectedIds.length} éléments sélectionnés`
            )}
          </div>
        )}

        {/* LOGO (comme dans Standard) */}
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: leftPanelOpen ? '280px' : '2rem',
          transition: 'left 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          backgroundColor: theme === 'dark'
            ? 'rgba(15, 23, 42, 0.9)'
            : 'rgba(255, 255, 255, 0.9)',
          borderRadius: '0.5rem',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${theme === 'dark' ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)'}`,
          boxShadow: theme === 'dark'
            ? '0 4px 6px rgba(0, 0, 0, 0.3)'
            : '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 1000
        }}>
          <div style={{ fontSize: '1.5rem', lineHeight: 1 }}>🏗️</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
            <div style={{
              fontSize: '1rem',
              fontWeight: '700',
              color: theme === 'dark' ? '#f1f5f9' : '#1e293b',
              letterSpacing: '0.025em'
            }}>
              TopSteelCAD Pro
            </div>
            <div style={{
              fontSize: '0.7rem',
              color: theme === 'dark' ? '#64748b' : '#94a3b8',
              fontWeight: '400'
            }}>
              Professional Edition
            </div>
          </div>
        </div>

        {/* Chargement */}
        {isLoading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <Loader2 
              size={48} 
              style={{
                animation: 'spin 1s linear infinite',
                color: theme === 'dark' ? '#0ea5e9' : '#3b82f6'
              }}
            />
            <span style={{ color: theme === 'dark' ? '#fff' : '#000' }}>
              Initialisation de la scène 3D...
            </span>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div style={{
            position: 'absolute',
            top: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#ef4444',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '0.25rem'
          }}>
            {error}
          </div>
        )}
      </div>

      {/* PANNEAU DROIT - PROPRIÉTÉS */}
      {rightPanelOpen && (
        <div style={{
          width: '320px',
          backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
          borderLeft: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '1rem',
            borderBottom: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 'bold',
              color: theme === 'dark' ? '#f1f5f9' : '#1e293b'
            }}>
              <Info size={16} />
              Propriétés
            </div>
            <button
              onClick={() => setRightPanelOpen(false)}
              style={{
                padding: '0.25rem',
                backgroundColor: 'transparent',
                border: 'none',
                color: theme === 'dark' ? '#94a3b8' : '#64748b',
                cursor: 'pointer'
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '1rem'
          }}>
            {selectedIds.length === 1 && (() => {
              const element = allElements.find(e => e.id === selectedIds[0]);
              if (!element) return null;
              
              return (
                <div style={{ fontSize: '0.875rem', color: theme === 'dark' ? '#cbd5e1' : '#475569' }}>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.75rem', color: theme === 'dark' ? '#f1f5f9' : '#1e293b' }}>
                      Général
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div>ID: <span style={{ fontWeight: '500' }}>{element.id}</span></div>
                      <div>Nom: <span style={{ fontWeight: '500' }}>{element.name}</span></div>
                      <div>Type: <span style={{ fontWeight: '500' }}>{element.materialType}</span></div>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.75rem', color: theme === 'dark' ? '#f1f5f9' : '#1e293b' }}>
                      Dimensions
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div>Longueur: <span style={{ fontWeight: '500' }}>{element.dimensions.length} mm</span></div>
                      {element.dimensions.width > 0 && (
                        <div>Largeur: <span style={{ fontWeight: '500' }}>{element.dimensions.width} mm</span></div>
                      )}
                      {element.dimensions.height && element.dimensions.height > 0 && (
                        <div>Hauteur: <span style={{ fontWeight: '500' }}>{element.dimensions.height} mm</span></div>
                      )}
                      {element.dimensions.thickness > 0 && (
                        <div>Épaisseur: <span style={{ fontWeight: '500' }}>{element.dimensions.thickness} mm</span></div>
                      )}
                    </div>
                  </div>
                  
                  {element.material && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.75rem', color: theme === 'dark' ? '#f1f5f9' : '#1e293b' }}>
                        Matériau
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div>Nuance: <span style={{ fontWeight: '500' }}>{element.material.grade}</span></div>
                        <div>Densité: <span style={{ fontWeight: '500' }}>{element.material.density} kg/m³</span></div>
                      </div>
                    </div>
                  )}
                  
                  {element.metadata && Object.keys(element.metadata).length > 0 && (
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.75rem', color: theme === 'dark' ? '#f1f5f9' : '#1e293b' }}>
                        Métadonnées
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {Object.entries(element.metadata).map(([key, value]) => (
                          <div key={key}>
                            {key}: <span style={{ fontWeight: '500' }}>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            
            {selectedIds.length > 1 && (
              <div style={{ fontSize: '0.875rem', color: theme === 'dark' ? '#cbd5e1' : '#475569' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '1rem', color: theme === 'dark' ? '#f1f5f9' : '#1e293b' }}>
                  Sélection multiple
                </div>
                <div>{selectedIds.length} éléments sélectionnés</div>
                <div style={{ marginTop: '1rem' }}>
                  {selectedIds.map(id => {
                    const el = allElements.find(e => e.id === id);
                    return el ? (
                      <div key={id} style={{ padding: '0.5rem 0', borderBottom: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                        {el.name || el.id}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
            
            {selectedIds.length === 0 && (
              <div style={{ 
                fontSize: '0.875rem', 
                color: theme === 'dark' ? '#64748b' : '#94a3b8',
                textAlign: 'center',
                marginTop: '2rem'
              }}>
                Aucun élément sélectionné
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalViewer;