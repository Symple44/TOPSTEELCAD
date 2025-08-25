import * as THREE from 'three';
import { EventBus } from './EventBus';
import { PivotElement, MaterialType } from '@/types/viewer';
import { GeometryConverter } from '../viewer/GeometryConverter';
import { MarkingVisualProcessor } from './features/processors/MarkingVisualProcessor';
import { VisualFeatureRenderer } from '../viewer/VisualFeatureRenderer';
import { FeatureOutlineRenderer } from '../viewer/FeatureOutlineRenderer';

/**
 * Interface pour les marquages
 */
interface MarkingData {
  text: string;
  position: [number, number, number];
  size: number;
  face?: string;
  rotation?: [number, number, number];
  type: string;
  centerOffset?: [number, number, number];
  isMirrored?: boolean;
  angle?: number;
}

/**
 * Configuration de la scène
 */
export interface SceneConfig {
  backgroundColor?: string;
  fog?: {
    enabled: boolean;
    color: string;
    near: number;
    far: number;
  };
  ambientLight?: {
    color: string;
    intensity: number;
  };
  directionalLight?: {
    color: string;
    intensity: number;
    position: [number, number, number];
    castShadow: boolean;
  };
  grid?: {
    enabled: boolean;
    size: number;
    divisions: number;
    color1: string;
    color2: string;
  };
}

/**
 * SceneManager - Gestionnaire de la scène 3D
 * 
 * Responsabilités:
 * - Gestion de la scène Three.js
 * - Gestion des éléments 3D
 * - Gestion de l'éclairage
 * - Gestion de l'environnement (grille, fog, etc.)
 */
export class SceneManager {
  private scene: THREE.Scene;
  private eventBus: EventBus;
  
  // Groupes d'objets
  private elementsGroup: THREE.Group;
  private helpersGroup: THREE.Group;
  private lightsGroup: THREE.Group;
  
  // Éléments de la scène
  private elementMeshes: Map<string, THREE.Object3D>;
  private grid: THREE.GridHelper | null = null;
  
  // Renderers
  private geometryConverter: GeometryConverter;
  private visualFeatureRenderer: VisualFeatureRenderer;
  private featureOutlineRenderer: FeatureOutlineRenderer;
  
  // Configuration
  private config: SceneConfig = {
    backgroundColor: '#2563eb',  // Bleu vif pour vérifier que le rendu fonctionne
    ambientLight: {
      color: '#ffffff',
      intensity: 0.8
    },
    directionalLight: {
      color: '#ffffff',
      intensity: 1.5,
      position: [5000, 10000, 5000],
      castShadow: true
    },
    grid: {
      enabled: true,
      size: 20000,
      divisions: 200,
      color1: '#ffffff',
      color2: '#cccccc'
    }
  };
  
  constructor(eventBus: EventBus, config?: Partial<SceneConfig>) {
    this.eventBus = eventBus;
    this.scene = new THREE.Scene();
    this.scene.name = 'MainScene';
    
    // Appliquer la configuration
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    // Créer les groupes
    this.elementsGroup = new THREE.Group();
    this.elementsGroup.name = 'Elements';
    this.scene.add(this.elementsGroup);
    
    this.helpersGroup = new THREE.Group();
    this.helpersGroup.name = 'Helpers';
    this.scene.add(this.helpersGroup);
    
    this.lightsGroup = new THREE.Group();
    this.lightsGroup.name = 'Lights';
    this.scene.add(this.lightsGroup);
    
    // Initialiser les maps
    this.elementMeshes = new Map();
    
    // Initialiser les renderers
    this.geometryConverter = new GeometryConverter();
    this.visualFeatureRenderer = new VisualFeatureRenderer();
    this.featureOutlineRenderer = new FeatureOutlineRenderer(eventBus);
    
    this.setupEventListeners();
  }
  
  /**
   * Initialise la scène
   */
  initialize(): void {
    // Configurer la couleur de fond
    this.setBackgroundColor(this.config.backgroundColor!);
    
    // Ajouter l'éclairage
    this.setupLighting();
    
    // Grille désactivée - gérée par le système adaptatif dans TopSteelCAD.tsx
    // if (this.config.grid?.enabled) {
    //   this.addGrid();
    // }
    
    // Configurer le fog si nécessaire
    if (this.config.fog?.enabled) {
      this.setupFog();
    }
    
    // Émettre l'événement d'initialisation
    this.eventBus.emit('scene:initialized', { scene: this.scene });
  }
  
  /**
   * Configure les écouteurs d'événements
   */
  private setupEventListeners(): void {
    // Événements de visibilité
    this.eventBus.on('element:visibility', (data: { id: string; visible: boolean }) => {
      this.setElementVisibility(data.id, data.visible);
    });
    
    // Événements de grille
    this.eventBus.on('grid:toggle', (data: { enabled: boolean }) => {
      this.toggleGrid(data.enabled);
    });
    
    // Événements d'éclairage
    this.eventBus.on('lighting:update', (data: Partial<SceneConfig>) => {
      this.updateLighting(data);
    });
  }
  
  /**
   * Configure l'éclairage de la scène
   */
  private setupLighting(): void {
    // Lumière ambiante
    if (this.config.ambientLight) {
      const ambientLight = new THREE.AmbientLight(
        this.config.ambientLight.color,
        this.config.ambientLight.intensity
      );
      ambientLight.name = 'AmbientLight';
      this.lightsGroup.add(ambientLight);
    }
    
    // Lumière directionnelle principale
    if (this.config.directionalLight) {
      const directionalLight = new THREE.DirectionalLight(
        this.config.directionalLight.color,
        this.config.directionalLight.intensity
      );
      directionalLight.name = 'MainDirectionalLight';
      directionalLight.position.set(...this.config.directionalLight.position);
      directionalLight.castShadow = this.config.directionalLight.castShadow;
      
      // Configuration des ombres
      if (directionalLight.castShadow) {
        directionalLight.shadow.camera.left = -5000;
        directionalLight.shadow.camera.right = 5000;
        directionalLight.shadow.camera.top = 5000;
        directionalLight.shadow.camera.bottom = -5000;
        directionalLight.shadow.camera.near = 100;
        directionalLight.shadow.camera.far = 10000;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.bias = -0.0005;
      }
      
      this.lightsGroup.add(directionalLight);
    }
    
    // Lumière hémisphérique pour un éclairage plus naturel
    const hemisphereLight = new THREE.HemisphereLight('#87ceeb', '#1e3a5f', 0.6);
    hemisphereLight.name = 'HemisphereLight';
    this.lightsGroup.add(hemisphereLight);
  }
  
  /**
   * Ajoute la grille à la scène
   */
  private addGrid(): void {
    if (this.grid) {
      this.helpersGroup.remove(this.grid);
      this.grid.dispose();
    }
    
    const { size, divisions, color1, color2 } = this.config.grid!;
    
    this.grid = new THREE.GridHelper(size, divisions, color1, color2);
    this.grid.name = 'Grid';
    this.grid.position.y = 0; // Quadrillage au niveau 0
    this.helpersGroup.add(this.grid);
  }
  
  /**
   * Configure le fog
   */
  private setupFog(): void {
    if (this.config.fog?.enabled) {
      this.scene.fog = new THREE.Fog(
        this.config.fog.color,
        this.config.fog.near,
        this.config.fog.far
      );
    } else {
      this.scene.fog = null;
    }
  }
  
  /**
   * Ajoute un élément à la scène
   */
  addElement(element: PivotElement): void {
    
    // Retirer l'ancien mesh s'il existe
    if (this.elementMeshes.has(element.id)) {
      this.removeElement(element.id);
    }
    
    // Créer le groupe pour l'élément
    const elementGroup = new THREE.Group();
    elementGroup.name = element.name || `Element_${element.id}`;
    elementGroup.userData = { element };
    
    // Utiliser convertElement qui applique les features
    const object3d = this.geometryConverter.convertElement(element);
    
    if (!object3d) {
      console.error(`❌ Impossible de créer le mesh pour ${element.name}`);
      return;
    }
    
    // Vérifier que c'est bien un Mesh
    let mesh: THREE.Mesh;
    if (object3d instanceof THREE.Mesh) {
      mesh = object3d;
    } else {
      console.error(`❌ L'objet créé n'est pas un Mesh pour ${element.name}`);
      return;
    }
    
    mesh.name = 'MainGeometry';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.elementId = element.id;
    
    // Appliquer la transformation
    // Calculer la hauteur minimale de la géométrie pour la positionner au-dessus du quadrillage
    mesh.geometry.computeBoundingBox();
    const boundingBox = mesh.geometry.boundingBox;
    let yOffset = 0;
    
    if (boundingBox) {
      // La base de l'élément doit être au niveau y=0 (quadrillage)
      // Si minY est négatif, on doit remonter l'élément
      const minY = boundingBox.min.y;
      if (minY < 0) {
        yOffset = -minY; // Remonter pour que le bas soit à y=0
      }
    }
    
    // Stocker le décalage Y dans les userData pour les features
    mesh.userData.yOffset = yOffset;
    mesh.geometry.userData.yOffset = yOffset;
    
    mesh.position.set(
      element.position[0],
      element.position[1] + yOffset,
      element.position[2]
    );
    mesh.rotation.set(...(element.rotation || [0, 0, 0]));
    mesh.scale.set(...(element.scale || [1, 1, 1]));
    
    elementGroup.add(mesh);
    
    // Ajouter les contours visuels pour les features (trous, etc.)
    const featureOutlines = this.featureOutlineRenderer.createFeatureOutlines(element, mesh);
    if (featureOutlines.children.length > 0) {
      featureOutlines.name = 'FeatureOutlines';
      elementGroup.add(featureOutlines);
      console.log(`✨ Added ${featureOutlines.children.length} feature outlines for ${element.name}`);
    }
    
    // Ajouter les markings comme éléments visuels
    // Utiliser le processeur dédié pour une architecture propre
    if (mesh.geometry?.userData?.markings) {
      console.log(`📝 Processing markings for visual display:`, mesh.geometry.userData.markings);
      const markingsGroup = MarkingVisualProcessor.createMarkingVisuals(
        mesh.geometry.userData.markings, 
        element, 
        mesh
      );
      if (markingsGroup.children.length > 0) {
        elementGroup.add(markingsGroup);
        console.log(`✅ Added ${markingsGroup.children.length} marking visual(s) to element`);
      }
    }
    
    // Ajouter à la scène
    this.elementsGroup.add(elementGroup);
    this.elementMeshes.set(element.id, elementGroup);
    
    // Émettre l'événement
    this.eventBus.emit('scene:elementAdded', {
      id: element.id,
      object3D: elementGroup
    });
  }
  
  /**
   * [DEPRECATED] Méthode déplacée vers MarkingVisualProcessor
   * @deprecated Utiliser MarkingVisualProcessor.createMarkingVisuals() à la place
   */
  private createVisibleMarkings_DEPRECATED(markings: MarkingData[], element: PivotElement, mesh: THREE.Mesh): THREE.Group {
    const group = new THREE.Group();
    
    markings.forEach((marking: MarkingData, index) => {
      const text = marking.text || 'X';
      const size = marking.size || 20;
      
      // Créer une géométrie 3D adaptée à la longueur du texte
      const textLength = text.length;
      // Augmenter temporairement pour debug - mais respecter le ratio
      const scaleFactor = 5; // Augmenté pour visibilité (temporaire debug)
      // Largeur proportionnelle au nombre de caractères
      const textWidth = size * scaleFactor * textLength * 0.7;
      const textHeight = size * scaleFactor;
      const textGeometry = new THREE.PlaneGeometry(textWidth, textHeight);
      
      // Créer un canvas pour le texte avec un ratio correct
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;
      
      // Canvas avec un ratio proportionnel au texte
      const canvasScale = 64; // Pixels par unité de taille
      canvas.width = Math.max(256, textLength * canvasScale);
      canvas.height = canvasScale * 2; // Hauteur fixe pour un bon ratio
      
      // Fond rouge pour debug - s'assurer que le marking est visible
      context.fillStyle = 'red';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // Police standard industrielle, pas trop épaisse
      const fontSize = canvas.height * 0.6; // Taille de police proportionnelle
      context.font = `${fontSize}px Arial`; // Police normale, pas Black
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      
      // Contour noir fin pour visibilité
      context.strokeStyle = '#000000';
      context.lineWidth = 2; // Contour plus fin
      context.strokeText(text, canvas.width / 2, canvas.height / 2);
      
      // Texte jaune/doré (couleur de marquage industriel)
      context.fillStyle = '#FFD700';
      context.fillText(text, canvas.width / 2, canvas.height / 2);
      
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: false,  // Pas de transparence pour debug
        opacity: 1.0,
        side: THREE.DoubleSide,
        depthTest: false,  // Ignorer la profondeur pour toujours voir le marking
        depthWrite: false
      });
      
      const textMesh = new THREE.Mesh(textGeometry, material);
      textMesh.name = `Marking_${index}_${text}`;
      
      // Positionner sur la surface
      if (marking.position) {
        // Pour les tubes, ajuster les dimensions
        let thickness, length, width;
        
        console.log(`🔍 Element materialType: "${element.materialType}"`);
        
        if (element.materialType === 'tube') {
          // Pour les tubes: length est la longueur du tube, width/height sont les dimensions de section
          length = element.dimensions.length || 360;
          width = element.dimensions.width || 100;  // Largeur de la section
          thickness = element.dimensions.height || 50;  // Hauteur de la section (utilisée comme référence Y)
        } else {
          // Pour les autres éléments (plaques, etc.)
          thickness = element.dimensions.thickness || 15;
          length = element.dimensions.length || 220;
          width = element.dimensions.width || 120;
        }
        
        // Les positions dans marking.position sont déjà les coordonnées DSTV originales
        // DSTV utilise le coin inférieur gauche comme origine (0,0)
        // Three.js utilise le centre comme origine
        
        // Pour les formes complexes avec contour, appliquer le même système de coordonnées
        let x, y, z;
        
        // Récupérer les metadata de la géométrie
        const centerOffset = marking.centerOffset || mesh.geometry?.userData?.centerOffset;
        const isMirrored = marking.isMirrored || mesh.geometry?.userData?.isMirrored;
        
        if (element.metadata?.contour && centerOffset) {
          // La géométrie est centrée et potentiellement inversée
          console.log(`   ✅ Using centerOffset: x=${centerOffset.x?.toFixed(1)}, y=${centerOffset.y?.toFixed(1)}`);
          
          // Appliquer le centrage
          x = marking.position[0] - centerOffset.x;
          z = marking.position[1] - centerOffset.y;
          
          // Si la géométrie est inversée (miroir), inverser aussi la position X du marking
          if (isMirrored) {
            console.log(`   🔄 Applying mirror transformation`);
            x = -x;
          }
        } else if (element.metadata?.contour) {
          // Pour les formes avec contour centrées (ancienne méthode)
          console.log(`   ⚠️ Using centered coordinates, calculating offset`);
          
          // Trouver les bornes du contour
          const contourPoints = element.metadata.contour;
          let minX = Infinity, maxX = -Infinity;
          let minY = Infinity, maxY = -Infinity;
          
          contourPoints.forEach((point: [number, number]) => {
            minX = Math.min(minX, point[0]);
            maxX = Math.max(maxX, point[0]);
            minY = Math.min(minY, point[1]);
            maxY = Math.max(maxY, point[1]);
          });
          
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          
          console.log(`   Calculated center: x=${centerX.toFixed(1)}, y=${centerY.toFixed(1)}`);
          
          x = marking.position[0] - centerX;
          z = marking.position[1] - centerY;
        } else {
          // Pour les formes rectangulaires simples
          if (element.materialType === 'tube') {
            // Pour les tubes extrudés selon Z dans Three.js
            // La longueur du tube est selon Z, pas X
            // DSTV: x=position le long du tube, y=position sur la circonférence
            // Three.js: z=position le long du tube, x/y=position sur la section
            
            // Pour un tube rectangulaire, les markings sont généralement sur la face supérieure
            // Position le long du tube (DSTV x -> Three.js z)
            // Respecter exactement les coordonnées DSTV
            const dstvX = marking.position[0];  // Position X dans DSTV (le long du tube)
            const dstvY = marking.position[1];  // Position Y dans DSTV (sur la largeur)
            
            // Conversion DSTV -> Three.js
            // DSTV utilise le coin comme origine (0,0)
            // Three.js utilise le centre comme origine
            z = dstvX - length / 2;  // Position le long du tube
            
            // Pour la position latérale (sur la largeur du tube)
            // Si dstvY = 0, le marking devrait être centré ou au bord selon la norme
            // Pour l'instant, on centre en X si dstvY = 0
            x = dstvY === 0 ? 0 : dstvY - width / 2;
            
            // Vérifier que le texte ne déborde pas de la pièce
            const halfTextWidth = (textWidth || (size * textLength * 0.6)) / 2;
            const halfTextHeight = (textHeight || size) / 2;
            
            // Vérification le long du tube (axe Z)
            const textStartZ = z - halfTextWidth;
            const textEndZ = z + halfTextWidth;
            const tubeStartZ = -length / 2;
            const tubeEndZ = length / 2;
            
            if (textStartZ < tubeStartZ || textEndZ > tubeEndZ) {
              console.log(`   ⚠️ WARNING: Text extends outside tube boundaries!`);
              console.log(`      Text range: [${textStartZ.toFixed(1)}, ${textEndZ.toFixed(1)}]`);
              console.log(`      Tube range: [${tubeStartZ.toFixed(1)}, ${tubeEndZ.toFixed(1)}]`);
              
              // Ajuster la position pour que le texte reste dans les limites
              if (textStartZ < tubeStartZ) {
                z = tubeStartZ + halfTextWidth;
                console.log(`      Adjusted Z position to ${z.toFixed(1)} to keep text inside`);
              } else if (textEndZ > tubeEndZ) {
                z = tubeEndZ - halfTextWidth;
                console.log(`      Adjusted Z position to ${z.toFixed(1)} to keep text inside`);
              }
            }
            
            // Vérification sur la largeur (axe X)
            const textStartX = x - halfTextHeight; // Height car le texte est tourné
            const textEndX = x + halfTextHeight;
            const tubeStartX = -width / 2;
            const tubeEndX = width / 2;
            
            if (textStartX < tubeStartX || textEndX > tubeEndX) {
              console.log(`   ⚠️ WARNING: Text extends outside tube width!`);
              console.log(`      Text range X: [${textStartX.toFixed(1)}, ${textEndX.toFixed(1)}]`);
              console.log(`      Tube range X: [${tubeStartX.toFixed(1)}, ${tubeEndX.toFixed(1)}]`);
              
              // Centrer le texte si il déborde
              x = 0;
              console.log(`      Centered text on width to keep it inside`);
            }
            
            console.log(`   📏 DSTV position: x=${dstvX}mm (along tube), y=${dstvY}mm (across tube)`);
            console.log(`   📍 Three.js position: x=${x.toFixed(1)}mm, z=${z.toFixed(1)}mm`);
          } else if (element.materialType === MaterialType.ANGLE) {
            // Pour les cornières (L-profiles)
            // Les markings sont généralement sur l'aile verticale (face web)
            // Dans DSTV: x=position le long de la pièce, y=position sur l'aile
            const dstvX = marking.position[0];  // Position X dans DSTV (le long de la pièce)
            const dstvY = marking.position[1];  // Position Y dans DSTV (sur l'aile depuis le coin)
            
            // Conversion vers Three.js
            z = dstvX - length / 2;  // Position le long de la pièce
            // Pour une cornière, l'aile verticale est à X négatif
            // Le marking devrait être sur la face extérieure de l'aile
            x = -width / 2 - 0.1;  // Face extérieure de l'aile verticale
            
            console.log(`   🔺 L-Profile marking: DSTV(${dstvX}, ${dstvY}) -> Three.js(${x.toFixed(1)}, ?, ${z.toFixed(1)})`);
          } else if (element.materialType === MaterialType.BEAM) {
            // Pour les profils en I/H (poutres)
            // marking.position contient [x, y] ou [x, y, z] où :
            // Pour 2 éléments : [x, y] = position le long du profil, position verticale
            // Pour 3 éléments : [x, y, z] = position latérale, position verticale, position le long
            const webThickness = element.dimensions?.webThickness || 8.6;
            
            if (Array.isArray(marking.position)) {
              if (marking.position.length >= 3) {
                // Format à 3 coordonnées
                x = marking.position[0];  // Position latérale
                y = marking.position[1];  // Position verticale
                z = marking.position[2];  // Position le long de la poutre
              } else if (marking.position.length >= 2) {
                // Format à 2 coordonnées (plus courant en DSTV)
                // [position le long, position verticale]
                z = marking.position[0];  // Position le long du profil
                y = marking.position[1];  // Position verticale sur l'âme
                x = 0;  // Par défaut au centre
              } else {
                // Fallback
                z = marking.position[0] || 0;
                y = 0;
                x = 0;
              }
              
              // Ajuster X selon la face pour être sur la surface
              if (marking.face === 'web' || marking.face === 'o' || !marking.face) {
                // Positionner sur la face avant de l'âme
                x = webThickness / 2 + 0.5;  // Surface de l'âme + petit décalage
              } else if (marking.face === 'v' || marking.face === 'top_flange') {
                // Sur l'aile supérieure
                x = 0;
                const flangeThickness = element.dimensions?.flangeThickness || 7.6;
                y = (element.dimensions?.height || 251.4) / 2 - flangeThickness / 2;
              }
            } else {
              // Si marking.position n'est pas un tableau
              z = 0;
              x = webThickness / 2 + 0.5;
              y = 0;
            }
            
            console.log(`   🏗️ I-Profile marking: position(${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`);
          } else {
            // Pour les plaques et autres (fallback)
            const dstvX = marking.position[0];
            const dstvY = marking.position[1];
            x = 0; // Centré
            z = dstvX - length / 2;
            y = dstvY;
          }
        }
        
        // Position Y : sur la surface supérieure
        // Le marking est ajouté à elementGroup, et le mesh a sa propre position dans ce groupe
        // Donc les coordonnées du marking doivent être dans l'espace du groupe, pas du mesh
        
        // Note: y is already declared above, reuse it for other material types
        if (element.materialType === 'tube') {
          // Pour les tubes:
          // - Le mesh est positionné à mesh.position.y = element.position[1] + yOffset
          // - Le marking doit être positionné relativement au groupe, pas au mesh
          // - Donc on doit tenir compte de la position du mesh dans le groupe
          const meshY = mesh.position.y;  // Position Y du mesh dans le groupe
          
          // Le haut du tube dans l'espace du mesh est à height/2
          // Mais dans l'espace du groupe, c'est à meshY + height/2
          y = meshY + (element.dimensions.height || 0) / 2 + 0.1;  // Surface supérieure du tube dans l'espace du groupe
          
          console.log(`📐 Marking Y position for tube:`);
          console.log(`   Tube height: ${element.dimensions.height}`);
          console.log(`   Mesh position in group: y=${meshY}`);
          console.log(`   Marking Y in group space: ${y}`);
          console.log(`   This should place marking ${0.1}mm above tube surface`);
        } else if (element.materialType === MaterialType.ANGLE) {
          // Pour les cornières - position Y basée sur la position DSTV
          const meshY = mesh.position.y;
          const dstvY = marking.position[1];  // Position Y dans DSTV (sur l'aile)
          // Convertir la position DSTV Y vers Three.js
          y = meshY + dstvY - (element.dimensions.height || 0) / 2;  // Position sur l'aile verticale
          console.log(`   📐 L-Profile Y: DSTV=${dstvY} -> Three.js=${y.toFixed(1)} (meshY=${meshY})`);
        } else if (element.materialType === MaterialType.BEAM) {
          // Pour les profils I/H, y a déjà été correctement défini dans la section BEAM ci-dessus
          // La position Y du marking est déjà dans le système de coordonnées correct
          const meshY = mesh.position.y;
          // Ne pas ajouter meshY car la position est déjà correcte
          y = y || 0;  // Assurer que y a une valeur
          console.log(`   📐 I-Profile Y: marking Y=${y.toFixed(1)} (meshY=${meshY})`);
        } else {
          // Pour les plaques
          const meshY = mesh.position.y;
          y = meshY + thickness / 2 + 0.1;  // Surface supérieure dans l'espace du groupe
        }
        
        textMesh.position.set(x, y || 0, z);
        
        // Gérer la rotation du marking selon la face et l'angle
        // Par défaut, le texte est dans le plan XZ (horizontal)
        // Il faut l'orienter selon la face sur laquelle il est placé
        
        // Angle de rotation du texte dans son plan (depuis DSTV)
        const markingAngle = marking.angle || 0;
        
        // Déterminer la rotation selon la face
        // Pour les cornières, le texte est sur l'aile verticale
        if (element.materialType === MaterialType.ANGLE) {
          // Le texte est sur l'aile verticale qui fait face à X négatif
          // Rotation de 90° autour de Y pour faire face à l'extérieur
          textMesh.rotation.y = Math.PI / 2;
          // Puis rotation de 90° autour de X pour être vertical sur l'aile
          textMesh.rotation.z = Math.PI / 2;
          if (markingAngle !== 0) {
            textMesh.rotation.x = (markingAngle * Math.PI) / 180;
          }
        } else if (marking.face === 'web' || marking.face === 'o') {
          // Face âme (web) - le texte doit être vertical et faire face à l'axe X positif
          // Rotation de 90° autour de Y pour faire face à X+
          textMesh.rotation.y = Math.PI / 2;
          // Appliquer l'angle de rotation du marking si nécessaire
          if (markingAngle !== 0) {
            textMesh.rotation.z = (markingAngle * Math.PI) / 180; // Rotation dans le plan de l'âme
          }
        } else if (marking.face === 'v' || marking.face === 'top' || !marking.face) {
          // Face supérieure - le texte doit être parallèle à la surface (rotation de -90° autour de X)
          // Cela place le texte à plat sur la surface supérieure
          textMesh.rotation.x = -Math.PI / 2;
          // Appliquer l'angle de rotation du marking autour de Y (vertical)
          if (markingAngle !== 0) {
            textMesh.rotation.y = (markingAngle * Math.PI) / 180; // Convertir en radians
          }
        } else if (marking.face === 'u' || marking.face === 'bottom') {
          // Face inférieure
          textMesh.rotation.x = Math.PI / 2;
          if (markingAngle !== 0) {
            textMesh.rotation.y = (markingAngle * Math.PI) / 180;
          }
        } else if (marking.face === 'front') {
          // Face avant - pas de rotation en X
          textMesh.rotation.x = 0;
          if (markingAngle !== 0) {
            textMesh.rotation.z = (markingAngle * Math.PI) / 180;
          }
        } else if (marking.face === 'back') {
          // Face arrière
          textMesh.rotation.x = 0;
          textMesh.rotation.y = Math.PI; // Retourner le texte
          if (markingAngle !== 0) {
            textMesh.rotation.z = -(markingAngle * Math.PI) / 180;
          }
        } else if (marking.face === 'left' || marking.face === 'right') {
          // Faces latérales
          textMesh.rotation.x = 0;
          textMesh.rotation.y = marking.face === 'left' ? -Math.PI / 2 : Math.PI / 2;
          if (markingAngle !== 0) {
            textMesh.rotation.z = (markingAngle * Math.PI) / 180;
          }
        }
        
        console.log(`📍 Marking positioned at: [${x.toFixed(1)}, ${(y || 0).toFixed(1)}, ${z.toFixed(1)}]`);
        console.log(`   From DSTV coords: [${marking.position[0]}, ${marking.position[1]}]`);
        console.log(`   Face: ${marking.face || 'default'}, Angle: ${markingAngle}°`);
        console.log(`   Rotation applied: x=${(textMesh.rotation.x * 180 / Math.PI).toFixed(1)}°, y=${(textMesh.rotation.y * 180 / Math.PI).toFixed(1)}°, z=${(textMesh.rotation.z * 180 / Math.PI).toFixed(1)}°`);
        console.log(`   ${element.materialType === 'tube' ? 'Tube' : 'Plate'} dimensions: ${length}x${width}x${thickness}mm`);
        if (element.metadata?.contour) {
          console.log(`   Contour points: ${element.metadata.contour.length}`);
        }
      }
      
      group.add(textMesh);
      console.log(`🎯 Created visible marking: "${text}" at Three.js position [${textMesh.position.x.toFixed(1)}, ${textMesh.position.y.toFixed(1)}, ${textMesh.position.z.toFixed(1)}]`);
    });
    
    return group;
  }
  
  /**
   * Crée des gravures réalistes sur la surface pour les markings/scribbings (ancienne méthode)
   */
  private createMarkingSprites(markings: MarkingData[], element: PivotElement): THREE.Group {
    const group = new THREE.Group();
    
    markings.forEach((marking: MarkingData, index) => {
      const text = marking.text || 'X';
      
      // Créer un plan pour la gravure (decal) - taille plus grande pour être visible
      const markingSize = marking.size || 20;
      const decalGeometry = new THREE.PlaneGeometry(markingSize * 4, markingSize * 2);
      
      // Créer un canvas pour le texte gravé
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;
      
      // Canvas haute résolution pour une gravure nette
      canvas.width = 512;
      canvas.height = 256;
      
      // Fond rouge pour debug - s'assurer que le marking est visible
      context.fillStyle = 'red';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // Style de gravure réaliste avec meilleur contraste
      if (marking.type === 'scribbing') {
        // Scribbing : trait profond blanc/jaune visible sur métal
        // Fond légèrement sombre pour simuler la gravure
        context.fillStyle = 'rgba(0, 0, 0, 0.3)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Texte blanc/jaune pour contraste
        context.strokeStyle = '#FFFF00';
        context.lineWidth = 4;
        context.font = `bold ${canvas.height * 0.7}px "Arial Black"`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Contour noir pour lisibilité
        context.strokeStyle = '#000000';
        context.lineWidth = 6;
        context.strokeText(text, canvas.width / 2, canvas.height / 2);
        
        // Texte jaune vif
        context.fillStyle = '#FFFF00';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        // Contour jaune plus fin
        context.strokeStyle = '#FFD700';
        context.lineWidth = 2;
        context.strokeText(text, canvas.width / 2, canvas.height / 2);
      } else {
        // Marking : gravure blanche/noire contrastée
        // Fond semi-transparent
        context.fillStyle = 'rgba(255, 255, 255, 0.2)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.font = `bold ${canvas.height * 0.6}px "Arial"`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Contour noir épais
        context.strokeStyle = '#000000';
        context.lineWidth = 4;
        context.strokeText(text, canvas.width / 2, canvas.height / 2);
        
        // Texte blanc
        context.fillStyle = '#FFFFFF';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
      }
      
      // Créer la texture
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      
      // Matériau opaque pour une meilleure visibilité
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 1.0, // Complètement opaque
        side: THREE.DoubleSide,
        depthWrite: true,
        depthTest: true,
        alphaTest: 0.01
      });
      
      const decal = new THREE.Mesh(decalGeometry, material);
      decal.name = `Marking_${index}`;
      
      // Positionner le decal sur la surface
      if (marking.position) {
        // Pour une plaque, l'épaisseur est sur Y
        // La surface supérieure est à thickness/2
        const surfaceY = element.dimensions.thickness ? element.dimensions.thickness / 2 + 0.5 : marking.position[1] + 0.5;
        
        decal.position.set(
          marking.position[0],
          surfaceY, // Sur la surface supérieure
          marking.position[2]
        );
        
        console.log(`📍 Decal position: x=${marking.position[0]}, y=${surfaceY}, z=${marking.position[2]}`);
      }
      
      // Orienter selon la face
      if (marking.rotation) {
        decal.rotation.set(
          marking.rotation[0],
          marking.rotation[1],
          marking.rotation[2]
        );
      } else if (marking.face === 'top') {
        // Pour une plaque horizontale, rotation pour que le texte soit lisible du dessus
        decal.rotation.x = -Math.PI / 2;
      }
      
      group.add(decal);
      
      console.log(`🔤 Created ${marking.type} engraving: "${text}" at position ${marking.position}`);
    });
    
    return group;
  }
  
  /**
   * Retire un élément de la scène
   */
  removeElement(id: string): void {
    const object = this.elementMeshes.get(id);
    
    if (object) {
      // Nettoyer les ressources
      this.disposeObject3D(object);
      
      // Retirer de la scène
      this.elementsGroup.remove(object);
      this.elementMeshes.delete(id);
      
      // Émettre l'événement
      this.eventBus.emit('scene:elementRemoved', { id });
    }
  }
  
  /**
   * Met à jour un élément
   */
  updateElement(element: PivotElement): void {
    const object = this.elementMeshes.get(element.id);
    
    if (object) {
      // Mettre à jour la transformation
      object.position.set(...element.position);
      object.rotation.set(...(element.rotation || [0, 0, 0]));
      object.scale.set(...(element.scale || [1, 1, 1]));
      
      // Mettre à jour les userData
      object.userData.element = element;
      
      // Émettre l'événement
      this.eventBus.emit('scene:elementUpdated', {
        id: element.id,
        element,
        object3D: object
      });
    }
  }
  
  /**
   * Définit la visibilité d'un élément
   */
  setElementVisibility(id: string, visible: boolean): void {
    const object = this.elementMeshes.get(id);
    
    if (object) {
      object.visible = visible;
      this.eventBus.emit('scene:visibilityChanged', { id, visible });
    }
  }
  
  /**
   * Active/désactive la grille
   */
  toggleGrid(enabled: boolean): void {
    if (this.grid) {
      this.grid.visible = enabled;
    }
    this.config.grid!.enabled = enabled;
  }
  
  /**
   * Met à jour l'éclairage
   */
  updateLighting(config: Partial<SceneConfig>): void {
    // Mettre à jour la configuration
    this.config = { ...this.config, ...config };
    
    // Recréer l'éclairage
    this.lightsGroup.clear();
    this.setupLighting();
  }
  
  /**
   * Définit la couleur de fond
   */
  setBackgroundColor(color: string): void {
    this.scene.background = new THREE.Color(color);
    this.config.backgroundColor = color;
  }
  
  /**
   * Met à jour la scène (appelé à chaque frame)
   */
  update(deltaTime: number, elapsedTime: number): void {
    // Animer les éléments si nécessaire
    this.elementMeshes.forEach((object, _id) => {
      // Animation personnalisée par élément
      if (object.userData.element?.metadata?.animated) {
        // Rotation simple pour l'exemple
        object.rotation.y += deltaTime * 0.5;
      }
    });
    
    // Émettre l'événement de mise à jour
    this.eventBus.emit('scene:updated', { deltaTime, elapsedTime });
  }
  
  /**
   * Calcule la boîte englobante de tous les éléments
   */
  getBoundingBox(): THREE.Box3 {
    const box = new THREE.Box3();
    
    this.elementMeshes.forEach(object => {
      const objectBox = new THREE.Box3().setFromObject(object);
      box.union(objectBox);
    });
    
    return box;
  }
  
  /**
   * Obtient un élément par son ID
   */
  getElement(id: string): THREE.Object3D | null {
    return this.elementMeshes.get(id) || null;
  }
  
  /**
   * Obtient tous les éléments
   */
  getAllElements(): Map<string, THREE.Object3D> {
    return new Map(this.elementMeshes);
  }
  
  /**
   * Effectue un raycast sur la scène
   */
  raycast(raycaster: THREE.Raycaster): THREE.Intersection[] {
    const objects: THREE.Object3D[] = [];
    
    // Collecter tous les meshes
    this.elementMeshes.forEach(group => {
      group.traverse(child => {
        if (child instanceof THREE.Mesh) {
          objects.push(child);
        }
      });
    });
    
    return raycaster.intersectObjects(objects, false);
  }
  
  /**
   * Nettoie un Object3D et ses enfants
   */
  private disposeObject3D(object: THREE.Object3D): void {
    object.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    
    // Retirer les enfants
    while (object.children.length > 0) {
      object.remove(object.children[0]);
    }
  }
  
  /**
   * Nettoie toutes les ressources
   */
  dispose(): void {
    // Nettoyer tous les éléments
    this.elementMeshes.forEach((object, id) => {
      this.removeElement(id);
    });
    
    // Nettoyer la grille
    if (this.grid) {
      this.grid.dispose();
      this.grid = null;
    }
    
    // Nettoyer les groupes
    this.scene.remove(this.elementsGroup);
    this.scene.remove(this.helpersGroup);
    this.scene.remove(this.lightsGroup);
    
    // Nettoyer les renderers
    this.geometryConverter.clearCache();
    this.visualFeatureRenderer.dispose();
    this.featureOutlineRenderer.dispose();
    
    // Émettre l'événement de nettoyage
    this.eventBus.emit('scene:disposed');
  }
  
  // === Getters ===
  
  getScene(): THREE.Scene {
    return this.scene;
  }
  
  getConfig(): SceneConfig {
    return { ...this.config };
  }
  
  getElementCount(): number {
    return this.elementMeshes.size;
  }
}