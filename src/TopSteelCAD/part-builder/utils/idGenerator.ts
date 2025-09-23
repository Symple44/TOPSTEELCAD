/**
 * Générateur d'identifiants uniques pour les éléments
 * Utilise un compteur et un timestamp pour garantir l'unicité
 */

let counter = 0;

/**
 * Génère un identifiant unique avec préfixe
 * @param prefix - Préfixe de l'identifiant (ex: 'el', 'hole', 'cut')
 * @returns Identifiant unique
 */
export function generateUniqueId(prefix: string = 'id'): string {
  counter = (counter + 1) % 10000; // Reset après 10000 pour éviter des nombres trop grands
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}_${timestamp}_${counter}_${random}`;
}

/**
 * Génère un identifiant de référence pour une pièce
 * @param index - Index de la pièce
 * @param prefix - Préfixe de la référence (par défaut 'A')
 * @returns Référence formatée (ex: 'A001', 'B023')
 */
export function generateReference(index: number, prefix: string = 'A'): string {
  return `${prefix}${String(index + 1).padStart(3, '0')}`;
}

/**
 * Vérifie si un identifiant existe déjà dans une liste
 * @param id - Identifiant à vérifier
 * @param existingIds - Liste des identifiants existants
 * @returns true si l'identifiant existe déjà
 */
export function isIdUnique(id: string, existingIds: string[]): boolean {
  return !existingIds.includes(id);
}

/**
 * Génère un identifiant unique en vérifiant qu'il n'existe pas déjà
 * @param prefix - Préfixe de l'identifiant
 * @param existingIds - Liste des identifiants existants
 * @returns Identifiant unique garanti
 */
export function generateSafeUniqueId(prefix: string, existingIds: string[]): string {
  let id = generateUniqueId(prefix);
  let attempts = 0;
  const maxAttempts = 100;

  while (!isIdUnique(id, existingIds) && attempts < maxAttempts) {
    id = generateUniqueId(prefix);
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error('Impossible de générer un identifiant unique après 100 tentatives');
  }

  return id;
}

/**
 * Réinitialise le compteur interne (utile pour les tests)
 */
export function resetIdCounter(): void {
  counter = 0;
}