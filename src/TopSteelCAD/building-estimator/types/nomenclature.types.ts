/**
 * Types pour la nomenclature et le chiffrage
 * Building Estimator - TopSteelCAD
 */

/**
 * Unité de mesure
 */
export enum Unit {
  PIECES = 'pcs',      // Pièces
  METER = 'm',         // Mètres linéaires
  SQUARE_METER = 'm²', // Mètres carrés
  KILOGRAM = 'kg',     // Kilogrammes
  LITER = 'L',         // Litres
  HOUR = 'h'           // Heures
}

/**
 * Catégorie de nomenclature
 */
export enum NomenclatureCategory {
  MAIN_FRAME = 'main_frame',           // Ossature principale
  SECONDARY_FRAME = 'secondary_frame', // Ossature secondaire
  CLADDING = 'cladding',               // Bardage
  ROOFING = 'roofing',                 // Couverture
  OPENINGS = 'openings',               // Ouvertures
  ACCESSORIES = 'accessories',         // Accessoires
  FOUNDATIONS = 'foundations'          // Fondations (Future)
}

/**
 * Élément de nomenclature
 */
export interface NomenclatureItem {
  ref: string;              // Référence (ex: 'POT-01')
  designation: string;      // Désignation (ex: 'Poteau IPE 240')
  profile?: string;         // Profil (ex: 'IPE 240')
  quantity: number;         // Quantité
  unit: Unit;              // Unité

  // Longueurs
  unitLength?: number;      // Longueur unitaire (mm)
  totalLength?: number;     // Longueur totale (mm)

  // Poids
  unitWeight?: number;      // Poids unitaire (kg)
  totalWeight?: number;     // Poids total (kg)

  // Prix (optionnel pour MVP)
  unitPrice?: number;       // Prix unitaire (€)
  totalPrice?: number;      // Prix total (€)

  // Métadonnées
  category?: string;        // Sous-catégorie
  notes?: string;           // Notes
}

/**
 * Section de nomenclature
 */
export interface NomenclatureSection {
  title: string;
  category: NomenclatureCategory;
  items: NomenclatureItem[];

  // Sous-totaux de la section
  subtotals?: {
    totalWeight?: number;
    totalLength?: number;
    totalArea?: number;
    totalPrice?: number;
  };
}

/**
 * Totaux généraux
 */
export interface NomenclatureTotals {
  // Poids
  totalSteelWeight: number;           // Poids total acier (kg)
  mainFrameWeight: number;            // Poids ossature principale (kg)
  secondaryFrameWeight: number;       // Poids ossature secondaire (kg)

  // Surfaces
  totalCladdingArea: number;          // Surface bardage totale (m²)
  netCladdingArea: number;            // Surface bardage nette (m²)
  totalRoofingArea: number;           // Surface couverture totale (m²)
  netRoofingArea: number;             // Surface couverture nette (m²)

  // Ouvertures
  totalOpeningArea: number;           // Surface totale ouvertures (m²)
  doorCount: number;                  // Nombre de portes
  windowCount: number;                // Nombre de fenêtres

  // Prix (optionnel)
  totalPrice?: number;                // Prix total (€)
  pricePerSqm?: number;               // Prix au m² (€/m²)
}

/**
 * Nomenclature complète du bâtiment
 */
export interface Nomenclature {
  // Identification
  buildingId: string;
  buildingName: string;
  generatedAt: Date;
  version: string;

  // Sections
  sections: {
    mainFrame: NomenclatureSection;
    secondaryFrame: NomenclatureSection;
    cladding: NomenclatureSection;
    roofing: NomenclatureSection;
    openings: NomenclatureSection;
    accessories?: NomenclatureSection;
  };

  // Totaux
  totals: NomenclatureTotals;

  // Métadonnées
  metadata?: {
    project?: string;
    author?: string;
    client?: string;
    notes?: string;
  };
}

/**
 * Options pour la génération de nomenclature
 */
export interface NomenclatureOptions {
  // Inclusions
  includeWeights?: boolean;
  includeLengths?: boolean;
  includePrices?: boolean;
  includeNotes?: boolean;

  // Groupement
  groupByProfile?: boolean;
  groupByCategory?: boolean;

  // Tri
  sortBy?: 'ref' | 'designation' | 'weight' | 'quantity';
  sortOrder?: 'asc' | 'desc';

  // Filtres
  excludeEmptySections?: boolean;
  minQuantity?: number;
}

/**
 * Format d'export de nomenclature
 */
export enum NomenclatureExportFormat {
  EXCEL = 'excel',
  CSV = 'csv',
  PDF = 'pdf',
  JSON = 'json',
  HTML = 'html'
}

/**
 * Résultat d'export de nomenclature
 */
export interface NomenclatureExportResult {
  success: boolean;
  format: NomenclatureExportFormat;
  fileName: string;
  filePath?: string;
  fileSize?: number;
  data?: Blob | string;
  error?: string;
}

/**
 * Statistiques de nomenclature
 */
export interface NomenclatureStatistics {
  totalItems: number;
  totalSections: number;

  // Par catégorie
  itemsByCategory: Record<NomenclatureCategory, number>;
  weightByCategory: Record<NomenclatureCategory, number>;

  // Indicateurs
  steelWeightPerSqm: number;    // kg/m² de plancher
  claddingPercentage: number;   // % de la surface totale
  roofingPercentage: number;    // % de la surface totale
}
