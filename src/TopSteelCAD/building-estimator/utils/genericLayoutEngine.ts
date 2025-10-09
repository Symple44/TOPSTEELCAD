/**
 * Moteur de calepinage automatique générique
 * Building Estimator - TopSteelCAD
 *
 * Système intelligent et modulable pour calculer la disposition optimale
 * d'éléments rectangulaires (panneaux solaires, bardage, couverture, etc.)
 * sur une surface donnée avec contraintes de marges et espacements.
 */

/**
 * Élément à placer (panneau solaire, bardage, couverture, etc.)
 */
export interface LayoutElement {
  width: number;           // Largeur de l'élément (mm)
  height: number;          // Hauteur de l'élément (mm)
  weight?: number;         // Poids optionnel (kg)
  reference?: string;      // Référence produit
}

/**
 * Contraintes de disposition
 */
export interface LayoutConstraints {
  // Espacements minimaux et recommandés
  minRowSpacing: number;           // Espacement minimal entre rangées (mm)
  minColumnSpacing: number;        // Espacement minimal entre colonnes (mm)
  recommendedRowSpacing?: number;  // Espacement recommandé entre rangées (mm)
  recommendedColumnSpacing?: number; // Espacement recommandé entre colonnes (mm)

  // Marges de bord
  edgeMarginLongitudinal: number;  // Marge avant/arrière (mm)
  edgeMarginTransverse: number;    // Marge gauche/droite (mm)

  // Marges personnalisées optionnelles
  customMarginFront?: number;
  customMarginBack?: number;
  customMarginLeft?: number;
  customMarginRight?: number;

  // Contraintes d'orientation
  allowLandscape?: boolean;        // Autoriser orientation paysage (défaut: true)
  allowPortrait?: boolean;         // Autoriser orientation portrait (défaut: true)

  // Contraintes de poids (optionnel)
  maxTotalWeight?: number;         // Poids max total (kg)
}

/**
 * Options de calcul du calepinage
 */
export interface LayoutOptions {
  orientation?: 'landscape' | 'portrait' | 'auto'; // Orientation forcée ou automatique
  optimizeFor?: 'quantity' | 'coverage' | 'balanced'; // Critère d'optimisation
  useRecommendedSpacing?: boolean; // Utiliser espacements recommandés vs minimaux
  customRowSpacing?: number;       // Espacement personnalisé entre rangées
  customColumnSpacing?: number;    // Espacement personnalisé entre colonnes
  alignmentMode?: 'start' | 'center' | 'end'; // Mode d'alignement (défaut: center)
  distributeSpacing?: boolean;     // Répartir uniformément l'espace restant (défaut: false)
}

/**
 * Résultat du calepinage
 */
export interface LayoutResult {
  // Configuration retenue
  orientation: 'landscape' | 'portrait';
  rows: number;                    // Nombre de rangées
  columns: number;                 // Nombre de colonnes
  totalElements: number;           // Nombre total d'éléments

  // Espacements utilisés
  rowSpacing: number;              // Espacement entre rangées (mm)
  columnSpacing: number;           // Espacement entre colonnes (mm)

  // Dimensions utilisées
  usedLength: number;              // Longueur utilisée (mm)
  usedWidth: number;               // Largeur utilisée (mm)

  // Marges résultantes
  marginFront: number;             // Marge avant (mm)
  marginBack: number;              // Marge arrière (mm)
  marginLeft: number;              // Marge gauche (mm)
  marginRight: number;             // Marge droite (mm)

  // Métriques
  coverageRatio: number;           // Taux de couverture (%)
  totalWeight?: number;            // Poids total si disponible (kg)

  // Informations sur chaque élément
  elementPositions?: ElementPosition[];

  // Score d'optimisation
  score: number;
}

/**
 * Position d'un élément individuel
 */
export interface ElementPosition {
  row: number;                     // Numéro de rangée (0-indexed)
  column: number;                  // Numéro de colonne (0-indexed)
  x: number;                       // Position X du centre (mm)
  z: number;                       // Position Z du centre (mm)
  width: number;                   // Largeur de l'élément (mm)
  height: number;                  // Hauteur de l'élément (mm)
}

/**
 * Calcule le calepinage optimal pour une surface donnée
 *
 * @param availableLength - Longueur disponible (direction X, en mm)
 * @param availableWidth - Largeur disponible (direction Z, en mm)
 * @param element - Élément à disposer
 * @param constraints - Contraintes de disposition
 * @param options - Options de calcul
 * @returns Résultat du calepinage optimal
 */
export function calculateOptimalLayout(
  availableLength: number,
  availableWidth: number,
  element: LayoutElement,
  constraints: LayoutConstraints,
  options: LayoutOptions = {}
): LayoutResult {
  const {
    orientation = 'auto',
    optimizeFor = 'quantity',
    useRecommendedSpacing = true,
    customRowSpacing,
    customColumnSpacing,
    alignmentMode = 'center',
    distributeSpacing = false
  } = options;

  // Déterminer les marges à utiliser
  const marginFront = constraints.customMarginFront ?? constraints.edgeMarginLongitudinal;
  const marginBack = constraints.customMarginBack ?? constraints.edgeMarginLongitudinal;
  const marginLeft = constraints.customMarginLeft ?? constraints.edgeMarginTransverse;
  const marginRight = constraints.customMarginRight ?? constraints.edgeMarginTransverse;

  // Déterminer les espacements à utiliser
  const rowSpacing = customRowSpacing ?? (
    useRecommendedSpacing && constraints.recommendedRowSpacing
      ? constraints.recommendedRowSpacing
      : constraints.minRowSpacing
  );
  const columnSpacing = customColumnSpacing ?? (
    useRecommendedSpacing && constraints.recommendedColumnSpacing
      ? constraints.recommendedColumnSpacing
      : constraints.minColumnSpacing
  );

  // Surface disponible après marges
  const usableLength = availableLength - marginFront - marginBack;
  const usableWidth = availableWidth - marginLeft - marginRight;

  // Déterminer les orientations à tester
  const orientationsToTry: ('landscape' | 'portrait')[] = [];

  if (orientation === 'auto') {
    if (constraints.allowLandscape !== false) orientationsToTry.push('landscape');
    if (constraints.allowPortrait !== false) orientationsToTry.push('portrait');
  } else {
    orientationsToTry.push(orientation);
  }

  let bestLayout: LayoutResult | null = null;
  let bestScore = -1;

  // Essayer chaque orientation
  for (const orient of orientationsToTry) {
    // Dimensions de l'élément selon l'orientation
    const elementLength = orient === 'landscape' ? element.width : element.height;
    const elementWidth = orient === 'landscape' ? element.height : element.width;

    // Calculer le nombre d'éléments dans chaque direction
    // Direction longitudinale (le long de X, longueur du bâtiment)
    const columnsMax = Math.floor(
      (usableLength + columnSpacing) / (elementLength + columnSpacing)
    );

    // Direction transversale (le long de Z, largeur du bâtiment)
    const rowsMax = Math.floor(
      (usableWidth + rowSpacing) / (elementWidth + rowSpacing)
    );

    if (columnsMax <= 0 || rowsMax <= 0) continue;

    const totalElements = columnsMax * rowsMax;

    // Vérifier contrainte de poids
    if (constraints.maxTotalWeight && element.weight) {
      const totalWeight = totalElements * element.weight;
      if (totalWeight > constraints.maxTotalWeight) {
        continue; // Configuration dépasse le poids max
      }
    }

    // Dimensions réellement utilisées par les éléments
    const usedLength = columnsMax * elementLength + (columnsMax - 1) * columnSpacing;
    const usedWidth = rowsMax * elementWidth + (rowsMax - 1) * rowSpacing;

    // Calculer les marges finales
    const remainingLength = usableLength - usedLength;
    const remainingWidth = usableWidth - usedWidth;

    let finalMarginFront: number;
    let finalMarginBack: number;
    let finalMarginLeft: number;
    let finalMarginRight: number;

    if (alignmentMode === 'start') {
      finalMarginFront = marginFront;
      finalMarginBack = marginBack + remainingLength;
      finalMarginLeft = marginLeft;
      finalMarginRight = marginRight + remainingWidth;
    } else if (alignmentMode === 'end') {
      finalMarginFront = marginFront + remainingLength;
      finalMarginBack = marginBack;
      finalMarginLeft = marginLeft + remainingWidth;
      finalMarginRight = marginRight;
    } else {
      // center (défaut)
      finalMarginFront = marginFront + remainingLength / 2;
      finalMarginBack = marginBack + remainingLength / 2;
      finalMarginLeft = marginLeft + remainingWidth / 2;
      finalMarginRight = marginRight + remainingWidth / 2;
    }

    // Taux de couverture (surface éléments / surface totale disponible)
    const elementArea = totalElements * (element.width * element.height) / 1_000_000; // m²
    const totalArea = (availableLength * availableWidth) / 1_000_000; // m²
    const coverageRatio = (elementArea / totalArea) * 100;

    // Calculer le poids total si disponible
    const totalWeight = element.weight ? totalElements * element.weight : undefined;

    // Calculer le score selon le critère d'optimisation
    let score = 0;
    switch (optimizeFor) {
      case 'quantity':
        score = totalElements;
        break;
      case 'coverage':
        score = coverageRatio;
        break;
      case 'balanced':
        // Compromis: nombre d'éléments avec bonus pour bon taux de couverture
        score = totalElements * (1 + coverageRatio / 200);
        break;
    }

    if (score > bestScore) {
      bestScore = score;
      bestLayout = {
        orientation: orient,
        rows: rowsMax,
        columns: columnsMax,
        totalElements,
        rowSpacing,
        columnSpacing,
        usedLength,
        usedWidth,
        marginFront: finalMarginFront,
        marginBack: finalMarginBack,
        marginLeft: finalMarginLeft,
        marginRight: finalMarginRight,
        coverageRatio,
        totalWeight,
        score
      };
    }
  }

  // Si aucune solution trouvée, retourner une configuration vide
  if (!bestLayout) {
    return {
      orientation: 'landscape',
      rows: 0,
      columns: 0,
      totalElements: 0,
      rowSpacing,
      columnSpacing,
      usedLength: 0,
      usedWidth: 0,
      marginFront,
      marginBack,
      marginLeft,
      marginRight,
      coverageRatio: 0,
      score: 0
    };
  }

  return bestLayout;
}

/**
 * Calcule les positions individuelles de chaque élément
 *
 * @param layout - Résultat du calepinage
 * @param element - Élément à disposer
 * @returns Liste des positions de chaque élément
 */
export function calculateElementPositions(
  layout: LayoutResult,
  element: LayoutElement
): ElementPosition[] {
  const positions: ElementPosition[] = [];

  if (layout.totalElements === 0) return positions;

  // Dimensions de l'élément selon l'orientation
  const elementLength = layout.orientation === 'landscape' ? element.width : element.height;
  const elementWidth = layout.orientation === 'landscape' ? element.height : element.width;

  // Position de départ (incluant marge)
  const startX = layout.marginFront;
  const startZ = layout.marginLeft;

  // Créer la position de chaque élément
  for (let row = 0; row < layout.rows; row++) {
    for (let col = 0; col < layout.columns; col++) {
      // Position du centre de l'élément
      const x = startX + col * (elementLength + layout.columnSpacing) + elementLength / 2;
      const z = startZ + row * (elementWidth + layout.rowSpacing) + elementWidth / 2;

      positions.push({
        row,
        column: col,
        x,
        z,
        width: elementLength,
        height: elementWidth
      });
    }
  }

  return positions;
}

/**
 * Valide si un calepinage respecte toutes les contraintes
 *
 * @param layout - Résultat du calepinage à valider
 * @param availableLength - Longueur disponible (mm)
 * @param availableWidth - Largeur disponible (mm)
 * @param constraints - Contraintes à respecter
 * @returns true si valide, false sinon
 */
export function validateLayout(
  layout: LayoutResult,
  availableLength: number,
  availableWidth: number,
  constraints: LayoutConstraints
): boolean {
  // Vérifier que les éléments ne dépassent pas
  const totalUsedLength = layout.marginFront + layout.usedLength + layout.marginBack;
  const totalUsedWidth = layout.marginLeft + layout.usedWidth + layout.marginRight;

  if (totalUsedLength > availableLength || totalUsedWidth > availableWidth) {
    return false;
  }

  // Vérifier espacements minimaux
  if (layout.rowSpacing < constraints.minRowSpacing) return false;
  if (layout.columnSpacing < constraints.minColumnSpacing) return false;

  // Vérifier contrainte de poids
  if (constraints.maxTotalWeight && layout.totalWeight) {
    if (layout.totalWeight > constraints.maxTotalWeight) return false;
  }

  return true;
}

/**
 * Optimise un calepinage existant en ajustant les espacements
 * pour mieux utiliser l'espace disponible
 *
 * @param layout - Calepinage de base
 * @param availableLength - Longueur disponible (mm)
 * @param availableWidth - Largeur disponible (mm)
 * @param element - Élément à disposer
 * @returns Calepinage optimisé avec espacements ajustés
 */
export function optimizeLayoutSpacing(
  layout: LayoutResult,
  availableLength: number,
  availableWidth: number,
  element: LayoutElement
): LayoutResult {
  if (layout.totalElements === 0) return layout;

  const elementLength = layout.orientation === 'landscape' ? element.width : element.height;
  const elementWidth = layout.orientation === 'landscape' ? element.height : element.width;

  // Espace disponible après placement des éléments
  const remainingLength = availableLength - layout.marginFront - layout.marginBack - layout.columns * elementLength;
  const remainingWidth = availableWidth - layout.marginLeft - layout.marginRight - layout.rows * elementWidth;

  // Répartir uniformément l'espace restant
  const optimizedColumnSpacing = layout.columns > 1
    ? remainingLength / (layout.columns - 1)
    : 0;
  const optimizedRowSpacing = layout.rows > 1
    ? remainingWidth / (layout.rows - 1)
    : 0;

  return {
    ...layout,
    columnSpacing: optimizedColumnSpacing,
    rowSpacing: optimizedRowSpacing,
    usedLength: layout.columns * elementLength + (layout.columns - 1) * optimizedColumnSpacing,
    usedWidth: layout.rows * elementWidth + (layout.rows - 1) * optimizedRowSpacing
  };
}
