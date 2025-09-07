/**
 * CoreTypes.ts - Import centralisé des types principaux
 * Facilite l'import des types depuis l'architecture principale
 */

// Import et réexport des types principaux
import * as THREE from 'three';
export { THREE };

// Types depuis le système de features
export type { Feature } from '../../../types';
export { FeatureType } from '../../../types';

// Types depuis le système viewer - stub temporaire pour éviter les problèmes d'import
export interface PivotElement {
  id: string;
  dimensions?: {
    length?: number;
    height?: number;
    width?: number;
    thickness?: number;
    webThickness?: number;
    flangeThickness?: number;
  };
  type?: string;
  materialType?: string;
  profileType?: string;
  [key: string]: any; // Pour la flexibilité
}

// Enum ProfileFace depuis types viewer
export enum ProfileFace {
  TOP_FLANGE = 'TOP_FLANGE',
  BOTTOM_FLANGE = 'BOTTOM_FLANGE',
  WEB = 'WEB',
  BOTTOM = 'BOTTOM',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  TOP = 'TOP'
}

// ProfileType déjà défini dans CutTypes.ts
export { ProfileType } from './CutTypes';

// Ajouter les types manquants pour compatibilité
export enum FeatureTypeExtended {
  CUT = 'CUT',
  NOTCH = 'NOTCH',
  GROOVE = 'GROOVE',
  HOLE = 'HOLE',
  MARKING = 'MARKING'
}

// Types de résultat de traitement
export interface ProcessorResult {
  success: boolean;
  geometry?: THREE.BufferGeometry;
  error?: string;
  warnings?: string[];
  metadata?: any;
}