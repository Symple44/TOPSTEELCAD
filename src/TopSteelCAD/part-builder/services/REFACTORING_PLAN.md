# 📋 Plan de Refactoring - Centralisation des Profils

## 🎯 Objectif

Centraliser toute la logique de gestion des types de profils dans un service unique (`ProfileTypeService`) pour éliminer les duplications et incohérences.

## 📊 État actuel

### Problèmes identifiés :

1. **Code dupliqué** :
   - Mapping ProfileType → MaterialType dans `partToPivot.ts` (150+ lignes)
   - Mapping aliases dans `csvParser.ts` (40+ lignes)
   - Mapping dans `PartDetailModal.tsx`
   - Listes hardcodées dans `PartDataTable.tsx`

2. **Incohérences** :
   - Anciens noms (`TUBES_ROND`, `TUBES_RECT`, `TUBES_CARRE`) vs nouveaux (`TUBE_CIRCULAR`, etc.)
   - Chaque fichier a sa propre logique de normalisation
   - Risque d'oubli lors de l'ajout de nouveaux profils

3. **Maintenance difficile** :
   - Changement sur un type = modification dans 5+ fichiers
   - Aucune source de vérité unique
   - Tests incomplets

## ✅ Solution : ProfileTypeService

### Caractéristiques :

- ✅ **Registry centralisé** : Tous les profils avec leurs métadonnées
- ✅ **Normalisation** : Anciens noms → Nouveaux noms (rétrocompatibilité)
- ✅ **Conversion** : ProfileType → MaterialType automatique
- ✅ **Métadonnées** : Nom d'affichage, description, préfixe, catégorie
- ✅ **Utilitaires** : Extraction sous-type, construction désignation, validation

### Avantages :

1. **Single Source of Truth** : Une seule source pour tous les profils
2. **Maintenabilité** : Ajouter un profil = 1 seule modification
3. **Cohérence** : Même logique partout dans le projet
4. **Performance** : Maps optimisées pour recherche O(1)
5. **Type-safe** : TypeScript garantit la validité

## 📝 Plan de migration (Phase par phase)

### Phase 1 : Créer le service ✅ FAIT

- [x] Créer `ProfileTypeService.ts`
- [x] Définir l'interface `ProfileTypeMetadata`
- [x] Créer le registry complet avec tous les profils
- [x] Implémenter les méthodes utilitaires

### Phase 2 : Refactoriser les convertisseurs 🔄 SUIVANT

**Fichiers à modifier :**

#### 2.1. `partToPivot.ts`

**Avant :**
```typescript
function getMaterialTypeFromProfile(profileType: string): MaterialType {
  const profileTypeUpper = profileType.toUpperCase();
  switch (profileTypeUpper) {
    case 'IPE':
    case 'HEA':
    // ... 80 lignes de switch cases
  }
}
```

**Après :**
```typescript
import { ProfileTypeService } from '../services/ProfileTypeService';

function getMaterialTypeFromProfile(profileType: string): MaterialType {
  return ProfileTypeService.toMaterialType(profileType);
}
```

**Impact :** Suppression de ~100 lignes de code

#### 2.2. `csvParser.ts`

**Avant :**
```typescript
function validateProfileType(value: string): ProfileType {
  const mappings: Record<string, ProfileType> = {
    'IPE': ProfileType.IPE,
    // ... 35 lignes de mappings
  };
  return mappings[normalized] || ProfileType.IPE;
}
```

**Après :**
```typescript
import { ProfileTypeService } from '../services/ProfileTypeService';

function validateProfileType(value: string): ProfileType {
  return ProfileTypeService.normalize(value);
}
```

**Impact :** Suppression de ~40 lignes de code

#### 2.3. `PartDetailModal.tsx`

**Avant :**
```typescript
const normalizeProfileType = (profileType: string): ProfileType => {
  const mapping: Record<string, ProfileType> = {
    'TUBES_ROND': ProfileType.TUBE_CIRCULAR,
    'TUBES_RECT': ProfileType.TUBE_RECTANGULAR,
    'TUBES_CARRE': ProfileType.TUBE_SQUARE
  };
  return (mapping[profileType] || profileType) as ProfileType;
};
```

**Après :**
```typescript
import { ProfileTypeService } from '../services/ProfileTypeService';

// Plus besoin de fonction locale, utiliser directement :
ProfileTypeService.normalize(editedElement.profileType)
```

**Impact :** Suppression de la fonction locale + cohérence

#### 2.4. Extraction du sous-type

**Avant (ligne 97-98) :**
```typescript
const parts = designation.split(' ');
const subType = parts.slice(1).join(' ') || parts[0];
```

**Après :**
```typescript
const subType = ProfileTypeService.extractSubType(
  designation,
  editedElement.profileType
);
```

**Impact :** Logique centralisée + gestion correcte des préfixes

### Phase 3 : Refactoriser les composants UI 📅 APRÈS

#### 3.1. `PartDataTable.tsx`

**Problème actuel :**
```typescript
const PROFILE_TYPES = ['IPE', 'HEA', 'HEB', 'HEM', 'UPN', 'UAP', 'L', 'TUBES_RECT', 'TUBES_CARRE', 'TUBES_ROND'];

const PROFILE_SECTIONS: Record<string, string[]> = {
  IPE: ['80', '100', '120', ...],
  HEA: ['100', '120', '140', ...],
  // ... hardcodé
};
```

**Solution :**

1. **Option A** : Utiliser ProfileDatabase pour charger les profils disponibles
2. **Option B** : Utiliser ProfileTypeService pour les métadonnées + ProfileDatabase pour les sections

**Recommandation :** Option B

```typescript
import { ProfileTypeService } from '../services/ProfileTypeService';
import { ProfileDatabase } from '../../3DLibrary/database/ProfileDatabase';

// Obtenir tous les types de profils
const profileMetadata = ProfileTypeService.getAllMetadata();

// Pour chaque type, charger les profils disponibles depuis la DB
const loadAvailableSections = async (profileType: ProfileType) => {
  const profiles = await ProfileDatabase.getInstance().getProfilesByType(profileType);
  return profiles.map(p => ProfileTypeService.extractSubType(p.designation, profileType));
};
```

#### 3.2. `PartDetailModal.tsx` - Sélecteur de profils

**Amélioration :** Générer dynamiquement les optgroups depuis ProfileTypeService

**Avant (hardcodé) :**
```typescript
<optgroup label="Profilés en I">
  <option value={ProfileType.IPE}>IPE - Poutrelles européennes</option>
  <option value={ProfileType.HEA}>HEA - Poutrelles H légères</option>
  // ...
</optgroup>
```

**Après (généré) :**
```typescript
{Object.entries(ProfileTypeService.getAllGroupedByCategory()).map(([category, profiles]) => (
  <optgroup key={category} label={categoryLabels[category]}>
    {profiles.map(metadata => (
      <option key={metadata.type} value={metadata.type}>
        {metadata.displayName} - {metadata.description}
      </option>
    ))}
  </optgroup>
))}
```

### Phase 4 : Tests et validation ✅ FINAL

#### 4.1. Tests unitaires du service

```typescript
describe('ProfileTypeService', () => {
  test('normalise les anciens noms', () => {
    expect(ProfileTypeService.normalize('TUBES_ROND')).toBe(ProfileType.TUBE_CIRCULAR);
    expect(ProfileTypeService.normalize('TUBES_RECT')).toBe(ProfileType.TUBE_RECTANGULAR);
  });

  test('convertit vers MaterialType', () => {
    expect(ProfileTypeService.toMaterialType(ProfileType.IPE)).toBe(MaterialType.BEAM);
    expect(ProfileTypeService.toMaterialType(ProfileType.TUBE_CIRCULAR)).toBe(MaterialType.TUBE);
  });

  test('extrait le sous-type', () => {
    expect(ProfileTypeService.extractSubType('TR 40x20x2', ProfileType.TUBE_RECTANGULAR))
      .toBe('40x20x2');
    expect(ProfileTypeService.extractSubType('IPE 200', ProfileType.IPE))
      .toBe('200');
  });
});
```

#### 4.2. Tests d'intégration

- Vérifier que tous les profils existants fonctionnent toujours
- Tester l'import CSV avec anciens et nouveaux noms
- Tester la sélection de profils dans l'UI
- Tester l'affichage 3D de tous les types

#### 4.3. Migration des données existantes

Si des données sont stockées en localStorage avec les anciens noms :

```typescript
// Dans usePartBuilder.ts
const migrateOldProfileNames = (profileType: string): ProfileType => {
  return ProfileTypeService.normalize(profileType);
};

// Lors du chargement
const lastUsed = JSON.parse(localStorage.getItem('lastUsedProfile'));
if (lastUsed) {
  lastUsed.profileType = migrateOldProfileNames(lastUsed.profileType);
}
```

## 📈 Métriques de succès

- [ ] **Réduction de code** : ~200 lignes de code dupliqué supprimées
- [ ] **Cohérence** : 1 seule source de vérité pour tous les profils
- [ ] **Maintenabilité** : Ajouter un profil = 1 modification au lieu de 5+
- [ ] **Tests** : 100% de couverture du ProfileTypeService
- [ ] **Rétrocompatibilité** : Tous les anciens noms fonctionnent toujours

## 🚀 Implémentation

### Ordre recommandé :

1. ✅ **Phase 1** : Créer ProfileTypeService (FAIT)
2. 🔄 **Phase 2.1** : Refactoriser `partToPivot.ts` (PRIORITÉ)
3. 🔄 **Phase 2.2** : Refactoriser `csvParser.ts`
4. 🔄 **Phase 2.3** : Refactoriser `PartDetailModal.tsx`
5. 📅 **Phase 3** : Refactoriser les composants UI
6. ✅ **Phase 4** : Tests et validation

### Temps estimé :

- Phase 2 : ~1-2 heures
- Phase 3 : ~2-3 heures
- Phase 4 : ~1-2 heures
- **Total** : ~4-7 heures

### Risques :

- **Faible** : Service bien testé et isolé
- **Rétrocompatibilité** : Gérée via les aliases
- **Rollback facile** : Chaque phase est indépendante

## 📚 Documentation

### Après migration, documenter :

1. Guide d'utilisation du ProfileTypeService
2. Comment ajouter un nouveau type de profil
3. Migration guide pour les développeurs
4. API Reference du service

## 🎁 Bénéfices à long terme

1. **Extensibilité** : Ajouter des métadonnées (poids, coût, etc.) au registry
2. **i18n** : Ajouter des traductions dans les métadonnées
3. **Validation** : Validation centralisée des profils
4. **Performance** : Cache et optimisations possibles
5. **Analytics** : Tracking de l'utilisation des profils
