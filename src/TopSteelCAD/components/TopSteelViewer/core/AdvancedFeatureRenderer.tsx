/**
 * AdvancedFeatureRenderer - Version refactorisée avec le nouveau système
 */

'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { PivotElement, MaterialType, AssemblyType } from '@/types/viewer';
import { FeatureSystem } from '@/TopSteelCAD/core/features/FeatureSystem';
import { Feature, FeatureType, ProfileFace } from '@/TopSteelCAD/core/features/types';

/**
 * Convertit les features DSTV en features du nouveau système
 */
function convertDSTVToFeatures(element: PivotElement): Feature[] {
  const features: Feature[] = [];
  
  // Convertir les features de coupe
  const cuttingFeatures = element.metadata?.cuttingFeatures as unknown[] || [];
  cuttingFeatures.forEach((dstvFeature, index) => {
    // Déterminer le type de feature
    let featureType = FeatureType.HOLE;
    const params: any = {};
    
    if (dstvFeature.type === 'hole') {
      // Analyser le type de trou
      if (dstvFeature.metadata?.boltHole) {
        featureType = FeatureType.HOLE;
      } else if (dstvFeature.metadata?.tapped) {
        featureType = FeatureType.TAPPED_HOLE;
        params.threadType = dstvFeature.metadata.threadType || 'metric';
        params.threadPitch = dstvFeature.metadata.threadPitch;
      } else if (dstvFeature.metadata?.countersink) {
        featureType = FeatureType.COUNTERSINK;
        params.sinkAngle = dstvFeature.metadata.sinkAngle || 90;
        params.sinkDiameter = dstvFeature.metadata.sinkDiameter;
        params.sinkDepth = dstvFeature.metadata.sinkDepth;
        params.sinkType = 'countersink';
      } else if (dstvFeature.metadata?.counterbore) {
        featureType = FeatureType.COUNTERBORE;
        params.sinkDiameter = dstvFeature.metadata.boreDiameter;
        params.sinkDepth = dstvFeature.metadata.boreDepth;
        params.sinkType = 'counterbore';
      }
      params.diameter = dstvFeature.diameter || 20;
      params.depth = dstvFeature.depth || element.dimensions.width || 100;
    } else if (dstvFeature.type === 'slot') {
      featureType = FeatureType.SLOT;
      params.length = dstvFeature.length || 50;
      params.width = dstvFeature.width || 20;
      params.depth = dstvFeature.depth || element.dimensions.width || 100;
    } else if (dstvFeature.type === 'cutout') {
      featureType = FeatureType.CUTOUT;
      params.length = dstvFeature.length || 100;
      params.width = dstvFeature.width || 50;
    } else if (dstvFeature.type === 'notch') {
      featureType = FeatureType.NOTCH;
      params.notchType = dstvFeature.metadata?.notchType || 'rectangular';
      params.length = dstvFeature.length || 50;
      params.width = dstvFeature.width || 30;
      params.angle = dstvFeature.metadata?.angle;
    } else if (dstvFeature.type === 'marking') {
      featureType = FeatureType.MARKING;
      params.markingType = dstvFeature.metadata?.markingType || 'center_punch';
      params.depth = dstvFeature.metadata?.depth || 0.5;
    } else if (dstvFeature.type === 'text') {
      featureType = FeatureType.TEXT;
      params.text = dstvFeature.text || '';
      params.fontSize = dstvFeature.fontSize || 10;
      params.textType = dstvFeature.metadata?.textType || 'engraved';
    }
    
    features.push({
      id: `${dstvFeature.type}-${index}`,
      type: featureType,
      coordinateSystem: 'local' as unknown,
      position: new THREE.Vector3(
        dstvFeature.position[0],
        dstvFeature.position[1],
        dstvFeature.position[2]
      ),
      rotation: new THREE.Euler(
        dstvFeature.rotation?.[0] || 0,
        dstvFeature.rotation?.[1] || 0,
        dstvFeature.rotation?.[2] || 0
      ),
      face: determineFace(dstvFeature.position[2], element),
      parameters: params,
      metadata: dstvFeature.metadata
    });
  });
  
  // Convertir les contours
  const cuttingContours = element.metadata?.cuttingContours as unknown[] || [];
  cuttingContours.forEach((contour, index) => {
    const points = contour.points?.map((p: any) => new THREE.Vector2(p.x, p.y)) || [];
    const bulges = contour.points?.map((p: any) => p.bulge || 0) || [];
    
    features.push({
      id: `contour-${index}`,
      type: FeatureType.CONTOUR,
      coordinateSystem: 'local' as unknown,
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      parameters: {
        points,
        closed: contour.closed !== false,
        bulge: bulges.some((b: number) => b !== 0) ? bulges : undefined
      },
      metadata: {
        contourType: contour.type
      }
    });
  });
  
  return features;
}

/**
 * Détermine la face selon la coordonnée Z
 */
function determineFace(z: number, element: PivotElement): ProfileFace {
  const profile = element.metadata?.profile || '';
  
  if (/^(IPE|HE)/i.test(profile)) {
    if (Math.abs(z) < 1) return ProfileFace.WEB;
    if (z > 0) return ProfileFace.TOP_FLANGE;
    return ProfileFace.BOTTOM_FLANGE;
  }
  
  return z >= 0 ? ProfileFace.TOP : ProfileFace.BOTTOM;
}

/**
 * Crée la géométrie de base selon le type de matériau
 */
function createBaseGeometry(element: PivotElement): THREE.BufferGeometry {
  const dims = element.dimensions;
  
  switch (element.materialType) {
    case MaterialType.BEAM:
      // Profil IPE/HEA/HEB
      if (element.metadata?.profile?.startsWith('IPE') || 
          element.metadata?.profile?.startsWith('HE')) {
        return createIProfileGeometry(
          dims.length || 1000,
          dims.height || 300,
          dims.width || 150,
          element.metadata?.flangeThickness || 11,
          element.metadata?.webThickness || 7
        );
      }
      // Par défaut, box simple
      return new THREE.BoxGeometry(
        dims.length || 1000,
        dims.height || 100,
        dims.width || 100
      );
      
    case MaterialType.PLATE:
    case MaterialType.SHEET:
      return new THREE.BoxGeometry(
        dims.length || 1000,
        dims.thickness || 10,
        dims.width || 1000
      );
      
    case MaterialType.TUBE:
      if (element.metadata?.profile?.startsWith('RHS')) {
        // Tube rectangulaire
        return createRectangularTubeGeometry(
          dims.length || 1000,
          dims.height || 100,
          dims.width || 100,
          element.metadata?.wallThickness || 5
        );
      }
      // Par défaut, cylindre
      return new THREE.CylinderGeometry(
        (dims.width || 100) / 2,
        (dims.width || 100) / 2,
        dims.length || 1000,
        32
      );
      
    default:
      return new THREE.BoxGeometry(
        dims.length || 100,
        dims.height || 100,
        dims.width || 100
      );
  }
}

/**
 * Crée une géométrie de profil en I
 */
function createIProfileGeometry(
  length: number,
  height: number,
  width: number,
  flangeThickness: number,
  webThickness: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  
  const h2 = height / 2;
  const w2 = width / 2;
  const tf = flangeThickness;
  const tw = webThickness / 2;
  
  // Dessiner le profil en I
  shape.moveTo(-w2, -h2);
  shape.lineTo(w2, -h2);
  shape.lineTo(w2, -h2 + tf);
  shape.lineTo(tw, -h2 + tf);
  shape.lineTo(tw, h2 - tf);
  shape.lineTo(w2, h2 - tf);
  shape.lineTo(w2, h2);
  shape.lineTo(-w2, h2);
  shape.lineTo(-w2, h2 - tf);
  shape.lineTo(-tw, h2 - tf);
  shape.lineTo(-tw, -h2 + tf);
  shape.lineTo(-w2, -h2 + tf);
  shape.closePath();
  
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false
  });
  
  geometry.center();
  geometry.rotateY(Math.PI / 2);
  
  return geometry;
}

/**
 * Crée une géométrie de tube rectangulaire
 */
function createRectangularTubeGeometry(
  length: number,
  height: number,
  width: number,
  wallThickness: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  
  const h2 = height / 2;
  const w2 = width / 2;
  const t = wallThickness;
  
  // Contour externe
  shape.moveTo(-w2, -h2);
  shape.lineTo(w2, -h2);
  shape.lineTo(w2, h2);
  shape.lineTo(-w2, h2);
  shape.closePath();
  
  // Trou interne
  const hole = new THREE.Path();
  hole.moveTo(-w2 + t, -h2 + t);
  hole.lineTo(w2 - t, -h2 + t);
  hole.lineTo(w2 - t, h2 - t);
  hole.lineTo(-w2 + t, h2 - t);
  hole.closePath();
  
  shape.holes.push(hole);
  
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false
  });
  
  geometry.center();
  geometry.rotateY(Math.PI / 2);
  
  return geometry;
}

/**
 * Système de LOD (Level of Detail) pour les features
 */
interface LODFeatureProps {
  element: PivotElement;
  distance: number;
}

const LODFeatureRenderer: React.FC<LODFeatureProps> = ({ element, distance }) => {
  const features = element.metadata?.cuttingFeatures as unknown[] || [];
  
  // Déterminer le niveau de détail
  const lodLevel = useMemo(() => {
    if (distance < 500) return 'high';
    if (distance < 2000) return 'medium';
    return 'low';
  }, [distance]);
  
  // Simplifier les features selon la distance
  const simplifiedFeatures = useMemo(() => {
    if (lodLevel === 'high') return features;
    if (lodLevel === 'medium') {
      // Grouper les trous proches
      return features.filter((_, index) => index % 2 === 0);
    }
    // Low: ne montrer que les features principales
    return features.filter((_, index) => index % 4 === 0);
  }, [features, lodLevel]);
  
  return (
    <>
      {simplifiedFeatures.map((feature, idx) => {
        const segments = lodLevel === 'high' ? 32 : lodLevel === 'medium' ? 16 : 8;
        
        if (feature.type === 'hole') {
          return (
            <mesh key={`lod-feature-${idx}`} position={feature.position}>
              <cylinderGeometry args={[
                (feature.diameter || 20) / 2,
                (feature.diameter || 20) / 2,
                100,
                segments
              ]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          );
        }
        return null;
      })}
    </>
  );
};

/**
 * Composant principal avec toutes les améliorations
 */
interface AdvancedFeatureRendererProps {
  element: PivotElement;
  isSelected: boolean;
  isHighlighted: boolean;
  enableAnimations?: boolean;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

export const AdvancedFeatureRenderer: React.FC<AdvancedFeatureRendererProps> = ({
  element,
  isSelected,
  isHighlighted,
  enableAnimations = true,
  onClick,
  onPointerOver,
  onPointerOut
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const [distance, setDistance] = useState(1000);
  const [assemblyProgress, setAssemblyProgress] = useState(1);
  
  // Système de features singleton
  const featureSystem = useMemo(() => FeatureSystem.getInstance({
    cacheEnabled: true,
    cacheSize: 100,
    validateFeatures: true,
    optimizeGeometry: true
  }), []);
  
  // Calculer la distance à la caméra
  useFrame(() => {
    if (meshRef.current) {
      const worldPos = new THREE.Vector3();
      meshRef.current.getWorldPosition(worldPos);
      const dist = camera.position.distanceTo(worldPos);
      setDistance(dist);
    }
  });
  
  // Animation d'assemblage
  useEffect(() => {
    if (enableAnimations && isSelected) {
      const timer = setInterval(() => {
        setAssemblyProgress(prev => {
          const next = prev - 0.02;
          if (next <= 0) {
            clearInterval(timer);
            setTimeout(() => setAssemblyProgress(1), 2000);
            return 0;
          }
          return next;
        });
      }, 16);
      return () => clearInterval(timer);
    }
  }, [isSelected, enableAnimations]);
  
  // Créer la géométrie avec le nouveau système
  const machinedGeometry = useMemo(() => {
    console.log(`[AdvancedRenderer] Processing element ${element.id}`);
    
    // Créer la géométrie de base
    const baseGeometry = createBaseGeometry(element);
    
    // Convertir les features DSTV vers le nouveau format
    const features = convertDSTVToFeatures(element);
    
    if (features.length === 0) {
      return baseGeometry;
    }
    
    // Appliquer les features avec le nouveau système
    const result = featureSystem.applyFeatures(baseGeometry, features, element);
    
    // Nettoyer la géométrie de base
    baseGeometry.dispose();
    
    if (!result.success) {
      console.warn(`[AdvancedRenderer] Feature processing had issues:`, result.errors);
      if (result.warnings) {
        console.warn('Warnings:', result.warnings);
      }
    }
    
    return result.geometry;
  }, [element, featureSystem]);
  
  // Shader personnalisé pour les features
  const material = useMemo(() => {
    // Couleur métallique plus visible sur fond clair
    const baseColor = isSelected ? '#ef4444' : isHighlighted ? '#f59e0b' : '#64748b';
    
    const mat = new THREE.MeshStandardMaterial({
      color: baseColor,
      metalness: 0.75,
      roughness: isSelected ? 0.15 : 0.3,
      envMapIntensity: 0.8
    });
    
    // Shader personnalisé pour effet de coupe
    mat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        // Effet de bord métallique sur les coupes
        vec3 edge = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
        float edgeFactor = pow(1.0 - abs(dot(edge, vec3(0.0, 0.0, 1.0))), 2.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.7, 0.7, 0.8), edgeFactor * 0.3);
        `
      );
    };
    
    return mat;
  }, [isSelected, isHighlighted]);
  
  // Position animée pour assemblage
  const animatedPosition: [number, number, number] = useMemo(() => {
    if (!enableAnimations || assemblyProgress === 1) return element.position;
    
    return [
      element.position[0],
      element.position[1] + (1 - assemblyProgress) * 100,
      element.position[2]
    ];
  }, [element.position, assemblyProgress, enableAnimations]);
  
  // Nettoyer au démontage
  useEffect(() => {
    return () => {
      machinedGeometry?.dispose();
      material?.dispose();
    };
  }, [machinedGeometry, material]);
  
  return (
    <group>
      {/* Élément principal avec LOD */}
      <mesh
        ref={meshRef}
        position={animatedPosition}
        rotation={element.rotation || [0, 0, 0]}
        scale={element.scale || [1, 1, 1]}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        geometry={machinedGeometry}
        material={material}
        castShadow
        receiveShadow
        userData={{ elementId: element.id, element }}
      />
      
      {/* LOD pour les features à distance */}
      {distance > 500 && (
        <LODFeatureRenderer element={element} distance={distance} />
      )}
      
      {/* Soudures animées */}
      {element.assemblies?.filter(a => a.type === AssemblyType.WELD).map((weld, idx) => {
        const metadata = weld.metadata || {};
        const position = weld.position || [0, 0, 0];
        
        const weldPosition: [number, number, number] = [
          element.position[0] + position[0] - (element.dimensions.length || 1000) / 2,
          element.position[1] + position[2],
          element.position[2] + position[1]
        ];
        
        return (
          <group key={`weld-${element.id}-${idx}`}>
            {/* Cordon de soudure avec animation */}
            <mesh 
              position={weldPosition}
              scale={[assemblyProgress, assemblyProgress, assemblyProgress]}
            >
              <capsuleGeometry args={[
                (metadata.size || 5) / 2,
                (metadata.length || 100) * assemblyProgress,
                4,
                8
              ]} />
              <meshStandardMaterial
                color="#ea580c"
                metalness={0.6}
                roughness={0.4}
                emissive="#dc2626"
                emissiveIntensity={isSelected ? 0.2 : 0.05}
              />
            </mesh>
            
            {/* Particules de soudage (si en cours d'animation) */}
            {assemblyProgress < 1 && assemblyProgress > 0 && (
              <mesh position={weldPosition}>
                <sphereGeometry args={[10, 8, 8]} />
                <meshBasicMaterial
                  color="#fbbf24"
                  transparent
                  opacity={0.6}
                />
              </mesh>
            )}
          </group>
        );
      })}
      
      {/* Effet de surbrillance pour sélection */}
      {isSelected && (
        <>
          <lineSegments
            position={animatedPosition}
            rotation={element.rotation || [0, 0, 0]}
            scale={element.scale || [1, 1, 1]}
          >
            <edgesGeometry args={[machinedGeometry, 15]} />
            <lineBasicMaterial 
              color="#dc2626" 
              linewidth={2}
              transparent
              opacity={assemblyProgress}
            />
          </lineSegments>
          
          {/* Halo de sélection */}
          <mesh
            position={animatedPosition}
            rotation={element.rotation || [0, 0, 0]}
            scale={[1.02, 1.02, 1.02]}
          >
            <bufferGeometry attach="geometry" {...machinedGeometry} />
            <meshBasicMaterial
              color="#ef4444"
              transparent
              opacity={0.1}
              side={THREE.BackSide}
            />
          </mesh>
        </>
      )}
    </group>
  );
};

/**
 * Scene wrapper avec gestion des performances
 */
interface AdvancedFeatureSceneProps {
  elements: PivotElement[];
  selectedElementId?: string | null;
  highlightedElementId?: string | null;
  enableAnimations?: boolean;
  onElementSelect?: (id: string | null) => void;
  onElementHover?: (id: string | null) => void;
}

export const AdvancedFeatureScene: React.FC<AdvancedFeatureSceneProps> = ({
  elements,
  selectedElementId,
  highlightedElementId,
  enableAnimations = true,
  onElementSelect,
  onElementHover
}) => {
  // Afficher les statistiques du système
  useEffect(() => {
    const featureSystem = FeatureSystem.getInstance();
    const stats = featureSystem.getStatistics();
    console.log('[AdvancedScene] Feature System Statistics:', stats);
    
    // Nettoyer le cache au démontage
    return () => {
      featureSystem.reset();
    };
  }, []);
  
  return (
    <>
      {elements.map(element => (
        <AdvancedFeatureRenderer
          key={element.id}
          element={element}
          isSelected={element.id === selectedElementId}
          isHighlighted={element.id === highlightedElementId}
          enableAnimations={enableAnimations}
          onClick={() => onElementSelect?.(element.id)}
          onPointerOver={() => onElementHover?.(element.id)}
          onPointerOut={() => onElementHover?.(null)}
        />
      ))}
    </>
  );
};