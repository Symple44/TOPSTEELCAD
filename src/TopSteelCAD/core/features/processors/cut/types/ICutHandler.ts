/**
 * ICutHandler.ts - Interface principale pour les handlers de coupe
 * Définit le contrat que tous les handlers doivent implémenter
 */

import * as THREE from 'three';
import { Feature } from '../../../types';
import { PivotElement } from '@/types/viewer';
import { CutType, ValidationResult, CutMetadata } from './CutTypes';

/**
 * Résultat du traitement d'une coupe
 */
export interface CutProcessResult {
  success: boolean;
  geometry?: THREE.BufferGeometry;
  error?: string;
  metadata?: CutMetadata;
  performanceMetrics?: {
    geometryCreationTime?: number;
    csgOperationTime?: number;
    totalTime?: number;
  };
}

/**
 * Contexte de traitement d'une coupe
 */
export interface CutContext {
  feature: Feature;
  element: PivotElement;
  baseGeometry: THREE.BufferGeometry;
  cutType: CutType;
  options?: {
    validateOnly?: boolean;
    skipCSG?: boolean;
    preserveOriginal?: boolean;
  };
}

/**
 * Interface principale pour un handler de coupe
 */
export interface ICutHandler {
  /**
   * Nom unique du handler
   */
  readonly name: string;
  
  /**
   * Types de coupe supportés par ce handler
   */
  readonly supportedTypes: CutType[];
  
  /**
   * Priorité du handler (plus élevé = plus prioritaire)
   */
  readonly priority: number;
  
  /**
   * Vérifie si ce handler peut traiter un type de coupe spécifique
   * @param type Type de coupe à vérifier
   * @param feature Feature complète pour analyse contextuelle
   */
  canHandle(type: CutType, feature: Feature): boolean;
  
  /**
   * Valide les paramètres de la feature pour ce type de coupe
   * @param feature Feature à valider
   * @param element Élément sur lequel appliquer la coupe
   */
  validate(feature: Feature, element: PivotElement): ValidationResult;
  
  /**
   * Crée la géométrie de coupe
   * @param feature Feature définissant la coupe
   * @param element Élément de référence pour dimensions
   */
  createCutGeometry(feature: Feature, element: PivotElement): THREE.BufferGeometry;
  
  /**
   * Applique la coupe à la géométrie de base via CSG
   * @param baseGeometry Géométrie originale
   * @param cutGeometry Géométrie de coupe
   * @param feature Feature pour contexte
   */
  applyCut(
    baseGeometry: THREE.BufferGeometry, 
    cutGeometry: THREE.BufferGeometry,
    feature: Feature
  ): THREE.BufferGeometry;
  
  /**
   * Traite complètement une coupe (validation + géométrie + CSG)
   * @param context Contexte complet de traitement
   */
  process(context: CutContext): CutProcessResult;
  
  /**
   * Calcule la position de la coupe dans l'espace 3D
   * @param feature Feature définissant la position
   * @param element Élément de référence
   */
  calculatePosition(feature: Feature, element: PivotElement): THREE.Vector3;
  
  /**
   * Calcule la rotation de la coupe
   * @param feature Feature définissant l'orientation
   * @param element Élément de référence
   */
  calculateRotation?(feature: Feature, element: PivotElement): THREE.Euler;
  
  /**
   * Génère les métadonnées de la coupe pour stockage dans userData
   * @param feature Feature source
   * @param element Élément traité
   */
  generateMetadata(feature: Feature, element: PivotElement): CutMetadata;
  
  /**
   * Nettoie les ressources allouées
   */
  dispose?(): void;
}

/**
 * Interface pour un handler avec capacités étendues
 */
export interface IAdvancedCutHandler extends ICutHandler {
  /**
   * Pré-traitement avant création de géométrie
   */
  preProcess?(context: CutContext): CutContext;
  
  /**
   * Post-traitement après application CSG
   */
  postProcess?(
    geometry: THREE.BufferGeometry, 
    context: CutContext
  ): THREE.BufferGeometry;
  
  /**
   * Optimisation de la géométrie résultante
   */
  optimizeGeometry?(geometry: THREE.BufferGeometry): THREE.BufferGeometry;
  
  /**
   * Support pour découpes multiples en une passe
   */
  processBatch?(contexts: CutContext[]): CutProcessResult[];
  
  /**
   * Estimation du coût computationnel
   */
  estimateComplexity?(feature: Feature): number;
}

/**
 * Factory pour créer des handlers
 */
export interface ICutHandlerFactory {
  /**
   * Crée un handler pour un type de coupe donné
   */
  createHandler(type: CutType): ICutHandler | null;
  
  /**
   * Enregistre un nouveau handler
   */
  registerHandler(handler: ICutHandler): void;
  
  /**
   * Obtient tous les handlers disponibles
   */
  getAllHandlers(): ICutHandler[];
  
  /**
   * Trouve le meilleur handler pour une feature
   */
  findBestHandler(feature: Feature): ICutHandler | null;
}