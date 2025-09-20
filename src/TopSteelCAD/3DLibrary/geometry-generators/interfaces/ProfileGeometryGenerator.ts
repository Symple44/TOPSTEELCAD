/**
 * Interface commune pour tous les générateurs de géométries de profils
 * Pattern Strategy pour une architecture propre et évolutive
 */

import { BufferGeometry } from '../../../lib/three-exports';
import { ProfileType } from '../../types/profile.types';
import type { ProfileDimensions } from '../../types/profile.types';

/**
 * Interface que tous les générateurs doivent implémenter
 */
export interface ProfileGeometryGenerator {
  /**
   * Détermine si ce générateur peut créer la géométrie pour ce type de profil
   */
  canGenerate(profileType: ProfileType): boolean;

  /**
   * Génère la géométrie 3D à partir des dimensions du profil
   */
  generate(dimensions: ProfileDimensions, length: number): BufferGeometry;

  /**
   * Retourne les types de profils supportés par ce générateur
   */
  getSupportedTypes(): ProfileType[];

  /**
   * Nom du générateur pour le debugging
   */
  getName(): string;
}

/**
 * Résultat d'une génération de géométrie
 */
export interface GeometryGenerationOptions {
  /** Longueur du profil en mm */
  length: number;
  
  /** Centrer la géométrie sur l'origine */
  centered?: boolean;
  
  /** Rotation initiale en radians */
  rotation?: {
    x?: number;
    y?: number;
    z?: number;
  };
  
  /** Position initiale */
  position?: {
    x?: number;
    y?: number;
    z?: number;
  };
}

/**
 * Classe de base abstraite pour simplifier l'implémentation
 */
export abstract class BaseProfileGenerator implements ProfileGeometryGenerator {
  protected supportedTypes: ProfileType[] = [];

  constructor(supportedTypes: ProfileType[]) {
    this.supportedTypes = supportedTypes;
  }

  canGenerate(profileType: ProfileType): boolean {
    return this.supportedTypes.includes(profileType);
  }

  getSupportedTypes(): ProfileType[] {
    return [...this.supportedTypes];
  }

  abstract generate(dimensions: ProfileDimensions, length: number): BufferGeometry;
  abstract getName(): string;

  /**
   * Méthode utilitaire pour centrer une géométrie
   * MODIFICATION: Ne centre plus en Z - la géométrie commence à Z=0
   */
  protected centerGeometry(geometry: BufferGeometry, _length: number): void {
    // NE PLUS CENTRER EN Z - La géométrie commence à Z=0 et va jusqu'à Z=length
    // geometry.translate(0, 0, -length / 2); // DÉSACTIVÉ
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }
}