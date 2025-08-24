/**
 * Types pour le système de coordonnées unifié
 */

import * as THREE from 'three';

/**
 * Espace de coordonnées
 */
export interface CoordinateSpace {
  origin: 'center' | 'corner' | 'custom';
  axes: {
    x: 'length' | 'width' | 'height' | 'custom';
    y: 'length' | 'width' | 'height' | 'custom';
    z: 'length' | 'width' | 'height' | 'custom';
  };
  units: 'mm' | 'inch' | 'm';
  handedness: 'right' | 'left';
}

/**
 * Transformation entre espaces de coordonnées
 */
export interface CoordinateTransform {
  from: CoordinateSpace;
  to: CoordinateSpace;
  translation: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

/**
 * Contexte de transformation
 */
export interface TransformContext {
  profileType?: string;
  profileDimensions?: {
    length: number;
    height: number;
    width: number;
    thickness?: number;
  };
  face?: string;
  featureType?: string;
  metadata?: Record<string, any>;
}

/**
 * Données de transformation
 */
export interface TransformData {
  original: THREE.Vector3;
  current: THREE.Vector3;
  metadata: TransformMetadata;
  transformations: TransformationRecord[];
}

/**
 * Métadonnées de transformation
 */
export interface TransformMetadata {
  pluginId: string;
  profileType?: string;
  profileDimensions?: {
    length: number;
    height: number;
    width: number;
    thickness?: number;
  };
  face?: string;
  originalData?: any;
  [key: string]: any;
}

/**
 * Enregistrement d'une transformation
 */
export interface TransformationRecord {
  stage: string;
  before: THREE.Vector3;
  after: THREE.Vector3;
  metadata: TransformMetadata;
  timestamp?: number;
}

/**
 * Historique de transformation
 */
export interface TransformHistory {
  timestamp: number;
  input: THREE.Vector3;
  output: THREE.Vector3;
  transformations: TransformationRecord[];
}

/**
 * Filtre pour l'historique
 */
export interface HistoryFilter {
  startTime?: number;
  endTime?: number;
  stages?: string[];
  pluginId?: string;
}

/**
 * Position standard
 */
export interface StandardPosition {
  position: THREE.Vector3;
  face?: StandardFace;
  metadata: {
    original: any;
    transformations: TransformationRecord[];
    source: string;
    depth?: number;
    normal?: THREE.Vector3;
  };
}

/**
 * Face standard unifiée
 */
export enum StandardFace {
  WEB = 'web',
  TOP_FLANGE = 'top_flange',
  BOTTOM_FLANGE = 'bottom_flange',
  TOP = 'top',
  BOTTOM = 'bottom',
  LEFT = 'left',
  RIGHT = 'right',
  FRONT = 'front',
  BACK = 'back'
}

/**
 * Données de position
 */
export interface PositionData {
  x: number;
  y: number;
  z: number;
}

/**
 * Position transformée
 */
export interface TransformedPosition {
  position: THREE.Vector3;
  original: THREE.Vector3;
  transformations: TransformationRecord[];
}

/**
 * Contexte de position
 */
export interface PositionContext {
  profileType: string;
  dimensions: {
    length: number;
    height: number;
    width: number;
    thickness?: number;
  };
  face?: string;
  feature?: any;
}