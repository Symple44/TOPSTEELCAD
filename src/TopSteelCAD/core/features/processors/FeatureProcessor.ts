/**
 * FeatureProcessor - Interface et classes de base pour les processeurs de features
 */

import * as THREE from 'three';
import { Feature, IFeatureProcessor, ProcessorResult } from '../types';
import { PivotElement } from '@/types/viewer';

/**
 * Alias pour compatibilité
 */
export type ProcessResult = ProcessorResult;

/**
 * Classe de base abstraite pour les processeurs de features
 */
export abstract class FeatureProcessor implements IFeatureProcessor {
  /**
   * Traite une feature et retourne la géométrie modifiée
   */
  abstract process(
    geometry: THREE.BufferGeometry,
    feature: Feature,
    element: PivotElement
  ): ProcessorResult;

  /**
   * Valide une feature avant le traitement
   */
  abstract validateFeature(feature: Feature, element: PivotElement): string[];

  /**
   * Nettoie les ressources utilisées
   */
  dispose?(): void;

  /**
   * Méthode utilitaire pour créer un résultat d'erreur
   */
  protected createErrorResult(error: string): ProcessorResult {
    return {
      success: false,
      error
    };
  }

  /**
   * Méthode utilitaire pour créer un résultat de succès
   */
  protected createSuccessResult(geometry: THREE.BufferGeometry, warning?: string): ProcessorResult {
    return {
      success: true,
      geometry,
      warning
    };
  }
}