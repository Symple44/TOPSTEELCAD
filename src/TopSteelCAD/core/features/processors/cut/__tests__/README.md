# Tests des Handlers de Coupe

Ce répertoire contient les tests unitaires complets pour les handlers de coupe du système TopSteelCAD.

## Structure des Tests

```
__tests__/
├── handlers/                    # Tests spécifiques aux handlers
│   ├── ExteriorCutHandler.test.ts
│   ├── PlateHandler.test.ts
│   └── KontourHandler.test.ts
├── __mocks__/                   # Mocks partagés
│   └── three.ts                 # Mock centralisé pour THREE.js
├── setup/                       # Configuration des tests
│   └── testSetup.ts            # Utilitaires et setup communs
└── README.md                   # Cette documentation
```

## Handlers Testés

### 1. ExteriorCutHandler.test.ts
Tests pour le handler des coupes extérieures (contours AK DSTV).

**Couverture des tests :**
- ✅ Propriétés du handler (name, priority, supportedTypes)
- ✅ Méthode `canHandle()` avec différents paramètres
- ✅ Validation avec erreurs et avertissements
- ✅ Création de géométrie pour différents types de contours
- ✅ Génération de métadonnées
- ✅ Gestion des cas limites et erreurs

**Scénarios testés :**
- Block DSTV 'AK'
- Type de coupe explicite 'exterior'
- Catégorie EXTERIOR
- Analyse de points pour détection automatique
- Contours fermés/ouverts
- Contours complexes (> 100 points)
- Dimensions manquantes
- Redéfinition de contour complet
- Coupes de préparation (coping)
- Différentes faces de profil

### 2. PlateHandler.test.ts
Tests pour le handler des plaques et tôles (blocks PL DSTV).

**Couverture des tests :**
- ✅ Propriétés du handler
- ✅ Détection de plaques par différents critères
- ✅ Validation des dimensions et paramètres
- ✅ Création de géométrie pour tous types de plaques
- ✅ Calcul automatique de poids et volume
- ✅ Gestion des cas limites

**Types de plaques testés :**
- Plaque plate standard
- Plaque pliée (avec angle et rayon)
- Plaque courbée
- Plaque perforée
- Plaque ondulée
- Forme personnalisée avec contour

**Validations testées :**
- Épaisseur positive
- Dimensions valides
- Angles de pliage [-180°, 180°]
- Patterns de perforation
- Correspondance contour/dimensions

### 3. KontourHandler.test.ts
Tests pour le handler des contours complexes (blocks KO DSTV).

**Couverture des tests :**
- ✅ Propriétés du handler
- ✅ Détection de contours complexes
- ✅ Validation de segments et continuité
- ✅ Création de géométrie pour tous types
- ✅ Tessellation d'arcs et courbes
- ✅ Gestion des données DSTV (bulge)

**Types de contours testés :**
- Multi-segments linéaires
- Contours avec arcs
- Contours avec splines
- Contours mixtes (lignes + arcs + splines)
- Contours complexes avec tessellation
- Contours libres (freeform)

**Validations spécifiques :**
- Minimum 3 points
- Continuité des segments
- Paramètres d'arcs valides
- Points de contrôle de splines
- Tolérance et subdivisions

## Configuration des Tests

### Mocks THREE.js
Le fichier `__mocks__/three.ts` fournit un mock centralisé pour THREE.js avec :
- BufferGeometry, ExtrudeGeometry, BoxGeometry
- Shape avec toutes les méthodes de dessin
- Matrix4 pour les transformations
- Euler et Vector3

### Setup Commun
Le fichier `setup/testSetup.ts` fournit :
- Factory functions pour créer des éléments de test
- Utilitaires de validation
- Données de test standardisées
- Assertions géométriques communes

## Exécution des Tests

```bash
# Tous les tests des handlers
npm test -- __tests__/handlers

# Test spécifique
npm test -- ExteriorCutHandler.test.ts

# Avec couverture
npm test -- --coverage __tests__/handlers
```

## Métriques de Test

Chaque fichier de test contient **au moins 5 cas de test** par méthode principale :

### Méthodes testées pour chaque handler :
1. **canHandle()** - 5+ cas différents
2. **validate()** - 5+ scénarios (succès, erreurs, avertissements)
3. **createCutGeometry()** - 5+ types de géométrie
4. **generateMetadata()** - 3+ configurations
5. **Cas limites** - 5+ scénarios d'erreur/edge cases

## Stratégie de Test

### 1. Tests Unitaires Purs
- Isolation complète avec mocks
- Pas de dépendances externes
- Focus sur la logique métier

### 2. Tests de Validation
- Vérification des paramètres d'entrée
- Messages d'erreur appropriés
- Avertissements pour cas limites

### 3. Tests de Géométrie
- Vérification des appels THREE.js
- Validation des transformations
- Test des différentes faces/orientations

### 4. Tests de Métadonnées
- Génération correcte des informations
- Calculs (poids, volume, aires)
- Types de coupe détectés

### 5. Tests de Robustesse
- Données malformées
- Valeurs extrêmes
- Cas de bord (NaN, Infinity, null)

## Bonnes Pratiques

### Structure des Tests
```typescript
describe('HandlerName', () => {
  describe('Handler Properties', () => { /* ... */ });
  describe('canHandle Method', () => { /* ... */ });
  describe('Validation', () => { /* ... */ });
  describe('Geometry Creation', () => { /* ... */ });
  describe('Metadata Generation', () => { /* ... */ });
  describe('Edge Cases and Error Handling', () => { /* ... */ });
});
```

### Conventions de Nommage
- Tests descriptifs : `should handle DSTV AK block`
- Groupement logique par fonctionnalité
- Cas de test explicites et documentés

### Assertions
- Utilisation d'`expect.objectContaining()` pour objets partiels
- Vérification des appels de mocks avec `toHaveBeenCalledWith()`
- Tests des propriétés et méthodes importantes

## Maintenance

### Ajout de Nouveaux Tests
1. Utiliser les factories du `testSetup.ts`
2. Réutiliser les mocks centralisés
3. Suivre la structure existante
4. Documenter les nouveaux scénarios

### Mise à Jour des Mocks
- Synchroniser avec les changements THREE.js
- Maintenir la compatibilité des interfaces
- Tester les nouveaux mocks avec tous les handlers

### Refactoring
- Maintenir la couverture existante
- Adapter aux changements d'API
- Préserver les cas de test critiques