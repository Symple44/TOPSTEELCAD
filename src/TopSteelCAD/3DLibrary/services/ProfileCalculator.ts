/**
 * Service de calculs pour les profilés métalliques
 * Implémente les calculs selon les Eurocodes
 */

import { 
  SteelProfile, 
  ProfileDimensions,
  SteelGrade,
  ProfileResistance,
  ProfileCalculation,
  ProfileType
} from '../types/profile.types';
import { SafetyFactors } from '../types/enums';

export class ProfileCalculator {
  
  /**
   * Calcule le poids d'un profilé pour une longueur donnée
   */
  public static calculateWeight(profile: SteelProfile, length: number): number {
    // length en mm, weight en kg/m
    return profile.weight * (length / 1000);
  }

  /**
   * Calcule le volume d'un profilé
   */
  public static calculateVolume(profile: SteelProfile, length: number): number {
    // area en cm², length en mm -> volume en m³
    return (profile.area * length) / 10000000;
  }

  /**
   * Calcule la surface à peindre
   */
  public static calculatePaintingSurface(profile: SteelProfile, length: number): number {
    const dims = profile.dimensions;
    
    switch (profile.type) {
      case ProfileType.IPE:
      case ProfileType.HEA:
      case ProfileType.HEB:
      case ProfileType.HEM:
        return ProfileCalculator.calculateIBeamSurface(dims, length);
      
      case ProfileType.UPN:
      case ProfileType.UAP:
      case ProfileType.UPE:
        return ProfileCalculator.calculateChannelSurface(dims, length);
      
      case ProfileType.L:
      case ProfileType.LA:
        return ProfileCalculator.calculateAngleSurface(dims, length);
      
      case ProfileType.SHS:
      case ProfileType.SHS:
        return ProfileCalculator.calculateSquareTubeSurface(dims, length);
      
      case ProfileType.RHS:
      case ProfileType.RHS:
        return ProfileCalculator.calculateRectangularTubeSurface(dims, length);
      
      case ProfileType.CHS:
      case ProfileType.CHS:
        return ProfileCalculator.calculateCircularTubeSurface(dims, length);
      
      case ProfileType.FLAT:
        return ProfileCalculator.calculateFlatBarSurface(dims, length);
      
      case ProfileType.ROUND_BAR:
        return ProfileCalculator.calculateRoundBarSurface(dims, length);
      
      default:
        // Approximation par défaut basée sur le périmètre
        return ProfileCalculator.calculateDefaultSurface(profile, length);
    }
  }

  /**
   * Calcule la surface d'un profilé en I
   */
  private static calculateIBeamSurface(dims: ProfileDimensions, length: number): number {
    if (!dims.height || !dims.width) return 0;
    
    // Surface approximative (en m²)
    // 2 semelles + 2 faces de l'âme + bords
    const flangeArea = 2 * dims.width * length / 1000000;
    const webArea = 2 * (dims.height - 2 * (dims.flangeThickness || 0)) * length / 1000000;
    const edgeArea = 4 * (dims.flangeThickness || 0) * length / 1000000;
    
    return flangeArea + webArea + edgeArea;
  }

  /**
   * Calcule la surface d'un profilé en U
   */
  private static calculateChannelSurface(dims: ProfileDimensions, length: number): number {
    if (!dims.height || !dims.width) return 0;
    
    // Surface approximative (en m²)
    const flangeArea = 2 * dims.width * length / 1000000;
    const webArea = dims.height * length / 1000000;
    const innerArea = (dims.height - 2 * (dims.flangeThickness || 0)) * length / 1000000;
    const edgeArea = 2 * (dims.flangeThickness || 0) * length / 1000000;
    
    return flangeArea + webArea + innerArea + edgeArea;
  }

  /**
   * Calcule la surface d'une cornière
   */
  private static calculateAngleSurface(dims: ProfileDimensions, length: number): number {
    const leg1 = dims.leg1Length || dims.width || 0;
    const leg2 = dims.leg2Length || dims.height || 0;
    const thickness = dims.thickness || 0;
    
    // Surface des deux faces externes et internes
    const externalArea = (leg1 + leg2) * length / 1000000;
    const internalArea = (leg1 + leg2 - 2 * thickness) * length / 1000000;
    const edgeArea = 2 * thickness * length / 1000000;
    
    return externalArea + internalArea + edgeArea;
  }

  /**
   * Calcule la surface d'un tube carré
   */
  private static calculateSquareTubeSurface(dims: ProfileDimensions, length: number): number {
    const side = dims.width || dims.height || 0;
    
    // Périmètre externe × longueur
    return 4 * side * length / 1000000;
  }

  /**
   * Calcule la surface d'un tube rectangulaire
   */
  private static calculateRectangularTubeSurface(dims: ProfileDimensions, length: number): number {
    const width = dims.width || 0;
    const height = dims.height || 0;
    
    // Périmètre externe × longueur
    return 2 * (width + height) * length / 1000000;
  }

  /**
   * Calcule la surface d'un tube circulaire
   */
  private static calculateCircularTubeSurface(dims: ProfileDimensions, length: number): number {
    const diameter = dims.diameter || 0;
    
    // Circonférence × longueur
    return Math.PI * diameter * length / 1000000;
  }

  /**
   * Calcule la surface d'un plat
   */
  private static calculateFlatBarSurface(dims: ProfileDimensions, length: number): number {
    const width = dims.width || 0;
    const thickness = dims.thickness || 0;
    
    // 2 faces principales + 2 chants
    return 2 * (width + thickness) * length / 1000000;
  }

  /**
   * Calcule la surface d'une barre ronde
   */
  private static calculateRoundBarSurface(dims: ProfileDimensions, length: number): number {
    const diameter = dims.diameter || dims.width || 0;
    
    // Surface cylindrique
    return Math.PI * diameter * length / 1000000;
  }

  /**
   * Calcule la surface par défaut
   */
  private static calculateDefaultSurface(profile: SteelProfile, length: number): number {
    // Si on a un périmètre, on l'utilise
    if (profile.perimeter) {
      return profile.perimeter * length / 1000000;
    }
    
    // Sinon, approximation basée sur l'aire de la section
    // Surface spécifique approximative : 4√A pour une section quelconque
    const specificSurface = 4 * Math.sqrt(profile.area * 100); // mm/cm²
    return specificSurface * length / 1000000;
  }

  /**
   * Calcule les résistances selon l'Eurocode 3
   */
  public static calculateResistance(profile: SteelProfile, steelGrade: SteelGrade): ProfileResistance {
    const fy = steelGrade.yieldStrength; // MPa
    // const fu = steelGrade.tensileStrength; // MPa - currently unused
    const gammaM0 = SafetyFactors.GAMMA_M0;
    // const gammaM2 = SafetyFactors.GAMMA_M2; // currently unused

    // Résistance en traction (EN 1993-1-1 §6.2.3)
    const tensionResistance = (profile.area * fy * 100) / (gammaM0 * 1000); // kN

    // Résistance en compression (sans flambement) (EN 1993-1-1 §6.2.4)
    const compressionResistance = (profile.area * fy * 100) / (gammaM0 * 1000); // kN

    // Moments résistants élastiques (EN 1993-1-1 §6.2.5)
    const elasticMomentY = profile.elasticModulus 
      ? (profile.elasticModulus.Wely * fy) / (gammaM0 * 1000) 
      : 0; // kNm
    const elasticMomentZ = profile.elasticModulus 
      ? (profile.elasticModulus.Welz * fy) / (gammaM0 * 1000)
      : 0; // kNm

    // Moments résistants plastiques (EN 1993-1-1 §6.2.5)
    const plasticMomentY = profile.plasticModulus 
      ? (profile.plasticModulus.Wply * fy) / (gammaM0 * 1000)
      : 0; // kNm
    const plasticMomentZ = profile.plasticModulus
      ? (profile.plasticModulus.Wplz * fy) / (gammaM0 * 1000)
      : 0; // kNm

    // Efforts tranchants résistants (EN 1993-1-1 §6.2.6)
    // Pour les profilés en I, on utilise l'aire de l'âme
    let avY = profile.area * 100; // mm²
    let avZ = profile.area * 100; // mm²
    
    if (profile.dimensions.height && profile.dimensions.webThickness) {
      // Pour les profilés en I : Av = hw * tw
      avY = profile.dimensions.height * profile.dimensions.webThickness;
    }
    
    if (profile.sectionProperties?.av) {
      avY = profile.sectionProperties.av * 100; // cm² -> mm²
    }
    if (profile.sectionProperties?.az) {
      avZ = profile.sectionProperties.az * 100; // cm² -> mm²
    }

    const shearResistanceY = (avY * fy / Math.sqrt(3)) / (gammaM0 * 1000); // kN
    const shearResistanceZ = (avZ * fy / Math.sqrt(3)) / (gammaM0 * 1000); // kN

    return {
      tensionResistance,
      compressionResistance,
      elasticMomentY,
      elasticMomentZ,
      plasticMomentY,
      plasticMomentZ,
      shearResistanceY,
      shearResistanceZ
    };
  }

  /**
   * Calcule la classe de section selon l'Eurocode 3
   */
  public static calculateSectionClass(profile: SteelProfile, steelGrade: SteelGrade): number {
    const epsilon = Math.sqrt(235 / steelGrade.yieldStrength);
    const dims = profile.dimensions;

    // Pour simplifier, on retourne la classe 1 par défaut
    // Une implémentation complète nécessiterait l'analyse de chaque partie
    
    if (!dims.height || !dims.width) return 3;

    // Classe de l'âme en compression pure
    let webClass = 1;
    if (dims.webThickness) {
      const cw = dims.height - 2 * (dims.flangeThickness || 0);
      const tw = dims.webThickness;
      const webSlenderness = cw / tw;
      
      if (webSlenderness <= 33 * epsilon) webClass = 1;
      else if (webSlenderness <= 38 * epsilon) webClass = 2;
      else if (webSlenderness <= 42 * epsilon) webClass = 3;
      else webClass = 4;
    }

    // Classe de la semelle en compression
    let flangeClass = 1;
    if (dims.flangeThickness && dims.webThickness) {
      const cf = (dims.width - dims.webThickness) / 2;
      const tf = dims.flangeThickness;
      const flangeSlenderness = cf / tf;
      
      if (flangeSlenderness <= 9 * epsilon) flangeClass = 1;
      else if (flangeSlenderness <= 10 * epsilon) flangeClass = 2;
      else if (flangeSlenderness <= 14 * epsilon) flangeClass = 3;
      else flangeClass = 4;
    }

    // La classe de la section est la plus défavorable
    return Math.max(webClass, flangeClass);
  }

  /**
   * Effectue un calcul complet
   */
  public static performFullCalculation(params: {
    profile: SteelProfile;
    length: number;
    steelGrade: SteelGrade;
  }): ProfileCalculation {
    const { profile, length, steelGrade } = params;

    return {
      profile,
      length,
      steelGrade,
      totalWeight: ProfileCalculator.calculateWeight(profile, length),
      paintingSurface: ProfileCalculator.calculatePaintingSurface(profile, length),
      resistance: ProfileCalculator.calculateResistance(profile, steelGrade),
      sectionClass: ProfileCalculator.calculateSectionClass(profile, steelGrade)
    };
  }

  /**
   * Calcule le moment d'inertie polaire
   */
  public static calculatePolarInertia(profile: SteelProfile): number {
    // Ip = Iyy + Izz
    if (!profile.inertia) return 0;
    return profile.inertia.Iyy + profile.inertia.Izz;
  }

  /**
   * Calcule le rayon de giration polaire
   */
  public static calculatePolarRadiusOfGyration(profile: SteelProfile): number {
    const polarInertia = ProfileCalculator.calculatePolarInertia(profile);
    if (polarInertia === 0 || profile.area === 0) return 0;
    return Math.sqrt(polarInertia / profile.area);
  }

  /**
   * Calcule la contrainte normale maximale
   */
  public static calculateMaxNormalStress(
    profile: SteelProfile,
    normalForce: number, // kN
    momentY: number, // kNm
    momentZ: number // kNm
  ): number {
    // σ = N/A + My/Wy + Mz/Wz (MPa)
    const stressN = (normalForce * 1000) / (profile.area * 100); // kN -> N, cm² -> mm²
    
    let stressMy = 0;
    let stressMz = 0;
    
    if (profile.elasticModulus) {
      stressMy = (momentY * 1000000) / (profile.elasticModulus.Wely * 1000); // kNm -> Nmm, cm³ -> mm³
      stressMz = (momentZ * 1000000) / (profile.elasticModulus.Welz * 1000);
    }
    
    return Math.abs(stressN) + Math.abs(stressMy) + Math.abs(stressMz);
  }

  /**
   * Vérifie le taux de travail
   */
  public static calculateUtilizationRatio(
    appliedStress: number,
    steelGrade: SteelGrade
  ): number {
    return appliedStress / steelGrade.yieldStrength;
  }
}