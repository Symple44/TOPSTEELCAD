/**
 * Exemples d'utilisation complets pour les profil\u00e9s m\u00e9talliques
 * Architecture Strategy/Factory Pattern avec cache et recherche optimis\u00e9e
 */

import { ProfileType, SteelProfile } from '../types/profile.types';
import { ProfileDatabase } from '../database/ProfileDatabase';
// GeometryGeneratorFactory is not used directly in this file
import { DatabaseGeometryBridge } from '../integration/DatabaseGeometryBridge';

// ========================================
// 1. UTILISATION DE BASE
// ========================================

const basicUsageExample = {
  name: 'Utilisation de base',
  
  // Recherche d'un profil\u00e9 par d\u00e9signation
  findProfile: async () => {
    const db = ProfileDatabase.getInstance();
    
    // Recherche d'un IPE 300
    const ipe300 = await db.findByDesignation('IPE 300');
    
    if (ipe300) {
      console.log('Profil\u00e9 trouv\u00e9:', {
        designation: ipe300.designation,
        dimensions: `${ipe300.dimensions.height}x${ipe300.dimensions.width}`,
        weight: `${ipe300.weight} kg/m`,
        area: ipe300.area ? `${ipe300.area} cm\u00b2` : 'N/A'
      });
    }
    
    return ipe300;
  },

  // Lister tous les profil\u00e9s d'un type
  listByType: async () => {
    const db = ProfileDatabase.getInstance();
    const ipeProfiles = await db.findByType(ProfileType.IPE);
    
    console.log(`Trouv\u00e9 ${ipeProfiles.length} profil\u00e9s IPE`);
    
    // Afficher les 5 premiers
    ipeProfiles.slice(0, 5).forEach(profile => {
      console.log(`- ${profile.designation}: ${profile.weight} kg/m`);
    });
    
    return ipeProfiles;
  }
};

// ========================================
// 2. RECHERCHE AVANC\u00c9E
// ========================================

const advancedSearchExample = {
  name: 'Recherche avanc\u00e9e',
  
  // Recherche avec filtres
  filterProfiles: async () => {
    const db = ProfileDatabase.getInstance();
    
    // Recherche de profil\u00e9s de hauteur entre 200-400mm
    const mediumProfiles = await db.findByFilter({
      types: [ProfileType.IPE, ProfileType.HEA, ProfileType.HEB],
      minHeight: 200,
      maxHeight: 400,
      sortBy: 'weight',
      sortOrder: 'asc',
      limit: 10
    });
    
    console.log(`Profil\u00e9s moyens (200-400mm): ${mediumProfiles.length}`);
    mediumProfiles.forEach(p => {
      const height = p.dimensions.height || 0;
      console.log(`${p.designation}: ${height}mm, ${p.weight}kg/m`);
    });
    
    // Recherche de profil\u00e9s l\u00e9gers pour optimisation
    const lightProfiles = await db.findByFilter({
      minWeight: 10,
      maxWeight: 50,
      sortBy: 'weight'
    });
    
    return { mediumProfiles, lightProfiles };
  }
};

// ========================================
// 3. G\u00c9N\u00c9RATION DE G\u00c9OM\u00c9TRIE 3D
// ========================================

const geometryGenerationExample = {
  name: 'G\u00e9n\u00e9ration de g\u00e9om\u00e9trie 3D',
  
  // G\u00e9n\u00e9rer une g\u00e9om\u00e9trie 3D \u00e0 partir d'un profil\u00e9
  generateGeometry: async () => {
    const bridge = new DatabaseGeometryBridge();
    
    // G\u00e9n\u00e9rer un IPE 300 de 6m
    const ipe300Result = await bridge.generateFromDesignation('IPE 300', 6000);
    
    if (ipe300Result && ipe300Result.geometry) {
      console.log('G\u00e9om\u00e9trie g\u00e9n\u00e9r\u00e9e:', {
        vertices: ipe300Result.metadata?.vertexCount || 'N/A',
        faces: ipe300Result.metadata?.faceCount || 'N/A', 
        weight: `${ipe300Result.metadata?.weight || 0} kg`,
        generationTime: `${ipe300Result.metadata?.generationTime || 0} ms`
      });
      
      return ipe300Result.geometry;
    }
    
    return null;
  },

  // G\u00e9n\u00e9ration en lot
  batchGeneration: async () => {
    const bridge = new DatabaseGeometryBridge();
    const designations = ['IPE 200', 'IPE 300', 'HEA 200', 'HEB 300'];
    
    const results = await Promise.all(
      designations.map(async designation => {
        const result = await bridge.generateFromDesignation(designation, 6000);
        return {
          designation,
          success: !!result?.geometry,
          weight: result?.metadata?.weight || 0
        };
      })
    );
    
    console.log('G\u00e9n\u00e9ration en lot:', results);
    return results;
  }
};

// ========================================
// 4. COMPARAISON DE PROFIL\u00c9S
// ========================================

const profileComparisonExample = {
  name: 'Comparaison de profil\u00e9s',
  
  // Comparer plusieurs profil\u00e9s pour optimisation structurelle
  compareProfiles: async () => {
    const db = ProfileDatabase.getInstance();
    const bridge = new DatabaseGeometryBridge();
    
    const designations = ['IPE 300', 'HEA 300', 'HEB 300'];
    const comparisons = [];
    
    for (const designation of designations) {
      const profile = await db.findByDesignation(designation);
      const result = await bridge.generateFromDesignation(designation, 6000);
      
      if (profile && result) {
        comparisons.push({
          designation: profile.designation,
          height: profile.dimensions.height,
          width: profile.dimensions.width,
          weight: profile.weight,
          totalWeight: result.metadata?.weight || 0,
          momentInertiaY: profile.inertia?.Iyy || 0,
          momentInertiaZ: profile.inertia?.Izz || 0,
          elasticModulusY: (profile as any).elasticity?.Wely || 0,
          elasticModulusZ: (profile as any).elasticity?.Welz || 0
        });
      }
    }
    
    // Trier par rapport poids/inertie (optimisation)
    comparisons.sort((a, b) => {
      const ratioA = a.momentInertiaY / a.weight;
      const ratioB = b.momentInertiaY / b.weight;
      return ratioB - ratioA;
    });
    
    console.log('Comparaison optimis\u00e9e (ratio inertie/poids):');
    comparisons.forEach((comp, index) => {
      const ratio = comp.momentInertiaY / comp.weight;
      console.log(`${index + 1}. ${comp.designation}: ratio=${ratio.toFixed(2)}`);
    });
    
    return comparisons;
  }
};

// ========================================
// 5. INT\u00c9GRATION AVEC REACT/VIEWER
// ========================================

const reactIntegrationExample = {
  name: 'Int\u00e9gration React/Viewer',
  
  // Fonction pour cr\u00e9er un \u00e9l\u00e9ment viewer \u00e0 partir d'un profil\u00e9
  createElementForViewer: async (designation: string, length: number = 6000) => {
    const bridge = new DatabaseGeometryBridge();
    const result = await bridge.generateFromDesignation(designation, length);
    
    if (!result || !result.geometry || !result.profile) {
      throw new Error(`Impossible de g\u00e9n\u00e9rer l'\u00e9l\u00e9ment ${designation}`);
    }
    
    // Format compatible avec le viewer 3D
    return {
      id: `profile_${designation.replace(/\\s+/g, '_')}_${Date.now()}`,
      type: 'profile',
      designation: result.profile.designation,
      geometry: result.geometry,
      material: {
        color: '#3B82F6',
        metalness: 0.9,
        roughness: 0.1
      },
      properties: {
        length,
        weight: result.metadata?.weight || 0,
        volume: result.metadata?.volume || 0,
        surfaceArea: result.metadata?.surfaceArea || 0,
        profileType: result.profile.type,
        dimensions: result.profile.dimensions,
        mechanicalProperties: {
          momentInertiaY: result.profile.inertia?.Iyy,
          momentInertiaZ: result.profile.inertia?.Izz,
          elasticModulusY: (result.profile as any).elasticity?.Wely,
          elasticModulusZ: (result.profile as any).elasticity?.Welz
        }
      },
      metadata: result.metadata
    };
  },

  // Hook React pour s\u00e9lection de profil\u00e9s (pseudocode pour structure)
  useProfileSelector: () => {
    // Cette structure serait utilis\u00e9e dans un composant React
    return {
      selectedType: ProfileType.IPE,
      selectedProfile: null as SteelProfile | null,
      profiles: [] as SteelProfile[],
      loading: false,
      
      // Fonctions qui seraient impl\u00e9ment\u00e9es dans le hook
      setSelectedType: (_type: ProfileType) => { /* impl\u00e9mentation */ },
      setSelectedProfile: (_profile: SteelProfile) => { /* impl\u00e9mentation */ },
      loadProfiles: async (_type: ProfileType) => { /* impl\u00e9mentation */ },
      generateGeometry: async () => { /* impl\u00e9mentation */ }
    };
  }
};

// ========================================
// 6. CALCULS STRUCTURAUX
// ========================================

const structuralCalculationsExample = {
  name: 'Calculs structuraux',
  
  // Calculs de r\u00e9sistance et de d\u00e9formation
  calculateStructuralProperties: async (designation: string, loadKN: number = 100) => {
    const db = ProfileDatabase.getInstance();
    const profile = await db.findByDesignation(designation);
    
    if (!profile || !profile.inertia || !(profile as any).elasticity) {
      throw new Error(`Profil\u00e9 ${designation} introuvable ou propri\u00e9t\u00e9s manquantes`);
    }
    
    // Constantes mat\u00e9riaux (acier S355)
    const fy = 355;   // Limite d'\u00e9lasticit\u00e9 en N/mm\u00b2
    const gammaM0 = 1.0; // Coefficient de s\u00e9curit\u00e9
    
    // Calculs de base
    const calculations = {
      designation: profile.designation,
      appliedLoad: loadKN,
      
      // R\u00e9sistance de calcul
      designResistance: {
        compression: (profile.area! * fy) / (gammaM0 * 1000), // kN
        bendingY: ((profile as any).elasticity.Wely! * fy) / (gammaM0 * 1000), // kNm
        bendingZ: ((profile as any).elasticity.Welz! * fy) / (gammaM0 * 1000)  // kNm
      },
      
      // V\u00e9rifications
      utilizationRatio: {
        compression: (loadKN * gammaM0 * 1000) / (profile.area! * fy),
        // Ajouter d'autres ratios selon besoins
      },
      
      // Propri\u00e9t\u00e9s g\u00e9om\u00e9triques
      geometricProperties: {
        area: profile.area,
        momentInertiaY: profile.inertia.Iyy,
        momentInertiaZ: profile.inertia.Izz,
        radiusOfGyrationY: Math.sqrt(profile.inertia.Iyy! / profile.area!),
        radiusOfGyrationZ: Math.sqrt(profile.inertia.Izz! / profile.area!)
      }
    };
    
    return calculations;
  }
};

// ========================================
// EXPORT PRINCIPAL
// ========================================

export const ProfileUsageExamples = {
  basicUsage: basicUsageExample,
  advancedSearch: advancedSearchExample, 
  geometryGeneration: geometryGenerationExample,
  profileComparison: profileComparisonExample,
  reactIntegration: reactIntegrationExample,
  structuralCalculations: structuralCalculationsExample
};

// Exports individuels pour compatibilit\u00e9
export { basicUsageExample as basicUsage };
export { advancedSearchExample as advancedSearch };
export { geometryGenerationExample as geometryGeneration };
export { profileComparisonExample as profileComparison };
export { reactIntegrationExample as createElementForViewer };
export { structuralCalculationsExample as structuralCalculations };

export default ProfileUsageExamples;