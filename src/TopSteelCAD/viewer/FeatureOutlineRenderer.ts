/**
 * FeatureOutlineRenderer - Rendu des contours visuels pour les features
 * Crée des anneaux et indicateurs visuels autour des trous et autres features
 * Gère également la surbrillance pour la sélection de features
 */
import * as THREE from 'three';
import { PivotElement, SelectableFeature, FeatureType } from '@/types/viewer';
import { EventBus } from '../core/EventBus';

export class FeatureOutlineRenderer {
  private outlineGroups: Map<string, THREE.Group> = new Map();
  private featureOutlines: Map<string, Map<string, THREE.Object3D>> = new Map();
  private selectedFeatures: Map<string, Set<string>> = new Map();
  private hoveredFeature: { elementId: string; featureId: string } | null = null;
  private eventBus: EventBus;
  
  // Matériaux pour la sélection
  private selectionMaterial: THREE.Material;
  private hoverMaterial: THREE.Material;
  private defaultMaterials: Map<string, THREE.Material[]> = new Map();
  
  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus || new EventBus();
    
    // Créer les matériaux de sélection - très visible
    this.selectionMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff00,      // Vert vif
      linewidth: 5,         // Ligne épaisse
      transparent: true,    // Transparent pour compatibilité
      opacity: 1.0,         // Complètement opaque
      depthTest: false,     // Toujours visible
      depthWrite: false     // Ne pas écrire dans le buffer de profondeur
    });
    
    this.hoverMaterial = new THREE.LineBasicMaterial({
      color: 0x66ff00,
      linewidth: 6,
      transparent: true,
      opacity: 0.8,
      depthTest: false
    });
    
    this.setupEventListeners();
  }
  
  /**
   * Configure les écouteurs d'événements pour la sélection
   */
  private setupEventListeners(): void {
    // Écouter les événements de surbrillance de features
    this.eventBus.on('scene:highlightFeature', (data: {
      elementId: string;
      featureId: string;
      highlight: boolean;
      color?: string;
      opacity?: number;
    }) => {
      this.highlightFeature(data.elementId, data.featureId, data.highlight, data.color);
    });
    
    // Écouter les événements de survol de features
    this.eventBus.on('scene:hoverFeature', (data: {
      elementId: string;
      featureId: string;
      hover: boolean;
      color?: string;
    }) => {
      this.hoverFeature(data.elementId, data.featureId, data.hover, data.color);
    });
    
    // Désactivé car SelectionManager émet déjà scene:highlightFeature pour chaque feature
    // Écouter les changements de sélection de features est redondant et cause des doubles appels
    // this.eventBus.on('feature:selection:changed', (data: {
    //   features: Array<{ elementId: string; featureId: string }>;
    // }) => {
    //   this.updateSelectedFeatures(data.features);
    // });
  }
  
  /**
   * Crée les contours visuels pour les features d'un élément
   * Priorité : utilise les features DSTV de l'élément si disponibles,
   * sinon utilise les données CSG de la géométrie
   */
  createFeatureOutlines(element: PivotElement, mesh: THREE.Mesh): THREE.Group {
    const group = new THREE.Group();
    group.name = `FeatureOutlines_${element.id}`;
    
    // Créer une map pour stocker les outlines de cet élément
    if (!this.featureOutlines.has(element.id)) {
      this.featureOutlines.set(element.id, new Map());
    }
    
    // Récupérer les informations sur les trous et découpes depuis la géométrie
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const holes = geometry.userData.holes || [];
    const cuts = geometry.userData.cuts || [];
    const meshYOffset = geometry.userData.yOffset || 0;
    
    console.log(`🔍 FeatureOutlineRenderer processing element ${element.id}:`);
    console.log(`  📊 Geometry userData:`, {
      hasUserData: !!geometry.userData,
      holes: holes.length,
      cuts: cuts.length,
      userDataKeys: geometry.userData ? Object.keys(geometry.userData) : 'no userData'
    });
    
    // IMPORTANT: Les outlines sont dans le même groupe que le mesh
    // Le mesh a un yOffset appliqué pour positionner le bas à y=0
    // Les positions des trous sont en coordonnées absolues
    // On doit soustraire le yOffset du mesh pour obtenir les coordonnées relatives
    
    console.log(`🔵 Creating outlines - Mesh yOffset: ${meshYOffset}`);
    
    // Récupérer les dimensions du profil pour avoir les bonnes épaisseurs
    const webThickness = element.dimensions?.webThickness || element.dimensions?.thickness || 8.6;
    const flangeThickness = element.dimensions?.flangeThickness || 10;
    const profileLength = element.dimensions?.length || 1912.15;
    
    // Créer des contours pour chaque trou
    holes.forEach((hole: any, index: number) => {
      // Utiliser l'ID depuis les features de l'élément si disponible
      let featureId = hole.id || `${element.id}_hole_${index}`;
      
      // Si l'élément a des features DSTV, essayer de matcher par ID d'abord
      // Les features peuvent être un tableau ou un objet avec des propriétés comme 'holes'
      let featuresArray: any[] = [];
      if (element.features) {
        if (Array.isArray(element.features)) {
          featuresArray = element.features;
        } else if (element.features.holes && Array.isArray(element.features.holes)) {
          featuresArray = element.features.holes;
        }
      }

      if (featuresArray.length > 0) {
        // D'abord essayer de matcher par l'ID du trou s'il contient dstv
        if (hole.id && hole.id.includes('dstv')) {
          featureId = hole.id;
        } else {
          // Sinon, chercher la feature correspondante par index et type
          const holeFeatures = featuresArray.filter((f: SelectableFeature) =>
            f.type === FeatureType.HOLE || f.type === FeatureType.SLOT || f.type === 'hole'
          );

          if (holeFeatures[index]) {
            featureId = holeFeatures[index].id;
            console.log(`🔗 Matched hole outline to DSTV feature by index: ${featureId}`);
          }
        }
      }
      
      // Enrichir les données du trou avec les bonnes épaisseurs selon la face
      // For L-profiles: thickness is the material thickness (typically 8mm)
      // For I-profiles: use webThickness for web, flangeThickness for flanges
      let actualDepth = hole.depth;
      if (!actualDepth || actualDepth > 10) {
        // Need to determine actual thickness based on face
        if (hole.face === 'front' || hole.face === 'h' || hole.face === 'back') {
          // For L-profiles FRONT/BACK faces, use the profile thickness
          actualDepth = webThickness; // For L-profiles, this is the actual thickness (8mm)
        } else if (hole.face === 'web' || hole.face === 'o') {
          actualDepth = webThickness;
        } else {
          actualDepth = flangeThickness;
        }
      }
      
      const enrichedHole = {
        ...hole,
        id: featureId,
        depth: actualDepth,
        actualThickness: webThickness, // Pass the actual material thickness
        profileLength: profileLength
      };
      
      // IMPORTANT: Les positions des trous sont en coordonnées centrées (avant yOffset)
      // Mais le mesh a été décalé de meshYOffset vers le haut
      // On doit compenser ce décalage pour aligner les outlines avec les trous
      const outline = this.createHoleOutline(enrichedHole, index, meshYOffset);
      if (outline) {
        // Ajouter des données utilisateur pour l'interaction
        outline.userData = {
          featureId,
          featureType: hole.type || 'hole',
          elementId: element.id,
          selectable: true
        };
        
        // Stocker la référence pour la sélection
        this.featureOutlines.get(element.id)!.set(featureId, outline);
        
        group.add(outline);
      }
    });
    
    // Créer des contours pour chaque découpe (notch/cut)
    cuts.forEach((cut: any, index: number) => {
      // Utiliser l'ID depuis les features de l'élément si disponible
      let featureId = cut.id || `${element.id}_cut_${index}`;
      
      // Si l'élément a des features DSTV, essayer de matcher par ID d'abord
      let featuresArrayForCuts: any[] = [];
      if (element.features) {
        if (Array.isArray(element.features)) {
          featuresArrayForCuts = element.features;
        } else if (element.features.cuts && Array.isArray(element.features.cuts)) {
          featuresArrayForCuts = element.features.cuts;
        }
      }

      if (featuresArrayForCuts.length > 0) {
        // D'abord essayer de matcher par l'ID de la découpe s'il contient dstv
        if (cut.id && cut.id.includes('dstv')) {
          featureId = cut.id;
        } else {
          // Sinon, chercher la feature correspondante par index et type
          const cutFeatures = featuresArrayForCuts.filter((f: SelectableFeature) =>
            f.type === FeatureType.CUT || f.type === FeatureType.NOTCH ||
            f.type === FeatureType.CUTOUT || f.type === FeatureType.CONTOUR
          );
          
          if (cutFeatures[index]) {
            featureId = cutFeatures[index].id;
            console.log(`🔗 Matched cut outline to DSTV feature by index: ${featureId}`);
          }
        }
      }
      
      // Créer l'outline pour la découpe
      const outline = this.createCutOutline(cut, index, meshYOffset, element);
      if (outline) {
        // Ajouter des données utilisateur pour l'interaction
        outline.userData = {
          featureId,
          featureType: cut.type || 'cut',
          elementId: element.id,
          selectable: true
        };
        
        // Stocker la référence pour la sélection
        this.featureOutlines.get(element.id)!.set(featureId, outline);
        
        group.add(outline);
      }
    });
    
    // NOTE: Réactivé uniquement pour les features qui ne sont PAS dans userData
    // Les cuts passent par userData.cuts, mais d'autres features peuvent avoir besoin de ce traitement
    // this.processDSTVFeatures(element, group, meshYOffset);
    
    // Ajouter/remplacer les features pour la hiérarchie
    // Si des features CUT_WITH_NOTCHES existent, les remplacer par les notches individuelles
    if (element.features && element.features.length > 0) {
      // Filtrer les features CUT_WITH_NOTCHES qui seront remplacées par les notches
      const cutWithNotchesFeatures = element.features.filter(f => 
        f.id.includes('cut-with-notches') || f.metadata?.contourType === 'cut_with_notches'
      );
      
      // Si on a des cuts avec notches, les retirer de la liste
      if (cutWithNotchesFeatures.length > 0 && cuts.length > 0) {
        element.features = element.features.filter(f => 
          !f.id.includes('cut-with-notches') && f.metadata?.contourType !== 'cut_with_notches'
        );
        
        // Ajouter les notches individuelles à la place
        cuts.forEach((cut: any) => {
          const featureId = cut.id;
          const feature: SelectableFeature = {
            id: featureId,
            type: cut.type === 'notch' ? FeatureType.NOTCH : 
                cut.type === 'END_CUT' ? FeatureType.END_CUT : FeatureType.CUT,
            elementId: element.id,
            position: [cut.bounds?.minZ || 0, cut.bounds?.minY || 0, 0] as [number, number, number],
            boundingBox: cut.bounds || {},
            selectable: true,
            visible: true,
            metadata: cut
          };
          if (element.features) {
            element.features.push(feature);
          }
        });
      }
    } else if (!element.features || element.features.length === 0) {
      // Pas de features existantes, créer depuis userData
      element.features = [];
      
      // Ajouter toutes les découpes
      cuts.forEach((cut: any) => {
        const feature: SelectableFeature = {
          id: cut.id,
          type: cut.type === 'notch' ? FeatureType.NOTCH : 
                cut.type === 'END_CUT' ? FeatureType.END_CUT : FeatureType.CUT,
          elementId: element.id,
          position: [cut.bounds?.minZ || 0, cut.bounds?.minY || 0, 0] as [number, number, number],
          boundingBox: cut.bounds || {},
          selectable: true,
          visible: true,
          metadata: cut
        };
        if (element.features) {
          element.features.push(feature);
        }
      });
      
      holes.forEach((hole: any, index: number) => {
        // Use existing ID from DSTV or generate a unique one with element ID
        const featureId = hole.id || `${element.id}_hole_${index}`;
        const position = hole.position || [0, 0, 0];
        
        // Check if feature already exists to avoid duplicates
        const existingFeature = element.features?.find(f => f.id === featureId);
        if (existingFeature) {
          console.warn(`Feature ${featureId} already exists for element ${element.id}, skipping duplicate`);
          return;
        }
        
        const feature: SelectableFeature = {
          id: featureId,
          type: (hole.type === 'slotted' ? FeatureType.SLOT : FeatureType.HOLE),
          elementId: element.id,
          position: position as [number, number, number],
          boundingBox: {
            min: [
              position[0] - hole.diameter/2,
              position[1] - hole.diameter/2,
              position[2] - hole.diameter/2
            ],
            max: [
              position[0] + hole.diameter/2,
              position[1] + hole.diameter/2,
              position[2] + hole.diameter/2
            ]
          },
          selectable: true,
          visible: true,
          metadata: hole
        };
        
        if (element.features) {
          element.features.push(feature);
        }
      });
    }
    
    // Stocker la référence
    this.outlineGroups.set(element.id, group);
    
    // Log des features créées pour le débogage
    const featureIds = this.featureOutlines.get(element.id);
    if (featureIds) {
      console.log(`📋 Created outlines for element ${element.id}:`, {
        totalOutlines: featureIds.size,
        featureIds: Array.from(featureIds.keys()),
        elementFeatures: (() => {
          if (!element.features) return [];
          if (Array.isArray(element.features)) {
            return element.features.map(f => f.id);
          }
          // Si features est un objet, collecter toutes les features de tous les types
          const allFeatures = [];
          if (element.features.holes && Array.isArray(element.features.holes)) {
            allFeatures.push(...element.features.holes.map(h => h.id));
          }
          if (element.features.cuts && Array.isArray(element.features.cuts)) {
            allFeatures.push(...element.features.cuts.map(c => c.id));
          }
          return allFeatures;
        })()
      });
    }
    
    return group;
  }
  
  /**
   * Crée un contour visuel pour un trou
   * @param hole - Les données du trou
   * @param index - L'index du trou
   * @param yAdjustment - L'ajustement Y pour compenser le yOffset du mesh parent
   */
  private createHoleOutline(hole: any, index: number, yAdjustment: number = 0): THREE.Object3D | null {
    const diameter = hole.diameter || 10;
    // CORRECTION: Utiliser les coordonnées DSTV originales si disponibles
    const originalPos = hole.originalPosition || hole.originalDSTVCoords || hole.position || [0, 0, 0];
    const position = hole.position || [0, 0, 0];
    const rotation = hole.rotation || [0, 0, 0];
    const face = hole.face || 'web';
    
    // Use the depth that was calculated in createFeatureOutlines based on actual profile dimensions
    // This should already be the correct material thickness (8mm for L-profiles)
    const depth = hole.depth || hole.actualThickness || 8;
    
    console.log(`🔵 Hole outline depth calculation:`, {
      hole_depth: hole.depth,
      hole_thickness: hole.thickness,
      final_depth: depth,
      face
    });
    
    // IMPORTANT: NE PAS convertir la position Z !
    // Les positions des trous sont DÉJÀ en coordonnées Three.js
    // (elles viennent de holeBrush.position qui est déjà dans le bon système)
    const correctedPosition = [
      position[0],
      position[1],
      position[2]  // Utiliser directement la position Z du trou
    ];
    
    console.log(`🔵 Creating hole outline ${index}:`, {
      position: correctedPosition,
      originalPosition: originalPos,
      originalDSTVCoords: hole.originalDSTVCoords,
      rotation,
      diameter,
      depth,
      face,
      yAdjustment
    });
    
    // Créer un groupe pour le contour
    const outlineGroup = new THREE.Group();
    outlineGroup.name = `HoleOutline_${index}`;
    
    // Créer un contour en ligne (LineLoop) au lieu d'un anneau plein
    const radius = diameter / 2; // Diamètre exact du trou
    const segments = 32;
    
    // Créer DEUX cercles : un à l'entrée et un à la sortie du trou
    const colors = [0xffff00, 0xffff00]; // Jaune pour les deux côtés (plus visible)
    
    // Déterminer l'orientation du trou selon la rotation ET la face
    // La rotation indique comment le cylindre est orienté
    // rotation[0] = π/2 signifie rotation de 90° autour de X (cylindre selon Z)
    // rotation[1] = π/2 signifie rotation de 90° autour de Y (cylindre selon X)
    // rotation[2] = π/2 signifie rotation de 90° autour de Z (cylindre selon X)
    // rotation = [0,0,0] signifie cylindre vertical (selon Y)
    let positions: THREE.Vector3[];
    const halfDepth = depth / 2;

    // Check rotation to determine hole direction
    const isRotatedAroundZ = Math.abs(rotation[2] - Math.PI/2) < 0.01 || Math.abs(rotation[2] + Math.PI/2) < 0.01;
    const isRotatedAroundX = Math.abs(rotation[0] - Math.PI/2) < 0.01 || Math.abs(rotation[0] + Math.PI/2) < 0.01;
    const isRotatedAroundY = Math.abs(rotation[1] - Math.PI/2) < 0.01 || Math.abs(rotation[1] + Math.PI/2) < 0.01;

    // Pour la face 'v' (âme), le trou a une rotation X de 90° et traverse selon Z
    if (face === 'v' && isRotatedAroundX) {
      // Trou sur l'âme (web) - traverse selon Z après rotation X de 90°
      positions = [
        new THREE.Vector3(
          correctedPosition[0], // X: position le long du profil
          correctedPosition[1] + yAdjustment, // Y: position verticale
          -halfDepth  // Z: entrée du trou
        ), // Entry
        new THREE.Vector3(
          correctedPosition[0], // X: position le long du profil
          correctedPosition[1] + yAdjustment, // Y: position verticale
          halfDepth  // Z: sortie du trou
        ) // Exit
      ];
    } else if (face === 'l' || face === 'r') {
      // Faces latérales (gauche/droite) - vue de côté
      // Pour une vue de côté, le trou traverse l'âme horizontalement
      // L'outline doit montrer le trou vu de côté (profondeur selon X)

      // Pour la face 'l' (gauche), on voit le trou depuis la gauche
      // Pour la face 'r' (droite), on voit le trou depuis la droite
      // Dans les deux cas, le trou traverse l'âme (webThickness)

      const webThickness = depth; // L'épaisseur à traverser
      positions = [
        new THREE.Vector3(
          correctedPosition[0], // X: position le long du profil
          correctedPosition[1] + yAdjustment, // Y: position verticale
          correctedPosition[2] - webThickness/2  // Z: bord gauche de l'âme
        ), // Entry
        new THREE.Vector3(
          correctedPosition[0], // X: position le long du profil
          correctedPosition[1] + yAdjustment, // Y: position verticale
          correctedPosition[2] + webThickness/2  // Z: bord droit de l'âme
        ) // Exit
      ];
    } else if (isRotatedAroundZ || face === 'h' || face === 'front' || face === 'back') {
      // Hole traverses along X axis (rotation around Z)
      // For FRONT face holes on L-profiles:
      // - The hole should go from X=0 (outer face) to X=depth (inner face)
      // - The hole position might be adjusted, but outline should show actual extent
      positions = [
        new THREE.Vector3(
          0, // X: outer face at X=0 for FRONT face
          correctedPosition[1] + yAdjustment, // Y: vertical position
          correctedPosition[2]  // Z: position along profile
        ), // Entry
        new THREE.Vector3(
          depth, // X: inner face at X=thickness
          correctedPosition[1] + yAdjustment, // Y: vertical position
          correctedPosition[2]  // Z: position along profile
        ) // Exit
      ];
    } else if (face === 'o' || face === 'u') {
      // Trous sur les semelles (top/bottom flanges) - traversent verticalement selon Y
      positions = [
        new THREE.Vector3(
          correctedPosition[0], // X: position le long du profil
          correctedPosition[1] - halfDepth + yAdjustment, // Y: entrée du trou
          correctedPosition[2]  // Z: position transversale
        ), // Entry
        new THREE.Vector3(
          correctedPosition[0], // X: position le long du profil
          correctedPosition[1] + halfDepth + yAdjustment, // Y: sortie du trou
          correctedPosition[2]  // Z: position transversale
        ) // Exit
      ];
    } else if (face === 'web') {
      // WEB holes for I-profiles - centered at X=0
      positions = [
        new THREE.Vector3(
          -depth/2, // X: entry point
          correctedPosition[1] + yAdjustment, // Y: vertical position
          correctedPosition[2]  // Z: position along profile
        ), // Entry
        new THREE.Vector3(
          depth/2, // X: exit point
          correctedPosition[1] + yAdjustment, // Y: vertical position
          correctedPosition[2]  // Z: position along profile
        ) // Exit
      ];
    } else if (isRotatedAroundX && face !== 'v') {
      // Hole traverses along Z axis (rotation around X)
      positions = [
        new THREE.Vector3(
          correctedPosition[0], // X
          correctedPosition[1] + yAdjustment, // Y
          correctedPosition[2] - halfDepth  // Z: entry point
        ), // Entry
        new THREE.Vector3(
          correctedPosition[0], // X
          correctedPosition[1] + yAdjustment, // Y
          correctedPosition[2] + halfDepth  // Z: exit point
        ) // Exit
      ];
    } else {
      // Hole traverses along Y axis (no rotation or vertical)
      positions = [
        new THREE.Vector3(
          correctedPosition[0], // X
          correctedPosition[1] - halfDepth + yAdjustment, // Y: entry point
          correctedPosition[2]  // Z
        ), // Entry
        new THREE.Vector3(
          correctedPosition[0], // X
          correctedPosition[1] + halfDepth + yAdjustment, // Y: exit point
          correctedPosition[2]  // Z
        ) // Exit
      ];
    }
    
    positions.forEach((pos, idx) => {
      const points = [];
      
      // Créer les points du cercle selon l'orientation du trou (basé sur la rotation)
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        
        if (isRotatedAroundZ || face === 'h' || face === 'front' || face === 'back' || face === 'web' || face === 'o') {
          // Pour les trous traversant selon X, créer le cercle dans le plan YZ
          points.push(new THREE.Vector3(
            0,                           // X 
            Math.cos(angle) * radius,    // Y
            Math.sin(angle) * radius     // Z
          ));
        } else if (isRotatedAroundX) {
          // Pour les trous traversant selon Z, créer le cercle dans le plan XY
          points.push(new THREE.Vector3(
            Math.cos(angle) * radius,    // X
            Math.sin(angle) * radius,    // Y
            0                            // Z
          ));
        } else {
          // Pour les trous traversant selon Y (verticaux), créer le cercle dans le plan XZ
          points.push(new THREE.Vector3(
            Math.cos(angle) * radius,    // X
            0,                           // Y 
            Math.sin(angle) * radius     // Z
          ));
        }
      }
      
      // Créer la géométrie de ligne
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      
      // Matériau de ligne lumineux
      const lineMaterial = new THREE.LineBasicMaterial({
        color: colors[idx],  // Vert ou jaune selon entrée/sortie
        linewidth: 5,        // Épaisseur de ligne augmentée
        transparent: true,
        opacity: 0.8,        // Bien visible
        depthTest: false     // Toujours visible même derrière la géométrie
      });
      
      // Créer le contour en ligne
      const ringMesh = new THREE.LineLoop(lineGeometry, lineMaterial);
      
      // Positionner l'anneau à l'extrémité correspondante
      ringMesh.position.copy(pos);
      
      // Pas besoin de rotation supplémentaire - le cercle est déjà orienté correctement
      
      console.log(`  -> Ring ${idx + 1} at: [${pos.x}, ${pos.y}, ${pos.z}] (rounded: [${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}])`);
      
      outlineGroup.add(ringMesh);
    });
    
    // Ajouter une ligne reliant les deux cercles pour visualiser l'axe du trou
    // L'axe suit la rotation du trou
    let axisPoints: THREE.Vector3[];
    if (isRotatedAroundZ || face === 'h' || face === 'front' || face === 'back') {
      // Axe selon X - trou traverse selon X (L-profiles)
      // From outer face to inner face
      axisPoints = [
        new THREE.Vector3(0, correctedPosition[1] + yAdjustment, correctedPosition[2]),
        new THREE.Vector3(depth, correctedPosition[1] + yAdjustment, correctedPosition[2])
      ];
    } else if (face === 'web' || face === 'o') {
      // Axe selon X - trou traverse selon X (I-profiles WEB)
      axisPoints = [
        new THREE.Vector3(-depth/2, correctedPosition[1] + yAdjustment, correctedPosition[2]),
        new THREE.Vector3(depth/2, correctedPosition[1] + yAdjustment, correctedPosition[2])
      ];
    } else if (isRotatedAroundX) {
      // Axe selon Z - trou traverse selon Z
      axisPoints = [
        new THREE.Vector3(correctedPosition[0], correctedPosition[1] + yAdjustment, correctedPosition[2] - halfDepth),
        new THREE.Vector3(correctedPosition[0], correctedPosition[1] + yAdjustment, correctedPosition[2] + halfDepth)
      ];
    } else {
      // Axe selon Y - trou traverse selon Y (vertical)
      axisPoints = [
        new THREE.Vector3(correctedPosition[0], correctedPosition[1] - halfDepth + yAdjustment, correctedPosition[2]),
        new THREE.Vector3(correctedPosition[0], correctedPosition[1] + halfDepth + yAdjustment, correctedPosition[2])
      ];
    }
    const axisGeometry = new THREE.BufferGeometry().setFromPoints(axisPoints);
    const axisMaterial = new THREE.LineBasicMaterial({
      color: 0xff00ff,  // Magenta pour l'axe (plus visible)
      linewidth: 3,
      transparent: true,
      opacity: 0.6,      // Visible mais pas trop
      depthTest: false   // Toujours visible
    });
    const axisLine = new THREE.Line(axisGeometry, axisMaterial);
    // L'axe est déjà positionné correctement dans axisPoints
    // Pas de rotation nécessaire - l'axe est déjà orienté correctement
    outlineGroup.add(axisLine);
    
    // Pour les trous oblongs, créer une forme oblongue au lieu d'un cercle
    if (hole.type === 'slotted' && hole.slottedLength) {
      const slottedOutline = this.createSlottedHoleOutline(hole);
      if (slottedOutline) {
        // Remplacer les anneaux circulaires par la forme oblongue
        // Note: Les anneaux ont déjà été ajoutés dans outlineGroup
        // On nettoie tout et on ajoute la forme oblongue
        outlineGroup.clear();
        // Appliquer le décalage Y à la forme oblongue
        slottedOutline.position.y += yAdjustment;
        outlineGroup.add(slottedOutline);
        outlineGroup.add(axisLine); // Ré-ajouter l'axe
      }
    }
    
    return outlineGroup;
  }
  
  /**
   * Met en surbrillance une feature
   */
  private highlightFeature(elementId: string, featureId: string, highlight: boolean, color?: string): void {
    console.log(`🎯 highlightFeature called:`, { elementId, featureId, highlight, color });
    
    let elementOutlines = this.featureOutlines.get(elementId);
    
    // Si pas trouvé avec l'ID exact, essayer de trouver par préfixe (sans le timestamp)
    if (!elementOutlines) {
      // Extraire le préfixe de l'ID (avant le timestamp)
      const elementPrefix = elementId.split('_').slice(0, 3).join('_'); // Ex: "unknown_001_M1002"
      
      // Chercher un élément qui correspond au préfixe
      for (const [key, value] of this.featureOutlines.entries()) {
        if (key.startsWith(elementPrefix)) {
          elementOutlines = value;
          console.log(`🔄 Found element by prefix: ${key}`);
          break;
        }
      }
      
      if (!elementOutlines) {
        console.warn(`⚠️ No outlines found for element ${elementId}`);
        console.log('Available elements:', Array.from(this.featureOutlines.keys()));
        return;
      }
    }
    
    let outline = elementOutlines.get(featureId);
    
    // Si pas trouvé avec l'ID exact, essayer des variantes
    if (!outline) {
      // Essayer de trouver par préfixe ou pattern similaire
      for (const [key, value] of elementOutlines.entries()) {
        // Vérifier si les IDs sont similaires (même base mais suffixes différents)
        if (key === featureId || 
            key.includes(featureId) || 
            featureId.includes(key) ||
            (key.replace(/_notch_\d+$/, '') === featureId.replace(/_notch_\d+$/, ''))) {
          outline = value;
          console.log(`🔄 Found feature by pattern match: ${key}`);
          break;
        }
      }
      
      if (!outline) {
        console.warn(`⚠️ No outline found for feature ${featureId} in element ${elementId}`);
        console.log('Available features:', Array.from(elementOutlines.keys()));
        return;
      }
    }
    
    console.log(`✅ Found outline for feature ${featureId}, applying highlight:`, highlight);
    console.log('   Outline details:', {
      visible: outline.visible,
      parent: outline.parent?.name,
      children: outline.children.length,
      position: outline.position,
      scale: outline.scale
    });
    
    // S'assurer que l'outline et tous ses enfants sont visibles lors de la sélection
    outline.visible = true;
    outline.traverse((child) => {
      child.visible = true;
    });
    
    if (highlight) {
      // Sauvegarder les matériaux originaux
      if (!this.defaultMaterials.has(featureId)) {
        const materials: THREE.Material[] = [];
        outline.traverse((child) => {
          if (child instanceof THREE.Line || child instanceof THREE.LineLoop) {
            materials.push(child.material as THREE.Material);
          }
        });
        this.defaultMaterials.set(featureId, materials);
      }
      
      // Appliquer le matériau de sélection
      const material = color ? new THREE.LineBasicMaterial({
        color: new THREE.Color(color),
        linewidth: 8,
        transparent: true,
        opacity: 1.0,
        depthTest: false
      }) : this.selectionMaterial;
      
      outline.traverse((child) => {
        if (child instanceof THREE.Line || child instanceof THREE.LineLoop) {
          child.material = material;
        }
      });
      
      // Ajouter à la liste des features sélectionnées
      if (!this.selectedFeatures.has(elementId)) {
        this.selectedFeatures.set(elementId, new Set());
      }
      this.selectedFeatures.get(elementId)!.add(featureId);
      
    } else {
      // Restaurer les matériaux originaux
      const originalMaterials = this.defaultMaterials.get(featureId);
      if (originalMaterials) {
        let materialIndex = 0;
        outline.traverse((child) => {
          if (child instanceof THREE.Line || child instanceof THREE.LineLoop) {
            if (materialIndex < originalMaterials.length) {
              child.material = originalMaterials[materialIndex++];
              child.visible = true; // S'assurer que l'outline reste visible
            }
          }
        });
      }
      
      // S'assurer que l'outline reste visible même après déselection
      outline.visible = true;
      
      // Retirer de la liste des features sélectionnées
      const elementFeatures = this.selectedFeatures.get(elementId);
      if (elementFeatures) {
        elementFeatures.delete(featureId);
        if (elementFeatures.size === 0) {
          this.selectedFeatures.delete(elementId);
        }
      }
    }
  }
  
  /**
   * Gère le survol d'une feature
   */
  private hoverFeature(elementId: string, featureId: string, hover: boolean, color?: string): void {
    // Ne pas survoler si la feature est sélectionnée
    if (this.selectedFeatures.get(elementId)?.has(featureId)) {
      return;
    }
    
    const elementOutlines = this.featureOutlines.get(elementId);
    if (!elementOutlines) return;
    
    const outline = elementOutlines.get(featureId);
    if (!outline) return;
    
    if (hover) {
      // Sauvegarder l'état précédent si nécessaire
      if (!this.defaultMaterials.has(`hover_${featureId}`)) {
        const materials: THREE.Material[] = [];
        outline.traverse((child) => {
          if (child instanceof THREE.Line || child instanceof THREE.LineLoop) {
            materials.push(child.material as THREE.Material);
          }
        });
        this.defaultMaterials.set(`hover_${featureId}`, materials);
      }
      
      // Appliquer le matériau de survol
      const material = color ? new THREE.LineBasicMaterial({
        color: new THREE.Color(color),
        linewidth: 6,
        transparent: true,
        opacity: 0.8,
        depthTest: false
      }) : this.hoverMaterial;
      
      outline.traverse((child) => {
        if (child instanceof THREE.Line || child instanceof THREE.LineLoop) {
          child.material = material;
        }
      });
      
      this.hoveredFeature = { elementId, featureId };
      
    } else {
      // Restaurer l'état précédent
      const originalMaterials = this.defaultMaterials.get(`hover_${featureId}`);
      if (originalMaterials) {
        let materialIndex = 0;
        outline.traverse((child) => {
          if (child instanceof THREE.Line || child instanceof THREE.LineLoop) {
            if (materialIndex < originalMaterials.length) {
              child.material = originalMaterials[materialIndex++];
            }
          }
        });
        this.defaultMaterials.delete(`hover_${featureId}`);
      }
      
      if (this.hoveredFeature?.featureId === featureId) {
        this.hoveredFeature = null;
      }
    }
  }
  
  /**
   * Met à jour les features sélectionnées
   */
  private updateSelectedFeatures(features: Array<{ elementId: string; featureId: string }>): void {
    // Désélectionner toutes les features actuelles
    this.selectedFeatures.forEach((featureIds, elementId) => {
      featureIds.forEach(featureId => {
        this.highlightFeature(elementId, featureId, false);
      });
    });
    this.selectedFeatures.clear();
    
    // Sélectionner les nouvelles features
    features.forEach(({ elementId, featureId }) => {
      this.highlightFeature(elementId, featureId, true);
    });
  }
  
  /**
   * Obtient les features sélectionnables pour un élément
   */
  getSelectableFeatures(elementId: string): SelectableFeature[] {
    const element = this.outlineGroups.get(elementId);
    if (!element) return [];
    
    const features: SelectableFeature[] = [];
    const elementOutlines = this.featureOutlines.get(elementId);
    
    if (elementOutlines) {
      elementOutlines.forEach((outline, featureId) => {
        if (outline.userData.selectable) {
          features.push({
            id: featureId,
            type: outline.userData.featureType || FeatureType.HOLE,
            elementId,
            position: [outline.position.x, outline.position.y, outline.position.z],
            selectable: true,
            visible: outline.visible,
            highlighted: this.selectedFeatures.get(elementId)?.has(featureId) || false
          });
        }
      });
    }
    
    return features;
  }
  
  /**
   * Traite spécifiquement les features DSTV pour créer leurs outlines
   */
  private processDSTVFeatures(element: PivotElement, group: THREE.Group, meshYOffset: number): void {
    // Normaliser features en tableau
    let featuresArray: any[] = [];
    if (element.features) {
      if (Array.isArray(element.features)) {
        featuresArray = element.features;
      } else {
        // Si c'est un objet, extraire toutes les features
        if (element.features.holes && Array.isArray(element.features.holes)) {
          featuresArray.push(...element.features.holes);
        }
        if (element.features.cuts && Array.isArray(element.features.cuts)) {
          featuresArray.push(...element.features.cuts);
        }
      }
    }

    if (featuresArray.length === 0) {
      return;
    }

    console.log(`🎯 Processing ${featuresArray.length} DSTV features for element ${element.id}`);

    featuresArray.forEach((feature: any, _index: number) => {
      // Normaliser le type en majuscules
      const featureType = (feature.type || '').toUpperCase();
      
      // SKIP HOLES - ils sont déjà traités dans geometry.userData.holes
      if (featureType === 'HOLE') {
        console.log(`⏭️ Skipping HOLE feature ${feature.id} - already processed from geometry.userData.holes`);
        return;
      }
      if (featureType !== 'END_CUT' && featureType !== 'NOTCH' && featureType !== 'CUT_WITH_NOTCHES') {
        console.log(`⏭️ Skipping feature ${feature.id} with type ${feature.type} (${featureType})`);
        return;
      }
      
      console.log(`🔹 Creating outline for DSTV cut feature: ${feature.id} (${feature.type})`);
      
      let outline: THREE.Object3D | null = null;
      
      if (featureType === 'END_CUT') {
        // Créer un outline pour une coupe d'extrémité
        outline = this.createDSTVEndCutOutline(feature, meshYOffset, element);
      } else if (featureType === 'NOTCH' || featureType === 'CUT_WITH_NOTCHES') {
        // Créer un outline pour une encoche
        outline = this.createDSTVNotchOutline(feature, meshYOffset, element);
      }
      
      if (outline) {
        // Ajouter des données utilisateur pour l'interaction
        outline.userData = {
          featureId: feature.id,
          featureType: feature.type.toLowerCase(),
          elementId: element.id,
          selectable: true
        };
        
        // Stocker la référence pour la sélection
        this.featureOutlines.get(element.id)!.set(feature.id, outline);
        
        group.add(outline);
        
        console.log(`✅ Added outline for DSTV feature: ${feature.id}`);
      }
    });
  }
  
  /**
   * Crée un outline pour un trou DSTV
   */
  private createDSTVHoleOutline(feature: any, meshYOffset: number, _element: PivotElement): THREE.Object3D | null {
    // La position peut être un tableau [x, y, z] ou un objet {x, y, z}
    const position = feature.position;
    const params = feature.metadata || feature.parameters;
    
    if (!position) {
      console.warn(`⚠️ Missing position for DSTV hole: ${feature.id}`);
      return null;
    }
    
    // Gérer position comme tableau ou objet
    const posX = Array.isArray(position) ? position[0] : (position.x || 0);
    const posY = Array.isArray(position) ? position[1] : (position.y || 0);
    const posZ = Array.isArray(position) ? (position[2] || 0) : (position.z || 0);
    
    const diameter = params?.diameter || 17.5; // Diamètre par défaut depuis les logs DSTV
    const radius = diameter / 2;
    
    // Créer un cercle pour représenter le trou
    const geometry = new THREE.RingGeometry(radius - 0.5, radius + 0.5, 16);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      transparent: true, 
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    
    const circle = new THREE.Mesh(geometry, material);
    
    // Positionner le cercle
    circle.position.set(
      posX,
      posY - meshYOffset,
      posZ
    );
    
    // Orienter selon la face
    const face = feature.face || params?.face;
    if (face === 'top_flange' || face === 'bottom_flange') {
      circle.rotation.x = Math.PI / 2;
    }
    
    return circle;
  }
  
  /**
   * Crée un outline pour une coupe d'extrémité DSTV
   */
  private createDSTVEndCutOutline(feature: any, meshYOffset: number, element: PivotElement): THREE.Object3D | null {
    try {
      // END_CUT features have parameters in metadata
      const params = feature.metadata || feature.parameters;
      if (!params) {
        console.warn(`[FeatureOutlineRenderer] END_CUT feature ${feature.id} missing parameters/metadata`);
        return null;
      }

      const chamferLength = params.chamferLength || 50; // Default from DSTV logs
      const angle = params.angle || 0;
      const cutPosition = params.position || params.cutPosition || 'start';
      
      // Position peut être un tableau ou un objet
      const position = feature.position;
      if (!position) {
        console.warn(`[FeatureOutlineRenderer] END_CUT feature ${feature.id} missing position`);
        return null;
      }
      
      // Gérer position comme tableau ou objet
      const posX = Array.isArray(position) ? position[0] : (position.x || 0);
      const posY = Array.isArray(position) ? position[1] : (position.y || 0);
      const posZ = Array.isArray(position) ? (position[2] || 0) : (position.z || 0);

      // Create a simple chamfer visualization at the cut position
      const geometry = new THREE.PlaneGeometry(chamferLength, chamferLength * 0.5);
      
      const material = new THREE.MeshBasicMaterial({ 
        color: 0xff4444,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      });

      const outline = new THREE.Mesh(geometry, material);
      
      // Position the outline at the feature position
      outline.position.set(
        posX,
        posY + meshYOffset,
        posZ
      );

      // Rotate based on the cut angle
      if (angle !== 0) {
        outline.rotation.z = (angle * Math.PI) / 180;
      }

      outline.userData = { 
        type: 'dstv-end-cut-outline',
        featureId: feature.id,
        elementId: element.id,
        chamferLength,
        angle,
        cutPosition
      };

      return outline;

    } catch (error) {
      console.error(`[FeatureOutlineRenderer] Error creating DSTV END_CUT outline for feature ${feature.id}:`, error);
      return null;
    }
  }
  
  /**
   * Crée un outline pour une encoche DSTV (NOTCH ou CUT_WITH_NOTCHES)
   */
  private createDSTVNotchOutline(feature: any, meshYOffset: number, element: PivotElement): THREE.Object3D | null {
    try {
      const params = feature.metadata || feature.parameters;
      if (!params) {
        console.warn(`[FeatureOutlineRenderer] NOTCH feature ${feature.id} missing parameters/metadata`);
        return null;
      }

      // Position peut être un tableau ou un objet
      const position = feature.position;
      if (!position) {
        console.warn(`[FeatureOutlineRenderer] NOTCH feature ${feature.id} missing position`);
        return null;
      }
      
      // Gérer position comme tableau ou objet
      const posX = Array.isArray(position) ? position[0] : (position.x || 0);
      const posY = Array.isArray(position) ? position[1] : (position.y || 0);
      const posZ = Array.isArray(position) ? (position[2] || 0) : (position.z || 0);

      // Dimensions par défaut pour une encoche
      const width = params.width || 100;
      const height = params.height || 50;
      
      // Créer une forme d'encoche simple
      const shape = new THREE.Shape();
      shape.moveTo(-width/2, 0);
      shape.lineTo(-width/2, height);
      shape.lineTo(width/2, height);
      shape.lineTo(width/2, 0);
      shape.lineTo(-width/2, 0);
      
      const geometry = new THREE.ShapeGeometry(shape);
      
      const material = new THREE.MeshBasicMaterial({ 
        color: 0xffaa00,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      });

      const outline = new THREE.Mesh(geometry, material);
      
      // Position the outline at the feature position
      outline.position.set(
        posX,
        posY + meshYOffset,
        posZ
      );

      outline.userData = { 
        type: 'dstv-notch-outline',
        featureId: feature.id,
        elementId: element.id,
        width,
        height
      };

      return outline;

    } catch (error) {
      console.error(`[FeatureOutlineRenderer] Error creating DSTV NOTCH outline for feature ${feature.id}:`, error);
      return null;
    }
  }
  
  /**
   * Nettoie les ressources
   */
  dispose(): void {
    // Restaurer tous les matériaux
    this.selectedFeatures.forEach((featureIds, elementId) => {
      featureIds.forEach(featureId => {
        this.highlightFeature(elementId, featureId, false);
      });
    });
    
    // Nettoyer les géométries et matériaux des outlines
    this.outlineGroups.forEach(group => {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.LineLoop) {
          child.geometry?.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
      group.clear();
    });
    
    // Nettoyer les matériaux de sélection
    if (this.selectionMaterial instanceof THREE.Material) {
      this.selectionMaterial.dispose();
    }
    if (this.hoverMaterial instanceof THREE.Material) {
      this.hoverMaterial.dispose();
    }
    
    // Nettoyer les maps
    this.outlineGroups.clear();
    this.featureOutlines.clear();
    this.selectedFeatures.clear();
    this.defaultMaterials.clear();
    this.hoveredFeature = null;
  }
  
  /**
   * Crée les contours pour une découpe (notch/cut)
   */
  private createCutOutline(cut: any, index: number, meshYOffset: number, element: PivotElement): THREE.Group | null {
    const outlineGroup = new THREE.Group();
    
    console.log(`🔵 Creating cut outline ${index}:`, cut);
    
    // Récupérer les coordonnées de la découpe
    const bounds = cut.bounds || cut;
    const face = cut.face || 'top_flange';
    const cutType = cut.type || 'cut';
    
    // Déterminer la couleur selon le type de découpe
    let outlineColor = 0xffff00; // Jaune par défaut pour les découpes
    if (cutType === 'notch') {
      outlineColor = 0xff8800; // Orange pour les notches
    } else if (cutType === 'END_CUT') {
      outlineColor = 0x00ffff; // Cyan pour les coupes d'extrémité
    } else if (cutType === 'angle_cut' || cut.cutType === 'partial_notches') {
      outlineColor = 0xff0088; // Rose pour les coupes d'angle
    }
    
    // Si on a des bounds explicites
    if (bounds.minX !== undefined && bounds.maxX !== undefined) {
      // Traitement spécial pour END_CUT sur tubes
      if (cutType === 'END_CUT') {
        const isHSSProfile = element.metadata?.profileName?.includes('HSS') || 
                             element.metadata?.profileType === 'TUBE_RECT';
        
        if (isHSSProfile) {
          // Pour les tubes HSS, créer un plan qui représente la coupe d'extrémité
          const tubeWidth = element.dimensions?.width || 50.8;
          const tubeHeight = element.dimensions?.height || 50.8;
          const angle = cut.angle || 90; // Angle de la coupe
          const position = cut.position || 'end'; // 'start' ou 'end'
          
          // Créer un contour qui suit la section du tube
          const shape = new THREE.Shape();
          const halfW = tubeWidth / 2;
          const halfH = tubeHeight / 2;
          
          // Dessiner le rectangle du tube
          shape.moveTo(-halfW, -halfH);
          shape.lineTo(halfW, -halfH);
          shape.lineTo(halfW, halfH);
          shape.lineTo(-halfW, halfH);
          shape.closePath();
          
          // Créer juste les bords (pas de surface pleine)
          const points = shape.getPoints(50);
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(
            points.map(p => new THREE.Vector3(p.x, p.y, 0))
          );
          
          const lineMaterial = new THREE.LineBasicMaterial({
            color: outlineColor,
            linewidth: 5,
            transparent: true,
            opacity: 1.0,
            depthTest: false,
            depthWrite: false
          });
          
          const outline = new THREE.Line(lineGeometry, lineMaterial);
          
          // Positionner à l'extrémité du tube
          // Pour les tubes sur l'axe Z, utiliser la position exacte depuis les bounds
          // Les bounds.minX et maxX ont la même valeur pour END_CUT (c'est un plan)
          const cutZ = bounds.minX;  // Position exacte de la coupe sur l'axe Z
          
          outline.position.set(0, meshYOffset, cutZ);
          
          // Si la coupe est angulaire, faire pivoter l'outline
          // L'angle DSTV est depuis la verticale, convertir pour Three.js
          // Doit correspondre exactement à la rotation dans CutProcessor
          if (angle !== 90) {
            let rotationAngle;
            if (position === 'start') {
              // Au début : même rotation que dans CutProcessor
              rotationAngle = -angle * Math.PI / 180;  // Négatif pour pencher vers l'avant
            } else {
              // À la fin : même rotation que dans CutProcessor
              rotationAngle = -angle * Math.PI / 180;  // Négatif comme le début (miroir)
            }
            outline.rotation.y = rotationAngle;
          }
          
          console.log(`  -> END_CUT outline at Z: ${cutZ.toFixed(1)}, position: ${position}, angle: ${angle}° (rotation: ${outline.rotation.y.toFixed(3)} rad)`);
          
          outlineGroup.add(outline);
        } else {
          // Pour les autres profils, utiliser l'ancien code
          const width = bounds.maxX - bounds.minX;
          const height = bounds.maxY - bounds.minY;
          const depth = bounds.maxZ - bounds.minZ;
          
          const edges = new THREE.EdgesGeometry(
            new THREE.BoxGeometry(width || 10, height || 10, depth || 10)
          );
          
          const lineMaterial = new THREE.LineBasicMaterial({
            color: outlineColor,
            linewidth: 3,
            transparent: true,
            opacity: 0.8,
            depthTest: false,
            depthWrite: false
          });
          
          const lineSegments = new THREE.LineSegments(edges, lineMaterial);
          const centerX = (bounds.minX + bounds.maxX) / 2;
          const centerY = (bounds.minY + bounds.maxY) / 2 + meshYOffset;
          const centerZ = (bounds.minZ + bounds.maxZ) / 2;
          lineSegments.position.set(centerX, centerY, centerZ);
          outlineGroup.add(lineSegments);
        }
      } else {
        // Code original pour les autres types de coupes
        const width = bounds.maxX - bounds.minX;
        const height = bounds.maxY - bounds.minY;
        const depth = bounds.maxZ - bounds.minZ;
        
        // Pour les tubes HSS et les coupes angulaires, créer un cadre plus visible
        const isHSSProfile = element.metadata?.profileName?.includes('HSS') || 
                             element.metadata?.profileType === 'TUBE_RECT';
        const linewidth = isHSSProfile ? 5 : 3;
        const opacity = isHSSProfile ? 1.0 : 0.8;
        
        // Créer les lignes du cadre
        const edges = new THREE.EdgesGeometry(
          new THREE.BoxGeometry(width || 10, height || 10, depth || 10)
        );
        
        const lineMaterial = new THREE.LineBasicMaterial({
          color: outlineColor,
          linewidth: linewidth,
          transparent: true,
          opacity: opacity,
          depthTest: false,
          depthWrite: false
        });
        
        const lineSegments = new THREE.LineSegments(edges, lineMaterial);
        
        // Positionner au centre de la découpe
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2 + meshYOffset;
        const centerZ = (bounds.minZ + bounds.maxZ) / 2;
        
        lineSegments.position.set(centerX, centerY, centerZ);
        
        console.log(`  -> Cut outline at: [${centerX.toFixed(1)}, ${centerY.toFixed(1)}, ${centerZ.toFixed(1)}]`);
        console.log(`  -> Dimensions: ${width.toFixed(1)} x ${height.toFixed(1)} x ${depth.toFixed(1)}`);
        console.log(`  -> Type: ${cutType}, Color: 0x${outlineColor.toString(16)}`);
        
        // Ajouter un indicateur visuel supplémentaire pour les coupes d'angle
        if (cutType === 'angle_cut' || cut.cutType === 'partial_notches') {
          // Créer un marqueur diagonal pour indiquer une coupe d'angle
          const diagonalGeometry = new THREE.BufferGeometry();
          const diagonalPoints = [
            new THREE.Vector3(-width/2, -height/2, 0),
            new THREE.Vector3(width/2, height/2, 0)
          ];
          diagonalGeometry.setFromPoints(diagonalPoints);
          
          const diagonalLine = new THREE.Line(diagonalGeometry, lineMaterial);
          diagonalLine.position.set(centerX, centerY, centerZ);
          outlineGroup.add(diagonalLine);
        }
        
        outlineGroup.add(lineSegments);
      }
    }
    // Si on a des points de contour
    else if (cut.points && cut.points.length > 0) {
      // Créer une ligne à partir des points
      const points = cut.points.map((p: any) => {
        // Convertir les coordonnées selon la face
        if (face === 'top_flange' || face === 'v') {
          return new THREE.Vector3(
            p[1] - (element.dimensions?.width || 146.1) / 2,  // Y DSTV -> X Three.js
            (element.dimensions?.height || 251.4) / 2 - 7.6 + meshYOffset,  // Position sur l'aile supérieure
            p[0]  // X DSTV -> Z Three.js
          );
        } else {
          return new THREE.Vector3(p[0], p[1] + meshYOffset, p[2] || 0);
        }
      });
      
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xffff00,  // Jaune pour les découpes
        linewidth: 3,
        transparent: true,
        opacity: 0.8,
        depthTest: false
      });
      
      const line = new THREE.Line(lineGeometry, lineMaterial);
      outlineGroup.add(line);
      
      console.log(`  -> Cut outline with ${points.length} points on face ${face}`);
    }
    
    return outlineGroup;
  }
  
  /**
   * Crée un contour pour les trous oblongs
   */
  private createSlottedHoleOutline(hole: any): THREE.Group | null {
    const group = new THREE.Group();
    const diameter = hole.diameter || 10;
    const elongation = hole.slottedLength || 0;
    const position = hole.position || [0, 0, 0];
    
    // Utiliser directement la position (déjà en coordonnées Three.js)
    const correctedPosition = position;
    // Removed unused rotation variable - using hole.slottedAngle instead
    
    // Matériau magenta pour les trous oblongs
    const material = new THREE.MeshBasicMaterial({
      color: 0xff00ff,  // Magenta pour les trous oblongs
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    
    // Créer la forme oblongue avec Shape
    const shape = new THREE.Shape();
    const radius = diameter / 2 + 0.5; // Légèrement plus grand que le trou
    const halfLength = elongation / 2;
    
    // Dessiner la forme oblongue (capsule)
    shape.moveTo(-halfLength, -radius);
    shape.lineTo(halfLength, -radius);
    shape.absarc(halfLength, 0, radius, -Math.PI / 2, Math.PI / 2, false);
    shape.lineTo(-halfLength, radius);
    shape.absarc(-halfLength, 0, radius, Math.PI / 2, Math.PI * 3 / 2, false);
    
    // Créer le contour avec un trou au centre
    const holeShape = new THREE.Shape();
    const innerRadius = diameter / 2 - 0.5;
    const innerHalfLength = elongation / 2;
    
    holeShape.moveTo(-innerHalfLength, -innerRadius);
    holeShape.lineTo(innerHalfLength, -innerRadius);
    holeShape.absarc(innerHalfLength, 0, innerRadius, -Math.PI / 2, Math.PI / 2, false);
    holeShape.lineTo(-innerHalfLength, innerRadius);
    holeShape.absarc(-innerHalfLength, 0, innerRadius, Math.PI / 2, Math.PI * 3 / 2, false);
    
    shape.holes = [holeShape];
    
    // Créer la géométrie
    const geometry = new THREE.ShapeGeometry(shape);
    const mesh = new THREE.Mesh(geometry, material);
    
    // Positionner et orienter
    mesh.position.set(correctedPosition[0], correctedPosition[1], correctedPosition[2]);
    
    // Orienter la forme oblongue selon la face
    if (hole.face === 'top' || hole.face === 'bottom' || 
        hole.face === 'bottom_flange' || hole.face === 'top_flange') {
      // Surface horizontale - la forme doit être dans le plan XZ
      mesh.rotation.x = -Math.PI / 2; // Rotation pour passer du plan XY au plan XZ
      // Appliquer l'angle de rotation du trou oblong si spécifié
      if (hole.slottedAngle) {
        mesh.rotation.y += THREE.MathUtils.degToRad(hole.slottedAngle);
      }
    } else if (hole.face === 'web') {
      // Surface verticale - la forme est déjà dans le bon plan (XY)
      // Appliquer seulement l'angle de rotation si spécifié
      if (hole.slottedAngle) {
        mesh.rotation.z += THREE.MathUtils.degToRad(hole.slottedAngle);
      }
    }
    
    group.add(mesh);
    
    return group;
  }
  
  /**
   * Met à jour la visibilité des contours
   */
  setOutlinesVisible(elementId: string, visible: boolean): void {
    const group = this.outlineGroups.get(elementId);
    if (group) {
      group.visible = visible;
    }
  }
  
  /**
   * Change la couleur des contours pour un élément
   */
  setOutlineColor(elementId: string, color: number): void {
    const group = this.outlineGroups.get(elementId);
    if (!group) return;
    
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshBasicMaterial;
        material.color.setHex(color);
      }
    });
  }
  
}