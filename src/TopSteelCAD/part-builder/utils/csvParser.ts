import { PartElement } from '../types/partBuilder.types';
import { ProfileType } from '../../3DLibrary/types/profile.types';
import { generateUniqueId, generateReference } from './idGenerator';

/**
 * Interface pour les colonnes CSV attendues
 */
interface CSVColumns {
  reference?: number;
  designation?: number;
  quantity?: number;
  profileType?: number;
  profileSubType?: number;
  length?: number;
  material?: number;
  notes?: number;
}

/**
 * Valeurs par défaut pour les éléments importés
 */
const DEFAULTS = {
  designation: 'Pièce importée',
  quantity: 1,
  profileType: ProfileType.IPE,
  profileSubType: '200',
  length: 3000,
  material: 'S355',
  status: 'draft' as const,
  notes: ''
};

/**
 * Parse un fichier CSV et retourne des PartElements
 * @param file - Fichier CSV à parser
 * @param currentElementsCount - Nombre d'éléments existants (pour la numérotation)
 * @returns Promise avec tableau de PartElements
 */
export async function parseCSVFile(
  file: File,
  currentElementsCount: number = 0
): Promise<PartElement[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const elements = parseCSVContent(text, currentElementsCount);
        resolve(elements);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'));
    };

    reader.readAsText(file);
  });
}

/**
 * Parse le contenu CSV et retourne des PartElements
 * @param csvContent - Contenu CSV sous forme de string
 * @param currentElementsCount - Nombre d'éléments existants
 * @returns Tableau de PartElements
 */
export function parseCSVContent(
  csvContent: string,
  currentElementsCount: number = 0
): PartElement[] {
  const lines = csvContent.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('Le fichier CSV doit contenir au moins une ligne d\'en-tête et une ligne de données');
  }

  const headers = parseCSVLine(lines[0]);
  const columnMapping = detectColumns(headers);

  const elements: PartElement[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const values = parseCSVLine(line);
      const element = createPartElementFromCSV(
        values,
        columnMapping,
        currentElementsCount + elements.length
      );
      elements.push(element);
    } catch (error) {
      console.warn(`Ligne ${i + 1} ignorée : ${error}`);
      // Continue avec les autres lignes
    }
  }

  if (elements.length === 0) {
    throw new Error('Aucune donnée valide trouvée dans le fichier CSV');
  }

  return elements;
}

/**
 * Parse une ligne CSV en gérant les guillemets et les virgules
 * @param line - Ligne CSV à parser
 * @returns Tableau de valeurs
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Double quote escaping
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Don't forget the last value
  values.push(current.trim());

  return values;
}

/**
 * Détecte automatiquement les colonnes du CSV
 * @param headers - En-têtes du CSV
 * @returns Mapping des colonnes
 */
function detectColumns(headers: string[]): CSVColumns {
  const mapping: CSVColumns = {};

  headers.forEach((header, index) => {
    const h = header.toLowerCase().trim();

    if (h.includes('ref') || h.includes('repere') || h.includes('mark')) {
      mapping.reference = index;
    } else if (h.includes('designation') || h.includes('description') || h.includes('name')) {
      mapping.designation = index;
    } else if (h.includes('quant') || h.includes('qty') || h.includes('nombre')) {
      mapping.quantity = index;
    } else if (h.includes('profil') || h.includes('profile') || h.includes('section')) {
      if (h.includes('type')) {
        mapping.profileType = index;
      } else if (h.includes('sub') || h.includes('size') || h.includes('dimension')) {
        mapping.profileSubType = index;
      } else if (!mapping.profileType) {
        mapping.profileType = index;
      }
    } else if (h.includes('long') || h.includes('length')) {
      mapping.length = index;
    } else if (h.includes('mater') || h.includes('nuance') || h.includes('grade')) {
      mapping.material = index;
    } else if (h.includes('note') || h.includes('comment') || h.includes('remark')) {
      mapping.notes = index;
    }
  });

  return mapping;
}

/**
 * Crée un PartElement à partir d'une ligne CSV
 * @param values - Valeurs de la ligne CSV
 * @param columnMapping - Mapping des colonnes
 * @param index - Index pour la génération de référence
 * @returns PartElement créé
 */
function createPartElementFromCSV(
  values: string[],
  columnMapping: CSVColumns,
  index: number
): PartElement {
  const getValue = (colIndex: number | undefined): string | undefined => {
    return colIndex !== undefined ? values[colIndex] : undefined;
  };

  const reference = getValue(columnMapping.reference) || generateReference(index);
  const designation = getValue(columnMapping.designation) || DEFAULTS.designation;
  const quantity = parseInt(getValue(columnMapping.quantity) || '') || DEFAULTS.quantity;

  // Validation et conversion du type de profilé
  const profileTypeValue = getValue(columnMapping.profileType)?.toUpperCase() || DEFAULTS.profileType;
  const profileType = validateProfileType(profileTypeValue);

  const profileSubType = getValue(columnMapping.profileSubType) || DEFAULTS.profileSubType;
  const length = parseFloat(getValue(columnMapping.length) || '') || DEFAULTS.length;
  const material = getValue(columnMapping.material) || DEFAULTS.material;
  const notes = getValue(columnMapping.notes) || DEFAULTS.notes;

  return {
    id: generateUniqueId('el'),
    reference,
    designation,
    quantity: Math.max(1, quantity), // Au moins 1
    profileType,
    profileSubType,
    length: Math.max(1, length), // Au moins 1mm
    material,
    holes: [],
    status: DEFAULTS.status,
    notes
  };
}

/**
 * Valide et convertit une valeur en ProfileType
 * @param value - Valeur à valider
 * @returns ProfileType valide
 */
function validateProfileType(value: string): ProfileType {
  // Mapping des valeurs communes vers ProfileType
  const mappings: Record<string, ProfileType> = {
    'IPE': ProfileType.IPE,
    'HEA': ProfileType.HEA,
    'HEB': ProfileType.HEB,
    'HEM': ProfileType.HEM,
    'UPN': ProfileType.UPN,
    'UAP': ProfileType.UAP,
    'UPE': ProfileType.UPE,
    'L': ProfileType.L_EQUAL,
    'L_EQUAL': ProfileType.L_EQUAL,
    'L_UNEQUAL': ProfileType.L_UNEQUAL,
    'CORNIERE': ProfileType.L_EQUAL,
    'ANGLE': ProfileType.L_EQUAL,
    'T': ProfileType.T_PROFILE,
    'TEE': ProfileType.TEE,
    'T_PROFILE': ProfileType.T_PROFILE,
    'ROND': ProfileType.ROUND_BAR,
    'ROUND': ProfileType.ROUND_BAR,
    'CARRE': ProfileType.SQUARE_BAR,
    'SQUARE': ProfileType.SQUARE_BAR,
    'PLAT': ProfileType.FLAT,
    'FLAT': ProfileType.FLAT,
    'TOLE': ProfileType.PLATE,
    'PLATE': ProfileType.PLATE,
    'TUBE': ProfileType.TUBE_ROUND,
    'TUBE_ROND': ProfileType.TUBE_ROUND,
    'TUBE_ROUND': ProfileType.TUBE_ROUND,
    'TUBE_CARRE': ProfileType.TUBE_SQUARE,
    'TUBE_SQUARE': ProfileType.TUBE_SQUARE,
    'TUBE_RECT': ProfileType.TUBE_RECT,
    'TUBE_RECTANGULAR': ProfileType.TUBE_RECTANGULAR,
    'RHS': ProfileType.RHS,
    'SHS': ProfileType.SHS,
    'CHS': ProfileType.CHS
  };

  const normalized = value.toUpperCase().replace(/[^A-Z_]/g, '');
  return mappings[normalized] || ProfileType.IPE;
}

/**
 * Exporte des PartElements vers un contenu CSV
 * @param elements - Éléments à exporter
 * @returns Contenu CSV sous forme de string
 */
export function exportToCSV(elements: PartElement[]): string {
  const headers = [
    'Référence',
    'Désignation',
    'Quantité',
    'Type de profil',
    'Sous-type',
    'Longueur (mm)',
    'Matériau',
    'Nombre de trous',
    'Statut',
    'Notes'
  ];

  const rows = elements.map(el => [
    el.reference,
    el.designation,
    el.quantity.toString(),
    el.profileType,
    el.profileSubType,
    el.length.toString(),
    el.material,
    el.holes.length.toString(),
    el.status,
    el.notes || ''
  ]);

  // Échapper les valeurs contenant des virgules ou des guillemets
  const escapeCSVValue = (value: string | undefined): string => {
    if (!value) return '';
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csvLines = [
    headers.map(escapeCSVValue).join(','),
    ...rows.map(row => row.map(escapeCSVValue).join(','))
  ];

  return csvLines.join('\n');
}