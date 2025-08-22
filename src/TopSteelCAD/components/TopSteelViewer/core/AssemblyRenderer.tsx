'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { PivotElement, AssemblyType } from '@/types/viewer';

/**
 * Composant de rendu des assemblages (boulons, écrous, soudures)
 * Produit un rendu réaliste et professionnel des éléments d'assemblage
 */

interface BoltAssemblyProps {
  position: [number, number, number];
  diameter: number;
  length: number;
  includeWasher?: boolean;
  includeNut?: boolean;
}

/**
 * Rendu d'un assemblage boulon complet (tête hexagonale + tige + écrou optionnel)
 */
export const BoltAssembly: React.FC<BoltAssemblyProps> = ({ 
  position, 
  diameter, 
  length, 
  includeWasher = true,
  includeNut = true 
}) => {
  const group = useMemo(() => {
    // Dimensions basées sur les normes ISO
    const headHeight = diameter * 0.7;
    const headRadius = diameter * 0.9;
    const nutHeight = diameter * 0.8;
    const nutRadius = diameter * 0.9;
    const washerThickness = diameter * 0.1;
    const washerRadius = diameter * 1.5;
    
    return {
      headHeight,
      headRadius,
      nutHeight,
      nutRadius,
      washerThickness,
      washerRadius
    };
  }, [diameter]);

  // Matériaux métalliques réalistes
  const boltMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#8b8c8d', // Acier galvanisé
    metalness: 0.9,
    roughness: 0.15,
    envMapIntensity: 0.8
  }), []);

  const washerMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#a8a9aa', // Légèrement plus clair
    metalness: 0.85,
    roughness: 0.25
  }), []);

  return (
    <group position={position}>
      {/* Tête de boulon hexagonale */}
      <mesh position={[0, length/2 + group.headHeight/2, 0]}>
        <cylinderGeometry args={[group.headRadius, group.headRadius, group.headHeight, 6]} />
        <primitive object={boltMaterial} />
      </mesh>
      
      {/* Tige du boulon */}
      <mesh>
        <cylinderGeometry args={[diameter/2, diameter/2, length, 16]} />
        <primitive object={boltMaterial} />
      </mesh>
      
      {/* Rondelle (côté tête) */}
      {includeWasher && (
        <mesh position={[0, length/2 - group.washerThickness/2, 0]} rotation={[Math.PI/2, 0, 0]}>
          <ringGeometry args={[diameter/2 * 1.1, group.washerRadius, 32]} />
          <primitive object={washerMaterial} attach="material" />
        </mesh>
      )}
      
      {/* Écrou hexagonal */}
      {includeNut && (
        <>
          {/* Rondelle (côté écrou) */}
          {includeWasher && (
            <mesh position={[0, -length/2 + group.washerThickness/2, 0]} rotation={[Math.PI/2, 0, 0]}>
              <ringGeometry args={[diameter/2 * 1.1, group.washerRadius, 32]} />
              <primitive object={washerMaterial} attach="material" />
            </mesh>
          )}
          
          {/* Écrou */}
          <mesh position={[0, -length/2 - group.nutHeight/2, 0]}>
            <cylinderGeometry args={[group.nutRadius, group.nutRadius, group.nutHeight, 6]} />
            <meshStandardMaterial
              color="#7a7b7c"
              metalness={0.88}
              roughness={0.2}
            />
          </mesh>
        </>
      )}
    </group>
  );
};

/**
 * Rendu d'une soudure d'angle réaliste
 */
interface FilletWeldProps {
  position: [number, number, number];
  length: number;
  size: number;
  orientation?: 'horizontal' | 'vertical';
}

export const FilletWeld: React.FC<FilletWeldProps> = ({ 
  position, 
  length, 
  size, 
  orientation = 'horizontal' 
}) => {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    
    // Profil triangulaire de la soudure d'angle
    shape.moveTo(0, 0);
    shape.lineTo(size, 0);
    shape.lineTo(0, size);
    shape.closePath();
    
    const extrudeSettings = {
      depth: length,
      bevelEnabled: true,
      bevelThickness: size * 0.1,
      bevelSize: size * 0.05,
      bevelSegments: 3,
      steps: 2
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [length, size]);

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#d97706', // Orange brûlé (aspect soudure)
    metalness: 0.6,
    roughness: 0.4,
    emissive: '#92400e',
    emissiveIntensity: 0.05
  }), []);

  const rotation: [number, number, number] = orientation === 'vertical' 
    ? [0, Math.PI/2, 0] 
    : [Math.PI/2, 0, 0];

  return (
    <mesh position={position} rotation={rotation} geometry={geometry}>
      <primitive object={material} />
    </mesh>
  );
};

/**
 * Rendu d'une soudure bout à bout
 */
interface ButtWeldProps {
  position: [number, number, number];
  width: number;
  height: number;
  thickness: number;
}

export const ButtWeld: React.FC<ButtWeldProps> = ({ 
  position, 
  width, 
  height, 
  thickness 
}) => {
  const geometry = useMemo(() => {
    // Créer une forme avec renflement pour la soudure
    const shape = new THREE.Shape();
    const bulge = thickness * 0.2; // Renflement de la soudure
    
    shape.moveTo(-width/2, -bulge);
    shape.quadraticCurveTo(0, bulge, width/2, -bulge);
    shape.lineTo(width/2, height + bulge);
    shape.quadraticCurveTo(0, height - bulge, -width/2, height + bulge);
    shape.closePath();
    
    const extrudeSettings = {
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: 1,
      bevelSize: 0.5,
      bevelSegments: 2
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [width, height, thickness]);

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ea580c',
    metalness: 0.5,
    roughness: 0.5,
    emissive: '#c2410c',
    emissiveIntensity: 0.03
  }), []);

  return (
    <mesh position={position} geometry={geometry}>
      <primitive object={material} />
    </mesh>
  );
};

/**
 * Composant principal de rendu des assemblages
 */
interface AssemblyRendererProps {
  element: PivotElement;
  isSelected: boolean;
}

export const AssemblyRenderer: React.FC<AssemblyRendererProps> = ({ 
  element, 
  isSelected: _isSelected 
}) => {
  // Rendu des trous avec représentation de boulons
  const holes = useMemo(() => {
    const features = element.metadata?.cuttingFeatures as unknown[] || [];
    return features.filter(f => f.type === 'hole').map((hole, idx) => {
      const position = hole.position as [number, number, number];
      
      // Ajuster la position relative à l'élément parent
      const relativePosition: [number, number, number] = [
        element.position[0] + position[0] - element.dimensions.length / 2,
        element.position[1] + position[2],
        element.position[2] + position[1] - (element.dimensions.height || 0) / 2
      ];
      
      return (
        <BoltAssembly
          key={`bolt-${element.id}-${idx}`}
          position={relativePosition}
          diameter={hole.diameter || 20}
          length={element.dimensions.width || 150}
          includeWasher={hole.diameter > 15}
          includeNut={true}
        />
      );
    });
  }, [element]);

  // Rendu des soudures
  const welds = useMemo(() => {
    if (!element.assemblies) return null;
    
    return element.assemblies
      .filter(a => a.type === AssemblyType.WELD)
      .map((weld, idx) => {
        const metadata = weld.metadata || {};
        const weldType = metadata.weldType || 'fillet';
        const position = weld.position || [0, 0, 0];
        
        // Position relative à l'élément parent
        const relativePosition: [number, number, number] = [
          element.position[0] + position[0] - element.dimensions.length / 2,
          element.position[1] + position[2],
          element.position[2] + position[1]
        ];
        
        if (weldType === 'fillet') {
          return (
            <FilletWeld
              key={`weld-${element.id}-${idx}`}
              position={relativePosition}
              length={metadata.length || 100}
              size={metadata.size || 5}
              orientation="horizontal"
            />
          );
        } else if (weldType === 'butt') {
          return (
            <ButtWeld
              key={`weld-${element.id}-${idx}`}
              position={relativePosition}
              width={metadata.length || 100}
              height={metadata.size || 10}
              thickness={metadata.thickness || 5}
            />
          );
        }
        
        // Soudure par points (par défaut)
        return (
          <mesh key={`weld-${element.id}-${idx}`} position={relativePosition}>
            <sphereGeometry args={[metadata.size || 8, 16, 16]} />
            <meshStandardMaterial
              color="#f97316"
              metalness={0.4}
              roughness={0.6}
              emissive="#ea580c"
              emissiveIntensity={0.1}
            />
          </mesh>
        );
      });
  }, [element]);

  // Rendu des découpes laser (slots)
  const laserCuts = useMemo(() => {
    const features = element.metadata?.cuttingFeatures as unknown[] || [];
    return features.filter(f => f.type === 'slot').map((slot, idx) => {
      const position = slot.position as [number, number, number];
      
      // Position relative avec effet de gravure
      const relativePosition: [number, number, number] = [
        element.position[0] + position[0] - element.dimensions.length / 2,
        element.position[1] + position[2] + 0.5, // Légèrement au-dessus de la surface
        element.position[2] + position[1] - (element.dimensions.height || 0) / 2
      ];
      
      return (
        <mesh key={`laser-${element.id}-${idx}`} position={relativePosition}>
          <boxGeometry args={[slot.length || 10, 1, slot.width || 4]} />
          <meshStandardMaterial
            color="#1e293b"
            metalness={0.1}
            roughness={0.9}
            emissive="#0f172a"
            emissiveIntensity={0.2}
          />
        </mesh>
      );
    });
  }, [element]);

  return (
    <>
      {holes}
      {welds}
      {laserCuts}
    </>
  );
};