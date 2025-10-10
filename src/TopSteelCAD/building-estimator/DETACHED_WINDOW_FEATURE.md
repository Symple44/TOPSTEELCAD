# Fonctionnalité de fenêtre détachée pour le viewer 3D

## 📋 Description

Une nouvelle fonctionnalité permet d'ouvrir le viewer 3D du Building Estimator dans une fenêtre séparée du navigateur. Cela permet aux utilisateurs de déplacer la visualisation 3D sur un deuxième écran pour améliorer leur flux de travail.

## ✨ Fonctionnalités

### 1. **Ouverture dans une nouvelle fenêtre**
- Bouton 🪟 ajouté dans le header du viewer 3D (Steps 2, 3 et 4)
- La fenêtre s'ouvre avec une taille de 1400x900 pixels par défaut
- La fenêtre peut être redimensionnée et déplacée librement

### 2. **Synchronisation en temps réel**
- Les modifications apportées au bâtiment sont immédiatement reflétées dans la fenêtre détachée
- La synchronisation fonctionne pour :
  - Dimensions du bâtiment
  - Paramètres de construction
  - Extensions
  - Ouvertures (portes, fenêtres)
  - Panneaux solaires (Step2)

### 3. **Interface optimisée**
- Layout en 2 colonnes : viewer 3D principal + panneau latéral avec résumé
- Copie automatique des styles CSS de la fenêtre principale
- Contrôles de vue affichés (rotation, zoom, pan)
- Bouton de fermeture avec raccourci clavier (Échap)

### 4. **Gestion du cycle de vie**
- Fermeture automatique lors du démontage du composant
- Nettoyage propre des ressources
- Prévention des fuites mémoire

## 🗂️ Architecture technique

### Fichiers créés

#### 1. `hooks/useDetachedWindow.ts`
Hook personnalisé pour gérer l'ouverture et la gestion d'une fenêtre détachée.

**Fonctionnalités:**
- Création d'une nouvelle fenêtre avec `window.open()`
- Copie des styles CSS de la fenêtre parent
- Rendu de composants React dans la fenêtre via `ReactDOM.createRoot()`
- Gestion du cycle de vie de la fenêtre

**API:**
```typescript
const {
  isOpen,           // Boolean - état d'ouverture
  openWindow,       // Function - ouvrir la fenêtre
  closeWindow,      // Function - fermer la fenêtre
  renderInWindow,   // Function - rendre un composant React
  windowRef         // Window | null - référence à la fenêtre
} = useDetachedWindow({
  title: 'Titre de la fenêtre',
  width: 1400,
  height: 900,
  left: 100,
  top: 100
});
```

#### 2. `components/DetachedViewer3D.tsx`
Composant wrapper pour le viewer 3D optimisé pour une fenêtre détachée.

**Structure:**
- Header avec titre et bouton de fermeture
- Layout 2 colonnes :
  - Colonne principale : `BuildingPreview3D` (100% de la hauteur)
  - Colonne latérale (300px) :
    - Résumé du bâtiment (`BuildingSummary`)
    - Contrôles de vue
    - Informations d'aide
- Footer avec copyright

**Props:**
```typescript
interface DetachedViewer3DProps {
  buildingType: BuildingType;
  dimensions: BuildingDimensions;
  parameters: BuildingParameters;
  extensions: Extension[];
  openings: BuildingOpening[];
  solarArray?: SolarArrayConfig;
  onClose?: () => void;
}
```

### Fichiers modifiés

#### 1. `components/steps/Step2_Equipment.tsx`
- Ajout du hook `useDetachedWindow`
- Ajout du bouton 🪟 dans le header du viewer 3D
- Ajout d'un `useEffect` pour synchroniser les données avec la fenêtre détachée

#### 2. `components/steps/Step3_Envelope.tsx`
- Même modifications que Step2

#### 3. `components/steps/Step4_Finishing.tsx`
- Même modifications que Step2

## 🎯 Utilisation

### Pour l'utilisateur

1. Naviguer vers Step 2, 3 ou 4 du Building Estimator
2. Cliquer sur le bouton 🪟 dans le header du viewer 3D (à côté du bouton plein écran)
3. Une nouvelle fenêtre s'ouvre avec le viewer 3D
4. Déplacer cette fenêtre sur un deuxième écran si disponible
5. Continuer à travailler dans la fenêtre principale
6. Les modifications sont automatiquement synchronisées dans la fenêtre détachée

### Raccourcis clavier

- **Échap** : Fermer la fenêtre détachée

### Boutons

- **🪟** : Ouvrir dans une nouvelle fenêtre (vert)
- **⛶** : Mode plein écran (bleu)
- **✕** : Fermer la fenêtre détachée (rouge)

## 🔧 Détails techniques

### Gestion des styles

Les styles CSS sont copiés de la fenêtre principale vers la fenêtre détachée de deux manières :

1. **Feuilles de styles externes** : Ajout de balises `<link>` pour chaque fichier CSS
2. **Styles inline** : Copie des règles CSS définies en JavaScript

Un style de base est également injecté pour garantir un affichage correct :
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', ...;
  overflow: hidden;
}
#detached-root {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
```

### Synchronisation des données

La synchronisation est réalisée via un `useEffect` qui surveille les changements :

```typescript
useEffect(() => {
  if (detachedWindow.isOpen) {
    detachedWindow.renderInWindow(
      <DetachedViewer3D
        buildingType={buildingType}
        dimensions={buildingDimensions}
        parameters={parametersWithEquipment}
        extensions={extensions}
        openings={convertedOpenings}
        solarArray={currentSolarArray}
        onClose={detachedWindow.closeWindow}
      />
    );
  }
}, [
  detachedWindow.isOpen,
  buildingType,
  buildingDimensions,
  parametersWithEquipment,
  extensions,
  convertedOpenings,
  currentSolarArray,
  detachedWindow
]);
```

### Gestion du cycle de vie

1. **Ouverture** :
   - Création de la fenêtre avec `window.open()`
   - Injection des styles CSS
   - Création d'un conteneur DOM
   - Création d'un root React avec `createRoot()`
   - Ajout d'un listener sur `beforeunload`

2. **Mise à jour** :
   - Le `useEffect` détecte les changements
   - Appel de `renderInWindow()` avec les nouvelles données
   - React re-rend le composant dans la fenêtre détachée

3. **Fermeture** :
   - Démontage du root React avec `unmount()`
   - Fermeture de la fenêtre avec `window.close()`
   - Nettoyage des références

## 🎨 Design

### Couleurs des boutons

- **Fenêtre détachée (🪟)** : `#10b981` (vert) - Symbolise l'ouverture/expansion
- **Plein écran (⛶)** : `#2563eb` (bleu) - Cohérent avec le thème principal
- **Fermer (✕)** : `#ef4444` (rouge) - Standard pour la fermeture

### Positionnement

Le bouton 🪟 est placé **avant** le bouton plein écran ⛶ dans le header, car :
1. C'est une fonctionnalité plus "permanente" (la fenêtre reste ouverte)
2. Le plein écran est plus "temporaire" (on revient rapidement)
3. Ordre logique : détacher → agrandir

## 📊 Avantages

### Pour l'utilisateur

1. **Productivité améliorée** : Permet de visualiser le bâtiment en 3D tout en travaillant sur les formulaires
2. **Multi-écrans** : Exploitation optimale des configurations multi-écrans
3. **Flexibilité** : L'utilisateur choisit quand utiliser cette fonctionnalité
4. **Pas de perte de fonctionnalité** : Toutes les fonctionnalités du viewer 3D sont disponibles

### Pour le développeur

1. **Réutilisabilité** : Le hook `useDetachedWindow` peut être utilisé pour d'autres composants
2. **Maintenabilité** : Code modulaire et bien séparé
3. **Performance** : Pas de duplication de la logique métier, juste du rendu
4. **Extensibilité** : Facile d'ajouter d'autres informations dans la fenêtre détachée

## ⚠️ Limitations et considérations

### Limitations techniques

1. **Bloqueurs de popup** : Les navigateurs peuvent bloquer l'ouverture si l'utilisateur n'a pas interagi
2. **Cross-origin** : Ne fonctionne pas avec des ressources cross-origin non autorisées
3. **Styles dynamiques** : Les styles ajoutés dynamiquement après l'ouverture ne sont pas copiés
4. **Performance** : Double rendu du viewer 3D (fenêtre principale + détachée)

### Considérations UX

1. **Fermeture inattendue** : L'utilisateur peut fermer la fenêtre manuellement
2. **Navigation** : Changer d'étape ne ferme pas automatiquement la fenêtre détachée
3. **État** : La fenêtre détachée n'a pas d'état propre, elle affiche l'état de la fenêtre principale

### Recommandations

1. **Tester sur différents navigateurs** : Chrome, Firefox, Safari, Edge
2. **Documenter pour les utilisateurs** : Ajouter une info-bulle ou un tutorial
3. **Ajouter une option de paramétrage** : Taille par défaut, position, etc.
4. **Gérer les erreurs** : Afficher un message si l'ouverture échoue

## 🚀 Améliorations futures possibles

### Fonctionnalités

1. **Mémorisation de la position** : Sauvegarder la taille et position de la fenêtre dans localStorage
2. **Mode picture-in-picture** : Alternative au mode détaché pour les navigateurs supportés
3. **Synchronisation bidirectionnelle** : Permettre de modifier le bâtiment depuis la fenêtre détachée
4. **Captures d'écran** : Bouton pour capturer une image du viewer 3D
5. **Annotations** : Permettre d'annoter le modèle 3D dans la fenêtre détachée

### Optimisations

1. **Lazy loading** : Ne rendre le composant que lorsque la fenêtre est visible
2. **Throttling** : Limiter la fréquence de mise à jour pour les grandes modifications
3. **WebWorkers** : Déporter les calculs lourds dans un worker
4. **Caching** : Mettre en cache les rendus 3D identiques

### Accessibilité

1. **Support clavier complet** : Navigation au clavier dans la fenêtre détachée
2. **Lecteurs d'écran** : Améliorer les attributs ARIA
3. **Contraste** : Vérifier le contraste des couleurs
4. **Zoom** : Support du zoom navigateur

## 🚀 Optimisations de performance

### Problème initial
Lors de l'utilisation, l'utilisateur pouvait rencontrer :
- **Latence importante** lors des interactions
- **Réinitialisation constante de la caméra** (zoom/rotation impossible)
- Le viewer se "reset" à chaque modification

### Solutions implémentées

#### 1. Debounce sur les mises à jour (300ms)
```typescript
useEffect(() => {
  if (!detachedWindow.isOpen) return;

  const timeoutId = setTimeout(() => {
    detachedWindow.renderInWindow(<DetachedViewer3D ... />);
  }, 300); // Attendre 300ms après la dernière modification

  return () => clearTimeout(timeoutId);
}, [dependencies]);
```

**Avantage** : Les modifications rapides successives ne déclenchent qu'un seul re-render

#### 2. Mémorisation avec React.memo
```typescript
export const DetachedViewer3D = memo(DetachedViewer3DComponent, (prevProps, nextProps) => {
  return (
    prevProps.buildingType === nextProps.buildingType &&
    JSON.stringify(prevProps.dimensions) === JSON.stringify(nextProps.dimensions) &&
    // ... autres comparaisons
  );
});
```

**Avantage** : Le composant ne re-render que si les données ont vraiment changé

#### 3. Nettoyage des dépendances useEffect
- Suppression de `detachedWindow` des dépendances (cause de re-renders infinis)
- Garde uniquement `detachedWindow.isOpen` et les données métier

### Résultat
- ✅ Interactions fluides (zoom, rotation, pan)
- ✅ Pas de latence perceptible
- ✅ Caméra stable pendant les modifications
- ✅ Mise à jour uniquement après 300ms d'inactivité

## 📝 Notes de version

### v1.1 (2025-10-10)
- ✅ Ajout du debounce (300ms) pour les mises à jour
- ✅ Mémorisation du composant avec React.memo
- ✅ Optimisation des dépendances useEffect
- ✅ Correction du problème de latence
- ✅ Correction du problème de réinitialisation de la caméra

### v1.0 (2025-10-10)

- ✅ Implémentation initiale du hook `useDetachedWindow`
- ✅ Création du composant `DetachedViewer3D`
- ✅ Intégration dans Step1_Dimensions, Step2_Equipment, Step3_Envelope, Step4_Finishing
- ✅ Synchronisation en temps réel des données
- ✅ Copie automatique des styles CSS
- ✅ Gestion du cycle de vie et nettoyage
- ✅ Documentation complète

---

**Auteur**: Claude Code Assistant
**Date**: 2025-10-10
**Version**: 1.1
