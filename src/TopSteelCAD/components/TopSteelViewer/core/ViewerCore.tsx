'use client';

import React, { useRef, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Box, Cylinder, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { PivotElement, MaterialType, AssemblyType } from '@/types/viewer';

/**
 * Composant pour rendre les usinages (trous, découpes, soudures)
 * Les positions sont correctement calculées par rapport à la pièce
 */
const MachiningFeatures: React.FC<{
  element: PivotElement;
  isSelected: boolean;
}> = ({ element, isSelected }) => {
  const features = element.metadata?.cuttingFeatures as any[] || [];
  const assemblies = element.assemblies || [];
  
  return (
    <>
      {/* Rendu des trous et découpes */}
      {features.map((feature, idx) => {
        const key = `${element.id}-feature-${idx}`;
        
        // Position DSTV du trou (X = le long de la poutre, Y = transversal, Z = vertical)
        const dstvX = feature.position[0];
        const dstvY = feature.position[1]; 
        const dstvZ = feature.position[2];
        
        // Convertir en position Three.js relative au centre de la pièce
        // La pièce est centrée dans Three.js, donc on ajuste X
        const relativeX = dstvX - (element.dimensions.length || 6000) / 2;
        
        switch (feature.type) {
          case 'hole':
            // Déterminer sur quelle face se trouve le trou selon Z
            // Z = 0 : trou sur l'âme (web) au centre
            // Z > 0 : trou sur l'aile supérieure
            // Z < 0 : trou sur l'aile inférieure
            const isOnWeb = Math.abs(dstvZ) < 1; // Tolérance pour Z=0
            const isOnTopFlange = dstvZ > ((element.dimensions.height || 300) / 2 - 20);
            const isOnBottomFlange = dstvZ < -((element.dimensions.height || 300) / 2 - 20);
            
            // Position finale du trou
            let holePosition: [number, number, number];
            let holeRotation: [number, number, number];
            let holeDepth: number;
            
            if (isOnWeb) {
              // Trou sur l'âme - traverse horizontalement (dans l'épaisseur)
              holePosition = [
                element.position[0] + relativeX,  // Le long de la poutre
                element.position[1] + dstvY,      // Position verticale sur l'âme
                element.position[2]               // Centré sur l'âme (Z=0)
              ];
              holeRotation = [0, 0, Math.PI / 2]; // Rotation pour traverser horizontalement
              holeDepth = element.metadata?.webThickness || 7.1; // Épaisseur de l'âme
            } else if (isOnTopFlange || isOnBottomFlange) {
              // Trou sur une aile - traverse verticalement
              const flangeY = isOnTopFlange 
                ? (element.dimensions.height || 300) / 2 - (element.metadata?.flangeThickness || 10.7) / 2
                : -(element.dimensions.height || 300) / 2 + (element.metadata?.flangeThickness || 10.7) / 2;
              
              holePosition = [
                element.position[0] + relativeX,  // Le long de la poutre
                element.position[1] + flangeY,    // Position Y de l'aile
                element.position[2] + dstvY       // Position latérale sur l'aile (Y devient Z en Three.js)
              ];
              holeRotation = [Math.PI / 2, 0, 0]; // Rotation pour traverser verticalement
              holeDepth = element.metadata?.flangeThickness || 10.7; // Épaisseur de l'aile
            } else {
              // Trou quelque part entre l'âme et les ailes
              holePosition = [
                element.position[0] + relativeX,
                element.position[1] + dstvZ,  // Z DSTV devient Y Three.js
                element.position[2] + dstvY   // Y DSTV devient Z Three.js
              ];
              holeRotation = [0, Math.PI / 2, 0]; // Rotation par défaut
              holeDepth = 20; // Profondeur par défaut
            }
            
            return (
              <mesh 
                key={key} 
                position={holePosition}
                rotation={holeRotation}
              >
                <cylinderGeometry 
                  args={[
                    (feature.diameter || 22) / 2,  // Rayon du trou
                    (feature.diameter || 22) / 2,
                    holeDepth,  // Profondeur selon la face
                    16  // Segments pour un cercle lisse
                  ]} 
                />
                <meshStandardMaterial 
                  color={isOnWeb ? "#0a0a0a" : "#1a1a1a"}
                  metalness={0.95}
                  roughness={0.05}
                  opacity={0.98}
                  transparent
                />
              </mesh>
            );
          
          case 'slot':
            // Gravure laser - position selon les coordonnées DSTV
            // Z DSTV indique la hauteur, Y DSTV indique la position latérale
            const slotPosition: [number, number, number] = [
              element.position[0] + relativeX,  // Le long de la poutre
              element.position[1] + dstvZ,      // Z DSTV devient Y Three.js (hauteur)
              element.position[2] + dstvY       // Y DSTV devient Z Three.js (latéral)
            ];
            
            return (
              <mesh 
                key={key} 
                position={slotPosition}
                rotation={[0, feature.angle ? feature.angle * Math.PI / 180 : 0, 0]}
              >
                <boxGeometry 
                  args={[
                    feature.length || 100,  // Longueur du slot
                    2,  // Profondeur de gravure (visible)
                    feature.width || 4  // Largeur du slot
                  ]} 
                />
                <meshStandardMaterial 
                  color="#334155"
                  metalness={0.3}
                  roughness={0.7}
                  emissive="#000000"
                  emissiveIntensity={0.1}
                />
              </mesh>
            );
          
          case 'cutout':
          case 'cut':
            // Découpe - transformation correcte des coordonnées
            const cutPosition: [number, number, number] = [
              element.position[0] + relativeX,  // Le long de la poutre
              element.position[1] + dstvZ,      // Z DSTV devient Y Three.js  
              element.position[2] + dstvY       // Y DSTV devient Z Three.js
            ];
            
            return (
              <mesh 
                key={key} 
                position={cutPosition}
              >
                <boxGeometry 
                  args={[
                    feature.width || 200,
                    feature.length || 300,
                    (element.dimensions.width || 150) * 1.1  // Traverse complètement
                  ]} 
                />
                <meshStandardMaterial 
                  color="#0f172a"
                  metalness={0.5}
                  roughness={0.5}
                  opacity={0.95}
                  transparent
                />
              </mesh>
            );
          
          default:
            return null;
        }
      })}
      
      {/* Rendu des soudures */}
      {assemblies.filter(a => a.type === AssemblyType.WELD).map((weld, idx) => {
        const metadata = weld.metadata || {};
        const position = weld.position || [0, 0, 0];
        
        // Transformation des coordonnées DSTV vers Three.js
        // Position relative par rapport au centre de la pièce
        const weldX = position[0] - (element.dimensions.length || 6000) / 2;
        const weldY = position[2]; // Z DSTV devient Y Three.js
        const weldZ = position[1]; // Y DSTV devient Z Three.js
        
        return (
          <mesh 
            key={`weld-${element.id}-${idx}`}
            position={[
              element.position[0] + weldX,
              element.position[1] + weldY,
              element.position[2] + weldZ
            ]}
            rotation={[0, (metadata.angle || 0) * Math.PI / 180, 0]}
          >
            <capsuleGeometry 
              args={[
                (metadata.size || 6) / 2,  // Rayon de la soudure
                metadata.length || 200,  // Longueur
                4,
                8
              ]} 
            />
            <meshStandardMaterial
              color="#ff6b35"  // Orange pour les soudures
              metalness={0.7}
              roughness={0.3}
              emissive="#ff4500"
              emissiveIntensity={0.2}
            />
          </mesh>
        );
      })}
    </>
  );
};

/**
 * Crée une géométrie simplifiée de poutre IPE en forme de I
 */
function createIPEGeometry(length: number, height: number, width: number, flangeThickness: number): THREE.BufferGeometry {
  const webThickness = flangeThickness * 0.66; // Approximation épaisseur âme
  
  // Créer la géometrie avec ExtrudeGeometry pour la forme en I
  const shape = new THREE.Shape();
  
  // Dessiner le profil en I dans le plan YZ
  const h2 = height / 2;
  const w2 = width / 2;
  const tf = flangeThickness;
  const tw = webThickness;
  
  // Commencer par le coin inférieur gauche de la semelle inférieure
  shape.moveTo(-w2, -h2);
  shape.lineTo(w2, -h2);
  shape.lineTo(w2, -h2 + tf);
  shape.lineTo(tw/2, -h2 + tf);
  shape.lineTo(tw/2, h2 - tf);
  shape.lineTo(w2, h2 - tf);
  shape.lineTo(w2, h2);
  shape.lineTo(-w2, h2);
  shape.lineTo(-w2, h2 - tf);
  shape.lineTo(-tw/2, h2 - tf);
  shape.lineTo(-tw/2, -h2 + tf);
  shape.lineTo(-w2, -h2 + tf);
  shape.lineTo(-w2, -h2);
  
  const extrudeSettings = {
    depth: length,
    bevelEnabled: false,
    steps: 1
  };
  
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  
  // Centrer la géométrie
  geometry.center();
  
  // Rotation pour que la poutre soit orientée le long de l'axe X
  geometry.rotateY(Math.PI / 2);
  
  return geometry;
}


interface ViewerCoreProps {
  elements: PivotElement[];
  selectedElementId?: string | null;
  highlightedElementId?: string | null;
  onElementSelect?: (id: string | null) => void;
  onElementHover?: (id: string | null) => void;
  onViewerReady?: (camera: any, controls: any) => void;
  config?: any;
  className?: string;
}

export interface ViewerCoreRef {
  camera: THREE.Camera | null;
  controls: any;
  scene: THREE.Scene | null;
}

/**
 * Composant de rendu d'un élément Pivot
 */
const PivotElementMesh: React.FC<{
  element: PivotElement;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}> = ({ element, isSelected, isHighlighted, onClick, onPointerOver, onPointerOut }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Couleur style TEKLA - optimisée pour fond bleu foncé
  const color = useMemo(() => {
    if (isSelected) return '#ef4444'; // Rouge TEKLA pour sélection
    if (isHighlighted) return '#fbbf24'; // Jaune doré pour survol
    return element.material?.color || '#d1d5db'; // Gris clair métallique par défaut
  }, [isSelected, isHighlighted, element.material?.color]);

  // Matériau métallique style TEKLA
  const material = useMemo(() => {
    const baseColor = new THREE.Color(color);
    
    return new THREE.MeshStandardMaterial({
      color: baseColor,
      metalness: 0.8, // Très métallique pour l'acier
      roughness: isSelected ? 0.1 : 0.2, // Brillant quand sélectionné
      opacity: element.material?.opacity || 1,
      transparent: (element.material?.opacity || 1) < 1,
      emissive: isSelected ? new THREE.Color('#dc2626').multiplyScalar(0.15) : new THREE.Color('#000000'),
      emissiveIntensity: isSelected ? 0.25 : 0
    });
  }, [color, element.material, isSelected]);

  // Géométrie selon le type de matériau
  const geometry = useMemo(() => {
    const dims = element.dimensions;
    
    switch (element.materialType) {
      case MaterialType.PLATE:
      case MaterialType.SHEET:
        return new THREE.BoxGeometry(
          dims.length || 100,
          dims.thickness || 10,
          dims.width || 100
        );
      
      case MaterialType.BEAM:
        // Créer une géométrie IPE simplifiée avec forme en I
        return createIPEGeometry(
          dims.length || 1000,
          dims.height || 300,
          dims.width || 150,
          dims.thickness || 10.7
        );
      
      case MaterialType.CHANNEL:
      case MaterialType.TEE:
        return new THREE.BoxGeometry(
          dims.length || 1000,
          dims.height || 200,
          dims.width || 100
        );
      
      case MaterialType.TUBE:
        if (dims.diameter) {
          return new THREE.CylinderGeometry(
            dims.diameter / 2,
            dims.diameter / 2,
            dims.length || 1000,
            32
          );
        }
        return new THREE.BoxGeometry(
          dims.length || 1000,
          dims.height || 100,
          dims.width || 100
        );
      
      case MaterialType.BAR:
        if (dims.diameter) {
          return new THREE.CylinderGeometry(
            dims.diameter / 2,
            dims.diameter / 2,
            dims.length || 1000,
            16
          );
        }
        return new THREE.BoxGeometry(
          dims.width || 50,
          dims.height || 50,
          dims.length || 1000
        );
      
      case MaterialType.ANGLE:
        // Profil en L simplifié
        return new THREE.BoxGeometry(
          dims.length || 1000,
          dims.height || 100,
          dims.width || 100
        );
      
      case MaterialType.BOLT:
      case MaterialType.BOLT_HEAD:
        return new THREE.CylinderGeometry(
          (dims.diameter || 20) / 2,
          (dims.diameter || 20) / 2,
          dims.length || 50,
          6
        );
      
      case MaterialType.NUT:
        return new THREE.CylinderGeometry(
          (dims.diameter || 30) / 2,
          (dims.diameter || 30) / 2,
          dims.thickness || 10,
          6
        );
      
      case MaterialType.WASHER:
        return new THREE.RingGeometry(
          (dims.diameter || 20) / 4,
          (dims.diameter || 20) / 2,
          32
        );
      
      case MaterialType.WELD:
        return new THREE.SphereGeometry(dims.diameter || 10, 8, 8);
      
      default:
        // Forme par défaut : boîte
        return new THREE.BoxGeometry(
          dims.length || 100,
          dims.height || 100,
          dims.width || 100
        );
    }
  }, [element.materialType, element.dimensions]);

  // Pas d'animation - effet de sélection géré par le matériau et le contour

  // Rotation pour les tubes et barres
  const rotation = useMemo(() => {
    if (element.materialType === MaterialType.TUBE || element.materialType === MaterialType.BAR) {
      if (element.dimensions.diameter) {
        return [0, 0, Math.PI / 2] as [number, number, number];
      }
    }
    return element.rotation || [0, 0, 0];
  }, [element.materialType, element.dimensions, element.rotation]);

  return (
    <mesh
      ref={meshRef}
      position={element.position}
      rotation={rotation}
      scale={element.scale || [1, 1, 1]}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      geometry={geometry}
      material={material}
      castShadow
      receiveShadow
      userData={{ elementId: element.id, element }}
    />
  );
};

/**
 * Composant de surlignement pour l'élément sélectionné
 */
const SelectionOutline: React.FC<{
  element: PivotElement;
  isSelected: boolean;
}> = ({ element, isSelected }) => {
  if (!isSelected) return null;

  const geometry = useMemo(() => {
    const dims = element.dimensions;
    
    switch (element.materialType) {
      case MaterialType.BEAM:
        // Créer un contour pour la poutre IPE
        return createIPEGeometry(
          dims.length || 1000,
          dims.height || 300,
          dims.width || 150,
          dims.thickness || 10.7
        );
      
      case MaterialType.PLATE:
      case MaterialType.SHEET:
        return new THREE.BoxGeometry(
          dims.length || 100,
          dims.thickness || 10,
          dims.width || 100
        );
      
      case MaterialType.TUBE:
        if (dims.diameter) {
          return new THREE.CylinderGeometry(
            dims.diameter / 2,
            dims.diameter / 2,
            dims.length || 1000,
            32
          );
        }
        return new THREE.BoxGeometry(
          dims.length || 1000,
          dims.height || 100,
          dims.width || 100
        );
      
      case MaterialType.BAR:
        if (dims.diameter) {
          return new THREE.CylinderGeometry(
            dims.diameter / 2,
            dims.diameter / 2,
            dims.length || 1000,
            16
          );
        }
        return new THREE.BoxGeometry(
          dims.width || 50,
          dims.height || 50,
          dims.length || 1000
        );
      
      default:
        return new THREE.BoxGeometry(
          dims.length || 100,
          dims.height || 100,
          dims.width || 100
        );
    }
  }, [element.materialType, element.dimensions]);

  // Rotation pour les tubes et barres
  const rotation = useMemo(() => {
    if (element.materialType === MaterialType.TUBE || element.materialType === MaterialType.BAR) {
      if (element.dimensions.diameter) {
        return [0, 0, Math.PI / 2] as [number, number, number];
      }
    }
    return element.rotation || [0, 0, 0];
  }, [element.materialType, element.dimensions, element.rotation]);

  // Créer les arêtes pour un contour plus net
  const edges = useMemo(() => {
    return new THREE.EdgesGeometry(geometry, 15); // Angle de 15 degrés pour les arêtes
  }, [geometry]);

  return (
    <group
      position={element.position}
      rotation={rotation}
      scale={element.scale || [1, 1, 1]}
    >
      {/* Contour avec arêtes nettes - rouge TEKLA */}
      <lineSegments geometry={edges}>
        <lineBasicMaterial
          color="#ef4444"
          transparent
          opacity={1.0}
          linewidth={3}
        />
      </lineSegments>
      
      {/* Halo de sélection rouge */}
      <mesh geometry={geometry} scale={[1.01, 1.01, 1.01]}>
        <meshBasicMaterial
          color="#dc2626"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

/**
 * Scène 3D avec tous les éléments et expose les références
 */
const Scene = forwardRef<ViewerCoreRef, {
  elements: PivotElement[];
  selectedElementId?: string | null;
  highlightedElementId?: string | null;
  onElementSelect?: (id: string | null) => void;
  onElementHover?: (id: string | null) => void;
  onViewerReady?: (camera: any, controls: any) => void;
  config?: any;
}>(({ elements, selectedElementId, highlightedElementId, onElementSelect, onElementHover, onViewerReady, config }, ref) => {
  const { camera, scene, gl } = useThree();
  const controlsRef = useRef<any>(null);
  
  // Exposer les références
  useImperativeHandle(ref, () => ({
    camera,
    controls: controlsRef.current,
    scene
  }), [camera, scene, controlsRef.current]);
  
  // Appeler le callback quand les contrôles sont prêts
  useEffect(() => {
    if (controlsRef.current && camera && onViewerReady) {
      onViewerReady(camera, controlsRef.current);
    }
  }, [camera, onViewerReady, controlsRef.current]);
  
  // Définir la couleur de fond de la scène
  useEffect(() => {
    const bgColor = config?.backgroundColor || '#1e3a5f';
    gl.setClearColor(new THREE.Color(bgColor));
  }, [gl, config?.backgroundColor]);
  
  // Ajuster la caméra au chargement
  useEffect(() => {
    if (elements.length > 0) {
      // Calculer la boîte englobante
      const box = new THREE.Box3();
      elements.forEach(element => {
        const pos = new THREE.Vector3(...element.position);
        const size = new THREE.Vector3(
          element.dimensions.length || 100,
          element.dimensions.height || 100,
          element.dimensions.width || 100
        );
        box.expandByPoint(pos.clone().add(size.multiplyScalar(0.5)));
        box.expandByPoint(pos.clone().sub(size.multiplyScalar(0.5)));
      });
      
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
      const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 2;
      
      camera.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);
      camera.lookAt(center);
    }
  }, [elements, camera]);

  return (
    <>
      {/* Éclairage style TEKLA optimisé pour fond bleu foncé */}
      <ambientLight intensity={config?.ambientLight || 0.5} color="#e6f3ff" />
      
      {/* Éclairage principal style bureau d'études */}
      <directionalLight
        position={[1500, 2500, 1200]}
        intensity={config?.directionalLight || 2.0}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={15000}
        shadow-camera-near={1}
        shadow-camera-left={-8000}
        shadow-camera-right={8000}
        shadow-camera-top={8000}
        shadow-camera-bottom={-8000}
        shadow-bias={-0.0003}
      />
      
      {/* Éclairage de remplissage technique */}
      <directionalLight
        position={[-1200, 1800, -1000]}
        intensity={0.7}
        color="#f0f8ff"
      />
      
      {/* Éclairage d'accentuation pour le métal */}
      <directionalLight
        position={[800, -1200, 1500]}
        intensity={0.4}
        color="#ffffff"
      />
      
      {/* Éclairage hémisphérique style TEKLA */}
      <hemisphereLight
        args={["#87ceeb", "#1e3a5f", 0.6]}
      />

      {/* Grille stable */}
      {config?.showGrid !== false && (
        <Grid
          args={[20000, 20000]}
          cellSize={100}
          sectionSize={1000}
          cellColor={config?.gridColor || '#e2e8f0'}
          sectionColor={config?.sectionColor || '#94a3b8'}
          fadeDistance={8000}
          infiniteGrid={false}
          followCamera={false}
          position={[0, -200, 0]}
        />
      )}

      {/* Axes */}
      {config?.showAxes && (
        <axesHelper args={[1000]} />
      )}

      {/* Éléments avec usinages */}
      {elements.map(element => (
        <group key={element.id}>
          {/* Pièce principale */}
          <PivotElementMesh
            element={element}
            isSelected={element.id === selectedElementId}
            isHighlighted={element.id === highlightedElementId}
            onClick={() => onElementSelect?.(element.id)}
            onPointerOver={() => onElementHover?.(element.id)}
            onPointerOut={() => onElementHover?.(null)}
          />
          
          {/* Rendu des usinages (trous, découpes, soudures) */}
          <MachiningFeatures
            element={element}
            isSelected={element.id === selectedElementId}
          />
          
          {/* Contour de sélection */}
          <SelectionOutline
            element={element}
            isSelected={element.id === selectedElementId}
          />
        </group>
      ))}

      
      {/* OrbitControls avec ref */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        panSpeed={0.5}
        zoomSpeed={0.8}
        enableRotate={config?.enableRotation !== false}
        enableZoom={config?.enableZoom !== false}
        enablePan={config?.enablePan !== false}
        maxDistance={10000}  // Limite raisonnable pour le dezoom
        minDistance={50}     // Permet de zoomer suffisamment sans rentrer dans l'objet
      />
    </>
  );
});

Scene.displayName = 'Scene';

/**
 * ViewerCore - Composant de base pour le rendu 3D
 */
export const ViewerCore = forwardRef<ViewerCoreRef, ViewerCoreProps>(({
  elements,
  selectedElementId,
  highlightedElementId,
  onElementSelect,
  onElementHover,
  onViewerReady,
  config = {},
  className = ''
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ViewerCoreRef>(null);
  
  // Exposer les références
  useImperativeHandle(ref, () => ({
    camera: sceneRef.current?.camera || null,
    controls: sceneRef.current?.controls || null,
    scene: sceneRef.current?.scene || null
  }), [sceneRef.current]);

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      <Canvas
        camera={{
          position: [2000, 2000, 2000],
          fov: 45,
          near: 1,
          far: 50000
        }}
        gl={{
          antialias: config.antialiasing !== false,
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true
        }}
        shadows={config.enableShadows !== false}
        style={{ background: config.backgroundColor || '#1e3a5f' }}
      >
        <Scene
          ref={sceneRef}
          elements={elements}
          selectedElementId={selectedElementId}
          highlightedElementId={highlightedElementId}
          onElementSelect={onElementSelect}
          onElementHover={onElementHover}
          onViewerReady={onViewerReady}
          config={config}
        />
      </Canvas>
    </div>
  );
});

ViewerCore.displayName = 'ViewerCore';