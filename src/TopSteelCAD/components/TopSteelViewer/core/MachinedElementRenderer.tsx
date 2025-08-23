/**
 * MachinedElementRenderer - Migré vers le nouveau système de features
 */

'use client';

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PivotElement, MaterialType, AssemblyType } from '@/types/viewer';
import { FeatureSystem } from '@/TopSteelCAD/core/features/FeatureSystem';
import { Feature, FeatureType, ProfileFace } from '@/TopSteelCAD/core/features/types';

/**
 * Convertit les features DSTV en features du nouveau système
 */
function convertToFeatures(element: PivotElement): Feature[] {
  const features: Feature[] = [];
  const cuttingFeatures = element.metadata?.cuttingFeatures as any[] || [];
  
  cuttingFeatures.forEach((dstvFeature, index) => {
    let featureType = FeatureType.HOLE;
    const params: any = {};
    
    // Déterminer le type de feature et ses paramètres
    switch (dstvFeature.type) {
      case 'hole':
        // Analyser le type spécifique de trou
        if (dstvFeature.metadata?.boltHole) {
          featureType = FeatureType.HOLE;
        } else if (dstvFeature.metadata?.tapped) {
          featureType = FeatureType.TAPPED_HOLE;
          params.threadType = dstvFeature.metadata.threadType || 'metric';
          params.threadPitch = dstvFeature.metadata.threadPitch;
        } else if (dstvFeature.metadata?.countersink) {
          featureType = FeatureType.COUNTERSINK;
          params.sinkAngle = dstvFeature.metadata.sinkAngle || 90;
          params.sinkDiameter = dstvFeature.diameter * 2;
          params.sinkDepth = dstvFeature.metadata.sinkDepth || 5;
          params.sinkType = 'countersink';
        }
        params.diameter = dstvFeature.diameter || 20;
        params.depth = dstvFeature.depth || element.dimensions.width || 100;
        break;
        
      case 'slot':
        featureType = FeatureType.SLOT;
        params.length = dstvFeature.length || 50;
        params.width = dstvFeature.width || 20;
        params.depth = dstvFeature.depth || element.dimensions.width || 100;
        break;
        
      case 'cutout':
        featureType = FeatureType.CUTOUT;
        params.length = dstvFeature.length || 100;
        params.width = dstvFeature.width || 50;
        break;
        
      case 'notch':
        featureType = FeatureType.NOTCH;
        params.notchType = dstvFeature.metadata?.notchType || 'rectangular';
        params.length = dstvFeature.length || 50;
        params.width = dstvFeature.width || 30;
        break;
        
      case 'coping':
        featureType = FeatureType.COPING;
        params.copingType = dstvFeature.metadata?.copingType || 'profile_fit';
        params.targetProfile = dstvFeature.metadata?.targetProfile || 'IPE300';
        params.angle = dstvFeature.metadata?.angle || 90;
        params.clearance = dstvFeature.metadata?.clearance || 2;
        break;
    }
    
    // Déterminer la face selon la position Z
    const face = determineFace(dstvFeature.position[2], element);
    
    features.push({
      id: `${dstvFeature.type}-${index}`,
      type: featureType,
      coordinateSystem: 'local' as any,
      position: new THREE.Vector3(
        dstvFeature.position[0],
        dstvFeature.position[1],
        dstvFeature.position[2]
      ),
      rotation: new THREE.Euler(0, 0, 0),
      face,
      parameters: params,
      metadata: dstvFeature.metadata
    });
  });
  
  return features;
}

/**
 * Détermine la face selon la coordonnée Z et le type de profil
 */
function determineFace(z: number, element: PivotElement): ProfileFace {
  const profile = element.metadata?.profile || '';
  
  // Pour les profils en I
  if (/^(IPE|HE)/i.test(profile)) {
    if (Math.abs(z) < 1) return ProfileFace.WEB;
    if (z > 0) return ProfileFace.TOP_FLANGE;
    return ProfileFace.BOTTOM_FLANGE;
  }
  
  // Pour les plaques
  if (element.materialType === MaterialType.PLATE) {
    return z >= 0 ? ProfileFace.TOP : ProfileFace.BOTTOM;
  }
  
  // Par défaut
  return ProfileFace.TOP;
}

/**
 * Crée une géométrie de poutre IPE avec profil en I
 */
function createIPEGeometry(
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
    bevelEnabled: false,
    steps: 1
  });
  
  geometry.center();
  geometry.rotateY(Math.PI / 2);
  
  return geometry;
}

/**
 * Crée la géométrie de base selon le type d'élément
 */
function createBaseGeometry(element: PivotElement): THREE.BufferGeometry {
  const dims = element.dimensions;
  
  switch (element.materialType) {
    case MaterialType.BEAM:
      // Utiliser les métadonnées pour les dimensions IPE si disponibles
      if (element.metadata?.profile?.startsWith('IPE') || 
          element.metadata?.profile?.startsWith('HE')) {
        const webThickness = element.metadata?.webThickness || dims.thickness * 0.66;
        const flangeThickness = element.metadata?.flangeThickness || dims.thickness;
        return createIPEGeometry(
          dims.length || 1200,
          dims.height || 300,
          dims.width || 150,
          flangeThickness || 10.7,
          webThickness || 7.1
        );
      }
      // Sinon, box simple
      return new THREE.BoxGeometry(
        dims.length || 1200,
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
      
    default:
      return new THREE.BoxGeometry(
        dims.length || 100,
        dims.height || 100,
        dims.width || 100
      );
  }
}

/**
 * Composant pour rendre un élément usiné avec découpes
 */
interface MachinedElementProps {
  element: PivotElement;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

export const MachinedElementRenderer: React.FC<MachinedElementProps> = ({
  element,
  isSelected,
  isHighlighted,
  onClick,
  onPointerOver,
  onPointerOut
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Système de features singleton
  const featureSystem = useMemo(() => FeatureSystem.getInstance({
    cacheEnabled: true,
    cacheSize: 100,
    validateFeatures: true,
    optimizeGeometry: true
  }), []);
  
  // Créer la géométrie usinée avec les features
  const machinedGeometry = useMemo(() => {
    console.log(`[MachinedRenderer] Processing element ${element.id}`);
    
    // Créer la géométrie de base
    const baseGeometry = createBaseGeometry(element);
    
    // Convertir et appliquer les features
    const features = convertToFeatures(element);
    
    if (features.length === 0) {
      return baseGeometry;
    }
    
    // Appliquer les features avec le nouveau système
    const result = featureSystem.applyFeatures(baseGeometry, features, element);
    
    // Nettoyer la géométrie de base
    baseGeometry.dispose();
    
    if (!result.success && result.errors) {
      console.warn(`[MachinedRenderer] Processing errors:`, result.errors);
    }
    
    return result.geometry;
  }, [element, featureSystem]);
  
  // Matériau optimisé
  const material = useMemo(() => {
    const baseColor = isSelected ? '#ef4444' : isHighlighted ? '#f59e0b' : '#64748b';
    
    return new THREE.MeshStandardMaterial({
      color: baseColor,
      metalness: 0.7,
      roughness: isSelected ? 0.2 : 0.35,
      envMapIntensity: 0.8
    });
  }, [isSelected, isHighlighted]);
  
  return (
    <group>
      {/* Élément principal */}
      <mesh
        ref={meshRef}
        position={element.position}
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
      
      {/* Soudures */}
      {element.assemblies?.filter(a => a.type === AssemblyType.WELD).map((weld, idx) => {
        const metadata = weld.metadata || {};
        const position = weld.position || [0, 0, 0];
        
        // Calculer la position de la soudure dans l'espace 3D
        const weldPosition: [number, number, number] = [
          element.position[0] + position[0] - (element.dimensions.length || 1200) / 2,
          element.position[1] + position[2],
          element.position[2] + position[1]
        ];
        
        return (
          <mesh key={`weld-${idx}`} position={weldPosition}>
            <capsuleGeometry args={[
              (metadata.size || 5) / 2,
              metadata.length || 100,
              4,
              8
            ]} />
            <meshStandardMaterial
              color="#ea580c"
              metalness={0.6}
              roughness={0.4}
              emissive="#dc2626"
              emissiveIntensity={isSelected ? 0.15 : 0.05}
            />
          </mesh>
        );
      })}
      
      {/* Effet de surbrillance pour sélection */}
      {isSelected && (
        <lineSegments
          position={element.position}
          rotation={element.rotation || [0, 0, 0]}
          scale={element.scale || [1, 1, 1]}
        >
          <edgesGeometry args={[machinedGeometry, 15]} />
          <lineBasicMaterial color="#dc2626" linewidth={2} />
        </lineSegments>
      )}
    </group>
  );
};

export default MachinedElementRenderer;