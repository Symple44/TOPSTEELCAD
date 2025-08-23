/**
 * SimpleMachinedRenderer - Version simplifiée avec superposition visuelle des features
 * Migré pour utiliser le nouveau système de features
 */

'use client';

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PivotElement, MaterialType, AssemblyType } from '@/types/viewer';
// import { FeatureSystem } from '@/TopSteelCAD/core/features/FeatureSystem'; // TODO: Implement feature system integration
import { Feature, FeatureType, ProfileFace, CoordinateSystem } from '@/TopSteelCAD/core/features/types';

/**
 * Convertit les features DSTV en features du nouveau système
 */
function convertDSTVToFeatures(element: PivotElement): Feature[] {
  const features: Feature[] = [];
  const cuttingFeatures = element.metadata?.cuttingFeatures as any[] || [];
  
  cuttingFeatures.forEach((dstvFeature, index) => {
    let featureType = FeatureType.HOLE;
    const params: any = {};
    
    // Déterminer le type de feature
    switch (dstvFeature.type) {
      case 'hole':
        if (dstvFeature.metadata?.tapped) {
          featureType = FeatureType.TAPPED_HOLE;
          params.threadType = dstvFeature.metadata.threadType || 'metric';
          params.threadPitch = dstvFeature.metadata.threadPitch;
          params.threadClass = dstvFeature.metadata.threadClass;
        } else if (dstvFeature.metadata?.countersink) {
          featureType = FeatureType.COUNTERSINK;
          params.sinkAngle = dstvFeature.metadata.sinkAngle || 90;
          params.sinkDiameter = dstvFeature.metadata.sinkDiameter || dstvFeature.diameter * 2;
          params.sinkDepth = dstvFeature.metadata.sinkDepth || 5;
          params.sinkType = 'countersink';
        } else if (dstvFeature.metadata?.counterbore) {
          featureType = FeatureType.COUNTERBORE;
          params.sinkDiameter = dstvFeature.metadata.boreDiameter || dstvFeature.diameter * 1.5;
          params.sinkDepth = dstvFeature.metadata.boreDepth || 5;
          params.sinkType = 'counterbore';
        }
        params.diameter = dstvFeature.diameter || 20;
        params.depth = dstvFeature.depth || -1;
        break;
        
      case 'slot':
        featureType = FeatureType.SLOT;
        params.length = dstvFeature.length || 50;
        params.width = dstvFeature.width || 20;
        params.depth = dstvFeature.depth || -1;
        break;
        
      case 'cutout':
        featureType = FeatureType.CUTOUT;
        params.length = dstvFeature.length || 100;
        params.width = dstvFeature.width || 50;
        params.depth = dstvFeature.depth || -1;
        break;
        
      case 'notch':
        featureType = FeatureType.NOTCH;
        params.notchType = dstvFeature.metadata?.notchType || 'rectangular';
        params.length = dstvFeature.length || 50;
        params.width = dstvFeature.width || 30;
        break;
        
      case 'marking':
        featureType = FeatureType.MARKING;
        params.markingType = dstvFeature.metadata?.markingType || 'center_punch';
        params.depth = dstvFeature.metadata?.depth || 0.5;
        break;
        
      case 'text':
        featureType = FeatureType.TEXT;
        params.text = dstvFeature.text || 'A-1';
        params.fontSize = dstvFeature.fontSize || 20;
        params.textType = dstvFeature.metadata?.textType || 'engraved';
        params.depth = dstvFeature.metadata?.depth || 0.5;
        break;
        
      case 'coping':
        featureType = FeatureType.COPING;
        params.copingType = dstvFeature.metadata?.copingType || 'profile_fit';
        params.targetProfile = dstvFeature.metadata?.targetProfile;
        params.angle = dstvFeature.metadata?.angle || 90;
        params.clearance = dstvFeature.metadata?.clearance || 2;
        break;
        
      case 'contour':
        featureType = FeatureType.CONTOUR;
        params.points = dstvFeature.points?.map((p: any) => new THREE.Vector2(p.x, p.y)) || [];
        params.closed = dstvFeature.closed !== false;
        params.bulge = dstvFeature.points?.map((p: any) => p.bulge || 0) || [];
        break;
    }
    
    // Déterminer la face
    const face = determineFace(dstvFeature, element);
    
    features.push({
      id: `${dstvFeature.type}-${index}`,
      type: featureType,
      coordinateSystem: CoordinateSystem.LOCAL,
      position: new THREE.Vector3(
        dstvFeature.position?.[0] || 0,
        dstvFeature.position?.[1] || 0,
        dstvFeature.position?.[2] || 0
      ),
      rotation: new THREE.Euler(
        dstvFeature.rotation?.[0] || 0,
        dstvFeature.rotation?.[1] || 0,
        dstvFeature.rotation?.[2] || 0
      ),
      face,
      parameters: params,
      metadata: dstvFeature.metadata
    });
  });
  
  return features;
}

/**
 * Détermine la face selon la feature et le profil
 */
function determineFace(feature: any, element: PivotElement): ProfileFace {
  // Si la face est explicite dans les métadonnées
  if (feature.metadata?.face) {
    const faceMap: Record<string, ProfileFace> = {
      'web': ProfileFace.WEB,
      'top_flange': ProfileFace.TOP_FLANGE,
      'bottom_flange': ProfileFace.BOTTOM_FLANGE,
      'top': ProfileFace.TOP,
      'bottom': ProfileFace.BOTTOM,
      'left': ProfileFace.LEFT,
      'right': ProfileFace.RIGHT,
      'left_leg': ProfileFace.LEFT_LEG,
      'right_leg': ProfileFace.RIGHT_LEG
    };
    return faceMap[feature.metadata.face] || ProfileFace.TOP;
  }
  
  // Détection automatique selon la position Z et le type de profil
  const z = feature.position?.[2] || 0;
  const profile = element.metadata?.profile || '';
  
  if (/^(IPE|HE|UPN|UAP)/i.test(profile)) {
    if (Math.abs(z) < 10) return ProfileFace.WEB;
    return z > 0 ? ProfileFace.TOP_FLANGE : ProfileFace.BOTTOM_FLANGE;
  }
  
  if (element.materialType === MaterialType.PLATE) {
    return ProfileFace.TOP;
  }
  
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
      if (element.metadata?.profile?.startsWith('IPE') || 
          element.metadata?.profile?.startsWith('HE')) {
        const webThickness = element.metadata?.webThickness || (dims.thickness || 10.7) * 0.66;
        const flangeThickness = element.metadata?.flangeThickness || dims.thickness || 10.7;
        return createIPEGeometry(
          dims.length || 1200,
          dims.height || 300,
          dims.width || 150,
          flangeThickness,
          webThickness
        );
      }
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
      
    case MaterialType.TUBE:
      if (element.metadata?.profile?.startsWith('CHS')) {
        // Tube circulaire
        return new THREE.CylinderGeometry(
          dims.diameter || 100,
          dims.diameter || 100,
          dims.length || 1000,
          32
        );
      }
      // Tube rectangulaire
      return new THREE.BoxGeometry(
        dims.length || 1000,
        dims.height || 200,
        dims.width || 100
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
 * Composant pour rendre les features en superposition (mode simple)
 */
const FeatureOverlays: React.FC<{ element: PivotElement; features: Feature[] }> = ({ 
  element, 
  features 
}) => {
  const dims = element.dimensions;
  
  return (
    <>
      {features.map((feature, idx) => {
        const key = `${element.id}-feature-${idx}`;
        
        // Position dans l'espace local de l'élément
        const localPos = feature.position;
        
        // Convertir en position globale
        const globalX = element.position[0] + localPos.x;
        const globalY = element.position[1] + localPos.y;
        const globalZ = element.position[2] + localPos.z;
        
        // Rendu visuel selon le type de feature
        switch (feature.type) {
          case FeatureType.HOLE:
          case FeatureType.TAPPED_HOLE: {
            const diameter = feature.parameters.diameter || 20;
            const isThreaded = feature.type === FeatureType.TAPPED_HOLE;
            
            return (
              <group key={key}>
                {/* Cylindre représentant le trou */}
                <mesh 
                  position={[globalX, globalY, globalZ]}
                  rotation={[0, 0, Math.PI / 2]}
                >
                  <cylinderGeometry args={[diameter / 2, diameter / 2, dims.width || 150, 32]} />
                  <meshStandardMaterial 
                    color={isThreaded ? "#1e3a8a" : "#0f172a"}
                    metalness={0.9}
                    roughness={0.1}
                    opacity={0.85}
                    transparent
                  />
                </mesh>
                
                {/* Anneaux aux extrémités */}
                {[1, -1].map((side, i) => (
                  <mesh 
                    key={`ring-${i}`}
                    position={[globalX, globalY, globalZ + side * (dims.width || 150) / 2]}
                    rotation={[Math.PI / 2, 0, 0]}
                  >
                    <ringGeometry args={[diameter / 2, diameter / 2 + 1, 32]} />
                    <meshStandardMaterial 
                      color="#64748b"
                      metalness={0.8}
                      roughness={0.3}
                    />
                  </mesh>
                ))}
              </group>
            );
          }
            
          case FeatureType.COUNTERSINK:
          case FeatureType.COUNTERBORE: {
            const sinkDia = feature.parameters.sinkDiameter || 30;
            const holeDia = feature.parameters.diameter || 15;
            const sinkDepth = feature.parameters.sinkDepth || 5;
            
            return (
              <group key={key}>
                {/* Fraisage */}
                <mesh position={[globalX, globalY, globalZ]}>
                  <cylinderGeometry args={[sinkDia / 2, holeDia / 2, sinkDepth, 16]} />
                  <meshStandardMaterial 
                    color="#334155"
                    metalness={0.7}
                    roughness={0.3}
                    opacity={0.9}
                    transparent
                  />
                </mesh>
              </group>
            );
          }
            
          case FeatureType.SLOT: {
            return (
              <mesh 
                key={key} 
                position={[globalX, globalY, globalZ]}
                rotation={feature.rotation}
              >
                <boxGeometry args={[
                  feature.parameters.length || 50,
                  dims.thickness || 10,
                  feature.parameters.width || 20
                ]} />
                <meshStandardMaterial 
                  color="#1e293b"
                  metalness={0.5}
                  roughness={0.5}
                  opacity={0.85}
                  transparent
                />
              </mesh>
            );
          }
            
          case FeatureType.CUTOUT: {
            return (
              <mesh 
                key={key} 
                position={[globalX, globalY, globalZ]}
              >
                <boxGeometry args={[
                  feature.parameters.length || 100,
                  dims.height || 300,
                  feature.parameters.width || 50
                ]} />
                <meshStandardMaterial 
                  color="#0f172a"
                  metalness={0.3}
                  roughness={0.7}
                  opacity={0.8}
                  transparent
                />
              </mesh>
            );
          }
            
          case FeatureType.MARKING: {
            return (
              <mesh 
                key={key} 
                position={[globalX, globalY + (dims.height || 300) / 2, globalZ]}
              >
                <sphereGeometry args={[2, 8, 8]} />
                <meshStandardMaterial 
                  color="#ef4444"
                  emissive="#dc2626"
                  emissiveIntensity={0.2}
                />
              </mesh>
            );
          }
            
          case FeatureType.TEXT: {
            // Pour le texte, on affiche un placeholder
            return (
              <mesh 
                key={key} 
                position={[globalX, globalY + (dims.height || 300) / 2 + 1, globalZ]}
              >
                <planeGeometry args={[feature.parameters.fontSize || 20, feature.parameters.fontSize || 20]} />
                <meshStandardMaterial 
                  color="#3b82f6"
                  opacity={0.7}
                  transparent
                  side={THREE.DoubleSide}
                />
              </mesh>
            );
          }
            
          default:
            return null;
        }
      })}
    </>
  );
};

/**
 * Composant pour rendre les soudures
 */
const WeldOverlays: React.FC<{ element: PivotElement }> = ({ element }) => {
  if (!element.assemblies) return null;
  
  const welds = element.assemblies.filter(a => a.type === AssemblyType.WELD);
  const dims = element.dimensions;
  
  return (
    <>
      {welds.map((weld, idx) => {
        const metadata = weld.metadata || {};
        const position = weld.position || [0, 0, 0];
        
        // Position absolue de la soudure
        const weldX = element.position[0] + position[0] - (dims.length || 1200) / 2;
        const weldY = element.position[1] + position[2];
        const weldZ = element.position[2] + position[1];
        
        return (
          <group key={`weld-${element.id}-${idx}`}>
            {/* Cordon de soudure principal */}
            <mesh position={[weldX, weldY, weldZ]}>
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
                emissive="#c2410c"
                emissiveIntensity={0.05}
              />
            </mesh>
            
            {/* Points de soudure pour texture */}
            {Array.from({ length: 3 }, (_, i) => (
              <mesh 
                key={`weld-detail-${i}`}
                position={[
                  weldX + (i - 1) * ((metadata.length || 100) / 3),
                  weldY,
                  weldZ
                ]}
              >
                <sphereGeometry args={[(metadata.size || 5) * 0.7, 8, 8]} />
                <meshStandardMaterial
                  color="#dc2626"
                  metalness={0.5}
                  roughness={0.5}
                  emissive="#991b1b"
                  emissiveIntensity={0.03}
                />
              </mesh>
            ))}
          </group>
        );
      })}
    </>
  );
};

/**
 * Composant principal pour le rendu simple avec superposition
 */
interface SimpleMachinedElementProps {
  element: PivotElement;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
  useFeatureSystem?: boolean; // Option pour utiliser le nouveau système
}

export const SimpleMachinedElement: React.FC<SimpleMachinedElementProps> = ({
  element,
  isSelected,
  isHighlighted,
  onClick,
  onPointerOver,
  onPointerOut,
  useFeatureSystem = true
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Convertir les features DSTV vers le nouveau format
  const features = useMemo(() => {
    if (!useFeatureSystem) return [];
    return convertDSTVToFeatures(element);
  }, [element, useFeatureSystem]);
  
  // Créer la géométrie de base
  const baseGeometry = useMemo(() => createBaseGeometry(element), [element]);
  
  // Matériau métallique
  const material = useMemo(() => {
    const baseColor = isSelected ? '#ef4444' : isHighlighted ? '#f59e0b' : '#64748b';
    
    return new THREE.MeshStandardMaterial({
      color: baseColor,
      metalness: 0.75,
      roughness: isSelected ? 0.2 : 0.35,
      emissive: isSelected ? '#dc2626' : '#000000',
      emissiveIntensity: isSelected ? 0.03 : 0
    });
  }, [isSelected, isHighlighted]);
  
  // Rotation selon le type
  const rotation = useMemo(() => {
    if (element.materialType === MaterialType.TUBE && element.metadata?.profile?.startsWith('CHS')) {
      return [0, 0, Math.PI / 2] as [number, number, number];
    }
    return element.rotation || [0, 0, 0];
  }, [element]);
  
  return (
    <group>
      {/* Élément principal */}
      <mesh
        ref={meshRef}
        position={element.position}
        rotation={rotation}
        scale={element.scale || [1, 1, 1]}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        geometry={baseGeometry}
        material={material}
        castShadow
        receiveShadow
        userData={{ elementId: element.id, element }}
      />
      
      {/* Features en superposition */}
      <FeatureOverlays element={element} features={features} />
      
      {/* Soudures */}
      <WeldOverlays element={element} />
      
      {/* Contour de sélection */}
      {isSelected && (
        <lineSegments
          position={element.position}
          rotation={rotation}
          scale={element.scale || [1, 1, 1]}
        >
          <edgesGeometry args={[baseGeometry, 15]} />
          <lineBasicMaterial color="#dc2626" linewidth={2} />
        </lineSegments>
      )}
    </group>
  );
};

export default SimpleMachinedElement;