/**
 * Service de mapping des profils métalliques vers définitions IFC
 * Building Estimator - TopSteelCAD
 */

import { IFCProfileType } from '../types/ifc.types';

/**
 * Dimensions d'un profil en I
 */
export interface IShapeDimensions {
  overallWidth: number;        // Largeur totale (semelles)
  overallDepth: number;        // Hauteur totale
  webThickness: number;        // Épaisseur de l'âme
  flangeThickness: number;     // Épaisseur des semelles
  filletRadius?: number;       // Rayon de congé (optionnel)
}

/**
 * Dimensions d'un profil en U
 */
export interface UShapeDimensions {
  depth: number;               // Hauteur totale
  flangeWidth: number;         // Largeur des semelles
  webThickness: number;        // Épaisseur de l'âme
  flangeThickness: number;     // Épaisseur des semelles
  filletRadius?: number;       // Rayon de congé
}

/**
 * Dimensions d'un profil en L
 */
export interface LShapeDimensions {
  depth: number;               // Hauteur
  width: number;               // Largeur (peut être différente si inégal)
  thickness: number;           // Épaisseur
  filletRadius?: number;       // Rayon de congé
}

/**
 * Dimensions d'une section rectangulaire creuse
 */
export interface RectangleHollowDimensions {
  width: number;               // Largeur extérieure
  height: number;              // Hauteur extérieure
  wallThickness: number;       // Épaisseur de paroi
  innerFilletRadius?: number;  // Rayon de congé intérieur
  outerFilletRadius?: number;  // Rayon de congé extérieur
}

/**
 * Dimensions d'une section circulaire creuse
 */
export interface CircleHollowDimensions {
  diameter: number;            // Diamètre extérieur
  wallThickness: number;       // Épaisseur de paroi
}

/**
 * Type de profil détecté
 */
export type ProfileDimensions =
  | { type: 'I_SHAPE'; dimensions: IShapeDimensions }
  | { type: 'U_SHAPE'; dimensions: UShapeDimensions }
  | { type: 'L_SHAPE'; dimensions: LShapeDimensions }
  | { type: 'RECTANGLE_HOLLOW'; dimensions: RectangleHollowDimensions }
  | { type: 'CIRCLE_HOLLOW'; dimensions: CircleHollowDimensions }
  | { type: 'UNKNOWN'; dimensions: { width: number; height: number } };

/**
 * Service de mapping des profils
 */
export class ProfileIFCMapper {
  /**
   * Base de données complète des profils
   * Format: [hauteur, largeur, épaisseur âme, épaisseur semelle, rayon de congé]
   */
  private static readonly PROFILE_DATABASE: Record<string, [number, number, number, number, number?]> = {
    // IPE (European I-beams)
    'IPE 80': [80, 46, 3.8, 5.2, 5],
    'IPE 100': [100, 55, 4.1, 5.7, 7],
    'IPE 120': [120, 64, 4.4, 6.3, 7],
    'IPE 140': [140, 73, 4.7, 6.9, 7],
    'IPE 160': [160, 82, 5.0, 7.4, 9],
    'IPE 180': [180, 91, 5.3, 8.0, 9],
    'IPE 200': [200, 100, 5.6, 8.5, 12],
    'IPE 220': [220, 110, 5.9, 9.2, 12],
    'IPE 240': [240, 120, 6.2, 9.8, 15],
    'IPE 270': [270, 135, 6.6, 10.2, 15],
    'IPE 300': [300, 150, 7.1, 10.7, 15],
    'IPE 330': [330, 160, 7.5, 11.5, 18],
    'IPE 360': [360, 170, 8.0, 12.7, 18],
    'IPE 400': [400, 180, 8.6, 13.5, 21],
    'IPE 450': [450, 190, 9.4, 14.6, 21],
    'IPE 500': [500, 200, 10.2, 16.0, 21],
    'IPE 550': [550, 210, 11.1, 17.2, 24],
    'IPE 600': [600, 220, 12.0, 19.0, 24],

    // HEA (European wide flange - light)
    'HEA 100': [96, 100, 5.0, 8.0, 12],
    'HEA 120': [114, 120, 5.0, 8.0, 12],
    'HEA 140': [133, 140, 5.5, 8.5, 12],
    'HEA 160': [152, 160, 6.0, 9.0, 15],
    'HEA 180': [171, 180, 6.0, 9.5, 15],
    'HEA 200': [190, 200, 6.5, 10.0, 18],
    'HEA 220': [210, 220, 7.0, 11.0, 18],
    'HEA 240': [230, 240, 7.5, 12.0, 21],
    'HEA 260': [250, 260, 7.5, 12.5, 24],
    'HEA 280': [270, 280, 8.0, 13.0, 24],
    'HEA 300': [290, 300, 8.5, 14.0, 27],
    'HEA 320': [310, 300, 9.0, 15.5, 27],
    'HEA 340': [330, 300, 9.5, 16.5, 27],
    'HEA 360': [350, 300, 10.0, 17.5, 27],
    'HEA 400': [390, 300, 11.0, 19.0, 27],
    'HEA 450': [440, 300, 11.5, 21.0, 27],
    'HEA 500': [490, 300, 12.0, 23.0, 27],

    // HEB (European wide flange - medium)
    'HEB 100': [100, 100, 6.0, 10.0, 12],
    'HEB 120': [120, 120, 6.5, 11.0, 12],
    'HEB 140': [140, 140, 7.0, 12.0, 12],
    'HEB 160': [160, 160, 8.0, 13.0, 15],
    'HEB 180': [180, 180, 8.5, 14.0, 15],
    'HEB 200': [200, 200, 9.0, 15.0, 18],
    'HEB 220': [220, 220, 9.5, 16.0, 18],
    'HEB 240': [240, 240, 10.0, 17.0, 21],
    'HEB 260': [260, 260, 10.0, 17.5, 24],
    'HEB 280': [280, 280, 10.5, 18.0, 24],
    'HEB 300': [300, 300, 11.0, 19.0, 27],
    'HEB 320': [320, 300, 11.5, 20.5, 27],
    'HEB 340': [340, 300, 12.0, 21.5, 27],
    'HEB 360': [360, 300, 12.5, 22.5, 27],
    'HEB 400': [400, 300, 13.5, 24.0, 27],
    'HEB 450': [450, 300, 14.0, 26.0, 27],
    'HEB 500': [500, 300, 14.5, 28.0, 27],

    // HEM (European wide flange - heavy)
    'HEM 100': [120, 106, 12.0, 20.0, 12],
    'HEM 120': [140, 126, 12.5, 21.0, 12],
    'HEM 140': [160, 146, 13.0, 22.0, 12],
    'HEM 160': [180, 166, 14.0, 23.0, 15],
    'HEM 180': [200, 186, 14.5, 24.0, 15],
    'HEM 200': [220, 206, 15.0, 25.0, 18],
    'HEM 220': [240, 226, 15.5, 26.0, 18],
    'HEM 240': [270, 248, 18.0, 32.0, 21],
    'HEM 260': [290, 268, 18.0, 32.5, 24],
    'HEM 280': [310, 288, 18.5, 33.0, 24],
    'HEM 300': [340, 310, 21.0, 39.0, 27],

    // UPN (European U-channels)
    'UPN 80': [80, 45, 6.0, 8.0, 8],
    'UPN 100': [100, 50, 6.0, 8.5, 8.5],
    'UPN 120': [120, 55, 7.0, 9.0, 9],
    'UPN 140': [140, 60, 7.0, 10.0, 10],
    'UPN 160': [160, 65, 7.5, 10.5, 10.5],
    'UPN 180': [180, 70, 8.0, 11.0, 11],
    'UPN 200': [200, 75, 8.5, 11.5, 11.5],
    'UPN 220': [220, 80, 9.0, 12.5, 12.5],
    'UPN 240': [240, 85, 9.5, 13.0, 13],
    'UPN 260': [260, 90, 10.0, 14.0, 14],
    'UPN 280': [280, 95, 10.0, 15.0, 15],
    'UPN 300': [300, 100, 10.0, 16.0, 16],

    // UAP (European U-channels - parallel flanges)
    'UAP 65': [65, 42, 5.5, 7.5, 7],
    'UAP 80': [80, 50, 6.0, 8.0, 8],
    'UAP 100': [100, 55, 6.0, 8.5, 8.5],
    'UAP 120': [120, 60, 7.0, 9.0, 9],
    'UAP 130': [130, 65, 7.0, 9.5, 9.5],
    'UAP 150': [150, 75, 7.0, 10.0, 10],
    'UAP 175': [175, 85, 8.0, 11.0, 11],
    'UAP 200': [200, 90, 8.5, 11.5, 11.5],
    'UAP 220': [220, 100, 9.0, 12.5, 12.5],
    'UAP 250': [250, 110, 10.0, 14.0, 14],
    'UAP 300': [300, 125, 11.0, 15.0, 15],

    // UPE (European U-channels - wide)
    'UPE 80': [80, 50, 4.0, 7.0, 7],
    'UPE 100': [100, 55, 4.5, 7.5, 7.5],
    'UPE 120': [120, 60, 5.0, 8.0, 8],
    'UPE 140': [140, 65, 5.0, 8.5, 8.5],
    'UPE 160': [160, 70, 5.5, 9.0, 9],
    'UPE 180': [180, 75, 5.5, 9.5, 9.5],
    'UPE 200': [200, 80, 6.0, 10.0, 10],
    'UPE 220': [220, 85, 6.5, 11.0, 11],
    'UPE 240': [240, 90, 7.0, 11.5, 11.5],
    'UPE 270': [270, 95, 7.5, 12.5, 12.5],
    'UPE 300': [300, 100, 9.5, 13.5, 13.5],
    'UPE 330': [330, 105, 11.0, 14.0, 14],
    'UPE 360': [360, 110, 12.0, 14.0, 14],
    'UPE 400': [400, 115, 13.5, 14.0, 14]
  };

  /**
   * Retourne les dimensions IFC pour un profil donné
   */
  static getProfileDimensions(profileName: string): ProfileDimensions {
    // Nettoyer le nom du profil
    const cleanName = profileName.trim().toUpperCase();

    // Chercher dans la base de données
    const data = this.PROFILE_DATABASE[cleanName];

    if (data) {
      const [height, width, webThickness, flangeThickness, filletRadius] = data;

      // Déterminer le type de profil
      if (cleanName.startsWith('IPE') || cleanName.startsWith('HE')) {
        return {
          type: 'I_SHAPE',
          dimensions: {
            overallDepth: height,
            overallWidth: width,
            webThickness,
            flangeThickness,
            filletRadius
          }
        };
      } else if (
        cleanName.startsWith('UPN') ||
        cleanName.startsWith('UAP') ||
        cleanName.startsWith('UPE')
      ) {
        return {
          type: 'U_SHAPE',
          dimensions: {
            depth: height,
            flangeWidth: width,
            webThickness,
            flangeThickness,
            filletRadius
          }
        };
      }
    }

    // Détection par pattern pour profils L
    const lMatch = cleanName.match(/^L\s*(\d+)\s*[Xx]\s*(\d+)\s*[Xx]\s*(\d+)/);
    if (lMatch) {
      return {
        type: 'L_SHAPE',
        dimensions: {
          depth: parseInt(lMatch[1]),
          width: parseInt(lMatch[2]),
          thickness: parseInt(lMatch[3])
        }
      };
    }

    // Détection pour sections rectangulaires creuses
    const rhsMatch = cleanName.match(/^RHS\s*(\d+)\s*[Xx]\s*(\d+)\s*[Xx]\s*(\d+)/);
    if (rhsMatch) {
      return {
        type: 'RECTANGLE_HOLLOW',
        dimensions: {
          height: parseInt(rhsMatch[1]),
          width: parseInt(rhsMatch[2]),
          wallThickness: parseInt(rhsMatch[3])
        }
      };
    }

    // Détection pour sections carrées creuses
    const shsMatch = cleanName.match(/^SHS\s*(\d+)\s*[Xx]\s*(\d+)/);
    if (shsMatch) {
      const size = parseInt(shsMatch[1]);
      const thickness = parseInt(shsMatch[2]);
      return {
        type: 'RECTANGLE_HOLLOW',
        dimensions: {
          height: size,
          width: size,
          wallThickness: thickness
        }
      };
    }

    // Détection pour sections circulaires creuses
    const chsMatch = cleanName.match(/^CHS\s*(\d+)\s*[Xx]\s*(\d+)/);
    if (chsMatch) {
      return {
        type: 'CIRCLE_HOLLOW',
        dimensions: {
          diameter: parseInt(chsMatch[1]),
          wallThickness: parseInt(chsMatch[2])
        }
      };
    }

    // Par défaut : rectangle approximatif
    console.warn(`Profil inconnu: ${profileName}. Utilisation d'approximation rectangulaire.`);
    return {
      type: 'UNKNOWN',
      dimensions: {
        width: 200,
        height: 200
      }
    };
  }

  /**
   * Retourne le type IFC pour un profil
   */
  static getIFCProfileType(profileName: string): IFCProfileType {
    const profileData = this.getProfileDimensions(profileName);

    switch (profileData.type) {
      case 'I_SHAPE':
        return IFCProfileType.I_SHAPE;
      case 'U_SHAPE':
        return IFCProfileType.U_SHAPE;
      case 'L_SHAPE':
        return IFCProfileType.L_SHAPE;
      case 'RECTANGLE_HOLLOW':
        return IFCProfileType.RECTANGULAR;
      case 'CIRCLE_HOLLOW':
        return IFCProfileType.CIRCULAR;
      default:
        return IFCProfileType.RECTANGULAR;
    }
  }

  /**
   * Vérifie si un profil est supporté
   */
  static isProfileSupported(profileName: string): boolean {
    const cleanName = profileName.trim().toUpperCase();
    return cleanName in this.PROFILE_DATABASE;
  }

  /**
   * Retourne la liste de tous les profils supportés
   */
  static getSupportedProfiles(): string[] {
    return Object.keys(this.PROFILE_DATABASE);
  }

  /**
   * Retourne les profils par type
   */
  static getProfilesByType(type: 'IPE' | 'HEA' | 'HEB' | 'HEM' | 'UPN' | 'UAP' | 'UPE'): string[] {
    return Object.keys(this.PROFILE_DATABASE).filter((name) => name.startsWith(type));
  }
}
