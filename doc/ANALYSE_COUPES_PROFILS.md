# Analyse des Types de Coupes selon les Profils

## 1. TYPES DE PROFILS

### 1.1 Profils I (IPE, HEA, HEB, UB, UC)
- **Structure** : Âme centrale + 2 semelles (top/bottom)
- **Faces** : 
  - `v` (web/âme) : face centrale verticale
  - `o` (top_flange) : semelle supérieure
  - `u` (bottom_flange) : semelle inférieure
- **Caractéristiques** : 
  - Épaisseurs différentes pour âme et semelles
  - Géométrie en forme de I
  - Points de référence : centre de l'âme

### 1.2 Tubes Rectangulaires (HSS, RHS, SHS)
- **Structure** : Section creuse rectangulaire/carrée
- **Faces** :
  - `v` (web) : face avant
  - `h` (front) : face arrière  
  - `o` (top) : face supérieure
  - `u` (bottom) : face inférieure
- **Caractéristiques** :
  - Épaisseur de paroi uniforme
  - Section fermée
  - Points de référence : coin inférieur gauche

### 1.3 Profils L (Cornières)
- **Structure** : Deux ailes perpendiculaires
- **Faces** :
  - `v` : aile verticale
  - `h` : aile horizontale
- **Caractéristiques** :
  - Épaisseur uniforme
  - Section ouverte en L
  - Points de référence : intersection des ailes

### 1.4 Profils U (UPN, UAP)
- **Structure** : Âme + 2 ailes parallèles
- **Faces** :
  - `v` (web) : âme
  - `o` (top_flange) : aile supérieure
  - `u` (bottom_flange) : aile inférieure
- **Caractéristiques** :
  - Section ouverte en U
  - Épaisseurs variables

### 1.5 Plaques/Platines (PL, FL)
- **Structure** : Surface plane
- **Faces** :
  - `v` : face principale
  - `h` : face arrière (si épaisseur > 0)
- **Caractéristiques** :
  - Épaisseur constante
  - Géométrie 2D extrudée

### 1.6 Plats Pliés (Cold-formed)
- **Structure** : Tôle pliée selon un profil
- **Faces** : Variables selon le pliage
- **Caractéristiques** :
  - Épaisseur constante de tôle
  - Rayons de pliage

## 2. TYPES DE COUPES

### 2.0 Classification Principale
- **Coupes Extérieures** : Modifient le contour externe du profil
- **Coupes Intérieures** : Créent des ouvertures dans le matériau
- **Encoches** : Enlèvement partiel préservant une partie de la section

### 2.1 Coupe Droite (Straight Cut) - [EXTÉRIEURE]
- **Description** : Coupe perpendiculaire à l'axe principal
- **Géométrie** : Plan de coupe vertical
- **Applications** : Tous profils
- **DSTV** : AK avec 4-5 points formant un rectangle

### 2.2 Coupe d'Angle (Angle Cut/Miter) - [EXTÉRIEURE]
- **Description** : Coupe inclinée pour assemblage d'angle
- **Géométrie** : Plan de coupe incliné
- **Applications** : Tous profils
- **DSTV** : AK avec points décrivant l'angle

### 2.3 Coupe de Contour (Contour Cut) - [EXTÉRIEURE]
- **Description** : Modification du contour externe du profil
- **Géométrie** : Forme complexe définissant le nouveau contour
- **Applications** : Extrémités de profils, formes spéciales
- **DSTV** : AK définissant le contour complet
- **Exemple** : h5004 avec coupes droites aux extrémités

### 2.4 Coupe avec Encoches (Cut with Notches) - [MIXTE]
- **Description** : Coupe complexe avec parties préservées
- **Géométrie** : Contour complexe (> 5 points)
- **Applications** : Profils I, U
- **DSTV** : AK avec 8-9 points (pattern M1002)
- **Exemple** : Coupe d'angle préservant une partie de la semelle

### 2.5 Découpe Intérieure (Cutout/Opening) - [INTÉRIEURE]
- **Description** : Ouverture dans le matériau
- **Géométrie** : Contour fermé intérieur
- **Applications** : Plaques, âmes de profils
- **DSTV** : IK (Innenkontur)
- **Exemples** : Fenêtres, passages de câbles

### 2.6 Encoche Partielle (Partial Notch/Cope) - [ENCOCHE]
- **Description** : Enlèvement partiel de matière
- **Géométrie** : Découpe sur une partie de la section
- **Applications** : Semelles de profils I, ailes de cornières
- **DSTV** : AK localisé sur une face

### 2.7 Coupe en Biseau (Bevel Cut) - [EXTÉRIEURE]
- **Description** : Coupe avec angle pour soudure
- **Géométrie** : Plan incliné avec angle spécifique
- **Applications** : Préparation de soudure
- **DSTV** : AK avec paramètres d'angle

### 2.8 Trous (Holes) - [INTÉRIEURE]
- **Description** : Perçages circulaires ou oblongs
- **Géométrie** : Cylindre ou forme oblongue
- **Applications** : Tous profils
- **DSTV** : BO (Bohrungen)

## 3. MATRICE PROFIL/COUPE

| Type Profil | Coupe Droite | Angle | Encoches | Intérieure | Partielle | Biseau |
|-------------|--------------|-------|----------|------------|-----------|---------|
| **I (IPE/HE)** | ✅ ExtrudeCSG | ✅ ExtrudeCSG | ✅ ComplexCSG | ✅ HoleCSG | ✅ BoxCSG | ✅ AngleCSG |
| **Tube (HSS)** | ✅ Redéfinir | ✅ Redéfinir | ❌ N/A | ✅ HoleCSG | ❌ N/A | ✅ Redéfinir |
| **L (Angle)** | ✅ ExtrudeCSG | ✅ ExtrudeCSG | ✅ ComplexCSG | ✅ HoleCSG | ✅ BoxCSG | ✅ AngleCSG |
| **U (Channel)** | ✅ ExtrudeCSG | ✅ ExtrudeCSG | ✅ ComplexCSG | ✅ HoleCSG | ✅ BoxCSG | ✅ AngleCSG |
| **Plaque** | ✅ BoxCSG | ✅ BoxCSG | ✅ ComplexCSG | ✅ HoleCSG | ✅ BoxCSG | ✅ AngleCSG |
| **Plat Plié** | ✅ ExtrudeCSG | ✅ ExtrudeCSG | ✅ ComplexCSG | ✅ HoleCSG | ✅ BoxCSG | ✅ AngleCSG |

### Légende :
- **ExtrudeCSG** : Utiliser ExtrudeGeometry + CSG subtract
- **BoxCSG** : Utiliser BoxGeometry + CSG subtract
- **ComplexCSG** : Utiliser Shape complexe + ExtrudeGeometry + CSG
- **HoleCSG** : Utiliser CylinderGeometry + CSG subtract
- **AngleCSG** : Utiliser plan incliné + CSG
- **Redéfinir** : Redéfinir la géométrie finale (pas de soustraction)

## 4. APPROCHE PROPOSÉE

### 4.1 Architecture Modulaire

```typescript
interface CutStrategy {
  canProcess(profile: ProfileType, cutType: CutType): boolean;
  process(geometry: BufferGeometry, cut: CutData): BufferGeometry;
}

class CutProcessor {
  private strategies: Map<string, CutStrategy>;
  
  process(geometry, feature, element) {
    const profileType = element.metadata.profileType;
    const cutType = this.detectCutType(feature);
    const strategy = this.selectStrategy(profileType, cutType);
    return strategy.process(geometry, feature);
  }
}
```

### 4.2 Stratégies par Type

#### 4.2.1 Profils Ouverts (I, L, U)
```typescript
class OpenProfileCutStrategy implements CutStrategy {
  process(geometry, cut) {
    // 1. Créer la forme de découpe
    const cutShape = this.createCutShape(cut.points);
    
    // 2. Extruder selon la profondeur
    const cutGeometry = new ExtrudeGeometry(cutShape, {
      depth: this.calculateDepth(cut),
      bevelEnabled: false
    });
    
    // 3. Positionner correctement
    this.positionCutGeometry(cutGeometry, cut);
    
    // 4. Appliquer CSG
    return CSG.subtract(geometry, cutGeometry);
  }
}
```

#### 4.2.2 Tubes (HSS, RHS)
```typescript
class TubeCutStrategy implements CutStrategy {
  process(geometry, cut) {
    if (cut.type === 'straight' || cut.type === 'angle') {
      // Pour les tubes, redéfinir les extrémités
      return this.redefineEnds(geometry, cut);
    } else if (cut.type === 'hole') {
      // Pour les trous, utiliser CSG
      return CSG.subtract(geometry, this.createHole(cut));
    }
  }
  
  private redefineEnds(geometry, cut) {
    // Recréer la géométrie du tube avec les nouvelles extrémités
    const vertices = geometry.attributes.position;
    // Modifier les vertices des extrémités selon le contour AK
    this.adjustEndVertices(vertices, cut.points);
    return geometry;
  }
}
```

#### 4.2.3 Plaques
```typescript
class PlateCutStrategy implements CutStrategy {
  process(geometry, cut) {
    if (cut.type === 'outline') {
      // Redéfinir le contour de la plaque
      return this.createPlateFromContour(cut.points);
    } else {
      // Découpes intérieures
      return CSG.subtract(geometry, this.createCutGeometry(cut));
    }
  }
}
```

### 4.3 Détection du Type de Coupe

```typescript
function detectCutType(feature: Feature): CutType {
  const points = feature.parameters.points;
  const face = feature.face;
  const contourType = feature.parameters.contourType;
  
  // Analyse basée sur le nombre de points
  if (points.length === 5) {
    if (this.isRectangular(points)) {
      return CutType.STRAIGHT;
    } else {
      return CutType.ANGLE;
    }
  }
  
  // Analyse basée sur la complexité
  if (points.length > 5) {
    if (this.hasNotches(points)) {
      return CutType.WITH_NOTCHES;
    } else if (this.isInterior(points)) {
      return CutType.INTERIOR;
    }
  }
  
  // Analyse basée sur le type DSTV
  if (contourType === 'partial_notches') {
    return CutType.PARTIAL_NOTCH;
  }
  
  return CutType.COMPLEX;
}
```

### 4.4 Gestion des Coordonnées

```typescript
class CoordinateAdapter {
  adaptForProfile(points: Point2D[], profile: ProfileType, face: Face): Point3D[] {
    switch(profile) {
      case ProfileType.I_PROFILE:
        return this.adaptForIProfile(points, face);
      case ProfileType.TUBE:
        return this.adaptForTube(points, face);
      case ProfileType.PLATE:
        return this.adaptForPlate(points, face);
    }
  }
  
  private adaptForTube(points: Point2D[], face: Face): Point3D[] {
    // Pour les tubes, les coordonnées sont relatives au coin
    // Pas besoin de centrage
    return points.map(p => ({
      x: p.x,
      y: p.y,
      z: this.getFaceZ(face)
    }));
  }
  
  private adaptForIProfile(points: Point2D[], face: Face): Point3D[] {
    // Pour les profils I, centrer sur l'âme
    const centerOffset = this.getProfileCenter();
    return points.map(p => ({
      x: p.x - centerOffset.x,
      y: p.y - centerOffset.y,
      z: this.getFaceZ(face)
    }));
  }
}
```

## 5. PROBLÈMES ACTUELS ET SOLUTIONS

### 5.1 Problème : Tubes traités comme profils I
**Solution** : Détection correcte du type + stratégie dédiée

### 5.2 Problème : CSG échoue avec géométries invalides
**Solution** : Validation et nettoyage des géométries avant CSG

### 5.3 Problème : Coordonnées mal positionnées
**Solution** : Adapter selon le système de coordonnées du profil

### 5.4 Problème : Outlines/Inlines non visibles
**Solution** : Stocker les informations de coupe dans userData pour le rendu

## 6. PLAN D'IMPLÉMENTATION DÉTAILLÉ

### Phase 1 : Refactoring de la détection
- [ ] Améliorer `detectProfileType()` pour distinguer tous les types
- [ ] Créer `detectCutCategory()` : EXTERIOR | INTERIOR | NOTCH
- [ ] Améliorer `detectCutType()` avec catégorisation

### Phase 2 : Stratégies de coupes extérieures
- [ ] `ExteriorCutStrategy` : Base pour coupes externes
- [ ] `StraightCutStrategy` : Coupes droites
- [ ] `AngleCutStrategy` : Coupes d'angle
- [ ] `ContourRedefinitionStrategy` : Redéfinition complète (tubes)

### Phase 3 : Stratégies de coupes intérieures
- [ ] `InteriorCutStrategy` : Base pour ouvertures
- [ ] `HoleStrategy` : Trous circulaires/oblongs
- [ ] `CutoutStrategy` : Découpes rectangulaires
- [ ] `WindowStrategy` : Ouvertures complexes

### Phase 4 : Stratégies d'encoches
- [ ] `NotchStrategy` : Base pour encoches
- [ ] `PartialNotchStrategy` : Encoches partielles
- [ ] `ComplexNotchStrategy` : Encoches avec préservation

### Phase 5 : Adaptation par profil
- [ ] `IProfileAdapter` : Profils I
- [ ] `TubeAdapter` : Tubes HSS/RHS
- [ ] `AngleAdapter` : Cornières
- [ ] `PlateAdapter` : Plaques

### Phase 6 : Validation et optimisation
- [ ] Système de validation pré-CSG
- [ ] Cache de géométries
- [ ] Batch processing

### Phase 7 : Visualisation
- [ ] Outlines pour coupes extérieures
- [ ] Inlines pour coupes intérieures
- [ ] Annotations dimensionnelles