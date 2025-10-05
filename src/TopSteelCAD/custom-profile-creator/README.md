# 📐 Créateur de Profils Personnalisés

Application autonome pour créer et gérer des profils métalliques personnalisés.

## 🚀 Démarrage

### Développement

```bash
npm run dev
```

Puis ouvrez: `http://localhost:5173/profile-creator.html`

### Production

```bash
npm run build
```

Les fichiers compilés seront dans `dist/`

## 📋 Fonctionnalités

### ✏️ Éditeur 2D
- **Outils de dessin**: Ligne, Rectangle, Cercle, Polygone
- **Grille magnétique**: Accrochage précis aux points de grille
- **Navigation**: Zoom (molette), Pan (clic milieu ou Shift+clic)
- **Prévisualisation temps réel**: Voir le tracé en cours
- **Affichage coordonnées**: Position de la souris en temps réel

### 📊 Calculs Automatiques
- Aire de la section (cm²)
- Périmètre (mm)
- Centre de gravité (centroïde)
- Poids linéique (kg/m) avec densité matériau
- Moments d'inertie (optionnel)

### 💾 Gestion des Profils
- **Bibliothèque locale**: Stockage LocalStorage ou IndexedDB
- **Recherche**: Par nom, désignation ou tags
- **Export/Import**: Format JSON pour partager
- **Prévisualisation 3D**: Voir le profil en 3D avec rotation

### 🎨 Interface
- **Page d'accueil**: Présentation des fonctionnalités
- **3 modes de vue**:
  - Éditeur 2D
  - Bibliothèque de profils
  - Aperçu 3D
- **Navigation intuitive**: Boutons de navigation clairs

## 📁 Structure des Fichiers

```
TopSteelCAD/
├── profile-creator.html              # Point d'entrée HTML
├── src/TopSteelCAD/
│   ├── custom-profile-creator/
│   │   ├── main.tsx                  # Point d'entrée React
│   │   ├── ProfileCreatorApp.tsx    # Composant principal
│   │   └── README.md                 # Ce fichier
│   ├── part-builder/
│   │   ├── components/
│   │   │   ├── ProfileGenerator2D.tsx      # Éditeur 2D
│   │   │   └── CustomProfileManager.tsx   # Gestionnaire bibliothèque
│   │   └── services/
│   │       └── CustomProfileStorage.ts    # Service de stockage
│   ├── 3DLibrary/
│   │   ├── types/
│   │   │   └── custom-profile.types.ts   # Types TypeScript
│   │   └── utils/
│   │       └── customProfileHelpers.ts   # Fonctions utilitaires
│   └── viewer/
│       └── CustomGeometryConverter.ts    # Conversion 2D→3D
```

## 🛠️ Utilisation

### 1. Créer un nouveau profil

1. Cliquez sur **"🚀 Créer un nouveau profil"**
2. Sélectionnez un outil de dessin (ligne, rectangle, etc.)
3. Cliquez sur le canvas pour dessiner
4. Cliquez sur **"💾 Créer profil"**
5. Entrez nom et désignation
6. Le profil est automatiquement sauvegardé

### 2. Outils de dessin disponibles

#### 📏 Ligne
- Cliquez 2 points
- Trace une ligne droite

#### ⬜ Rectangle
- Cliquez 2 coins opposés
- Crée un rectangle

#### ⭕ Cercle
- Clic 1: centre
- Clic 2: point sur le périmètre
- Définit le rayon

#### 🔷 Polygone
- Cliquez plusieurs points
- Cliquez "✅ Terminer polygone" pour fermer

### 3. Navigation

- **Zoom**: Molette de la souris
- **Pan**: Clic milieu OU Shift+clic gauche
- **Snap à la grille**: Automatique (distance < 20px)

### 4. Gérer la bibliothèque

- **Rechercher**: Tapez dans la barre de recherche
- **Voir détails**: Cliquez sur un profil
- **Exporter**: Bouton "📤 Export" → fichier JSON
- **Importer**: Bouton "📥 Importer JSON"
- **Supprimer**: Bouton "🗑️"

### 5. Aperçu 3D

1. Sélectionnez un profil dans la bibliothèque
2. Cliquez sur **"👁️ Aperçu 3D"**
3. Le profil s'affiche en rotation automatique

## 📝 Format de fichier

Les profils sont exportés en JSON:

```json
{
  "formatVersion": "1.0",
  "exportedAt": "2025-01-15T10:30:00Z",
  "type": "single",
  "profile": {
    "id": "custom-1642248600000-abc123",
    "name": "Mon Profil",
    "designation": "CUSTOM-001",
    "description": "Profil créé avec l'éditeur 2D",
    "profileType": "CUSTOM",
    "shape": {
      "outerContour": {
        "segments": [...]
      }
    },
    "properties": {
      "area": 50.0,
      "perimeter": 300.0,
      "centroid": { "x": 0, "y": 0 }
    },
    "metadata": {
      "author": "John Doe",
      "createdAt": "2025-01-15T10:30:00Z",
      "version": "1.0.0",
      "tags": ["custom", "steel"]
    }
  }
}
```

## 🔧 Configuration

### Grille

Par défaut:
- **Espacement**: 10 mm
- **Distance snap**: 20 pixels
- **Couleur principale**: #666666
- **Couleur secondaire**: #cccccc

Modifiable dans `ProfileGenerator2D.tsx` (lignes 59-68)

### Stockage

- **LocalStorage**: < 5 MB
- **IndexedDB**: > 5 MB
- Sélection automatique selon la taille

## 🎯 Raccourcis Clavier

| Touche | Action |
|--------|--------|
| Molette | Zoom in/out |
| Shift + Clic | Pan (déplacer) |
| Clic milieu | Pan (déplacer) |
| Échap | Annuler tracé en cours |

## 💡 Conseils

1. **Utilisez la grille**: Activez le snap pour des mesures précises
2. **Commencez simple**: Rectangle ou cercle pour tester
3. **Vérifiez les calculs**: L'aire et le poids sont automatiques
4. **Exportez régulièrement**: Sauvegardez vos profils importants
5. **Nommez clairement**: Utilisez des noms descriptifs

## 🐛 Dépannage

### Le profil ne se ferme pas
→ Vérifiez que le dernier point rejoint le premier (snap activé)

### Les calculs sont incorrects
→ Le contour doit être fermé (closed = true)

### L'export ne fonctionne pas
→ Vérifiez que le navigateur autorise les téléchargements

### Le canvas est noir
→ Rechargez la page, vérifiez la console pour erreurs

## 📚 Liens Utiles

- [Documentation Three.js](https://threejs.org/docs/)
- [Normes EN 10025](https://www.eurocodes-online.com/)
- [TopSteelCAD GitHub](https://github.com/your-repo/topsteelcad)

## 📄 Licence

© 2025 TopSteelCAD - Tous droits réservés
