/**
 * Configuration globale de TopSteelCAD
 */

export const TopSteelCADConfig = {
  // Version
  VERSION: '1.0.0',
  BUILD_DATE: '2024-08-08',
  
  // Paramètres par défaut
  defaults: {
    // Unités
    units: 'mm' as 'mm' | 'inch',
    coordinateSystem: 'right' as 'right' | 'left',
    
    // Matériaux par défaut
    defaultMaterial: 'S355',
    defaultDensity: 7850, // kg/m³
    
    // Tolérances
    tolerances: {
      position: 0.01, // mm
      angle: 0.001, // radians
      hole: 0.1, // mm
      cut: 0.5, // mm
    },
    
    // Viewer
    viewer: {
      backgroundColor: '#1a1a1a',
      gridSize: 10000,
      gridDivisions: 100,
      ambientLight: 0.6,
      directionalLight: 1.0,
      enableShadows: true,
      antialiasing: true,
      maxRenderDistance: 50000,
    },
    
    // Performance
    performance: {
      maxElements: 10000,
      instancedRenderingThreshold: 100,
      lodEnabled: true,
      cacheEnabled: true,
      workerPoolSize: 4,
    }
  },
  
  // Extensions de fichiers supportées
  supportedFormats: {
    import: [
      'nc', 'nc1', 'dstv', // DSTV/NC
      'dwg', 'dxf',        // AutoCAD
      'ifc',               // BIM
      'step', 'stp',       // STEP
      'iges', 'igs',       // IGES
      'stl',               // STL
      'obj',               // OBJ
    ],
    export: [
      'dxf',               // DXF 2D/3D
      'dwg',               // DWG
      'json',              // JSON
      'csv',               // CSV (listes)
      'pdf',               // PDF (rapports)
    ]
  },
  
  // Normes supportées
  standards: {
    profiles: [
      'EN 10025',  // Européen
      'ASTM A992', // Américain
      'DIN',       // Allemand
      'BS',        // Britannique
      'JIS',       // Japonais
    ],
    bolts: [
      'ISO 4014',  // Vis à tête hexagonale
      'ISO 4017',  // Vis sans tête
      'DIN 931',   // Vis partiellement filetée
      'DIN 933',   // Vis entièrement filetée
    ],
    welds: [
      'ISO 2553',  // Symboles de soudure
      'AWS A2.4',  // Symboles américains
    ]
  },
  
  // Profils métalliques
  profiles: {
    categories: [
      'IPE', 'HEA', 'HEB', 'HEM',  // Poutres en I
      'UPN', 'UAP', 'UPE',          // Profils en U
      'L', 'LD',                    // Cornières
      'T',                          // Profils en T
      'RHS', 'SHS', 'CHS',          // Tubes
      'FLAT', 'ROUND', 'SQUARE',   // Barres
    ]
  },
  
  // Messages et traductions
  i18n: {
    defaultLocale: 'fr',
    supportedLocales: ['fr', 'en', 'de', 'es'],
  },
  
  // API endpoints (si backend)
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    endpoints: {
      profiles: '/profiles',
      materials: '/materials',
      projects: '/projects',
      convert: '/convert',
      export: '/export',
    }
  },
  
  // Chemins des ressources
  paths: {
    assets: '/assets',
    textures: '/assets/textures',
    models: '/assets/models',
    icons: '/assets/icons',
  }
};

// Types pour la configuration
export type Units = 'mm' | 'inch';
export type CoordinateSystem = 'right' | 'left';
export type MaterialGrade = 'S235' | 'S275' | 'S355' | 'S420' | 'S460';
export type ProfileStandard = 'EN' | 'ASTM' | 'DIN' | 'BS' | 'JIS';

// Export par défaut
export default TopSteelCADConfig;