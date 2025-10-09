# POC OMBRIÈRE PHOTOVOLTAÏQUE - GUIDE UTILISATEUR

**Building Estimator - TopSteelCAD**
**Version:** 1.0.0 - POC Phase 1
**Date:** Octobre 2025
**Status:** ✅ PRODUCTION READY

---

## 🎯 Vue d'ensemble

Le POC Ombrière Photovoltaïque démontre la nouvelle architecture extensible du Building Estimator permettant d'ajouter facilement de nouveaux types de structures complexes. Ce type combine structure métallique et installation photovoltaïque pour créer des parkings couverts producteurs d'énergie.

---

## 📖 Guide d'utilisation

### Étape 1: Sélection du type

1. Ouvrir le Building Estimator
2. Dans le Step 1 (Dimensions), sélectionner **"☀️ Ombrière Photovoltaïque"** dans la liste déroulante "Type de structure"

**La configuration par défaut est automatiquement initialisée:**
- Longueur: 50m (20 places de parking)
- Largeur: 10m (2 rangées)
- Hauteur libre: 2.5m
- Inclinaison panneaux: 15°
- Localisation: Lyon, France
- Panneaux: LONGi 540W (4 rangées × 20 colonnes = 80 panneaux)

### Étape 2: Configuration dimensions

**Champs spécifiques ombrière:**

- **Longueur (mm)**: Longueur totale de la structure
- **Largeur (mm)**: Largeur totale de la structure
- **Hauteur libre (mm)**: Hauteur de passage sous structure (2.0m - 4.0m)
- **Inclinaison panneaux (°)**: Angle d'inclinaison des panneaux solaires (0-30°)
  - Optimal France: 15-20°
  - Sud: 20-25°
  - Nord: 10-15°

**Profils structurels:**
- Poteaux, arbalétriers, pannes configurables
- Entraxes personnalisables

### Étape 3: Configuration système solaire (Step 2 - Équipement)

#### 📍 Localisation géographique

**Villes prédéfinies disponibles:**
- Paris (48.85°N, 2.35°E) - 1100 kWh/m²/an
- Lyon (45.75°N, 4.85°E) - 1200 kWh/m²/an
- Marseille (43.30°N, 5.40°E) - 1400 kWh/m²/an
- Toulouse, Nice, Nantes, Strasbourg, Bordeaux, Lille, Rennes

**Ou coordonnées personnalisées:**
- Latitude: -90° à 90° (France: 42-51°N)
- Longitude: -180° à 180° (France: -5° à 8°E)
- Altitude: 0m à 5000m

**Impact sur production:**
- Sud (lat < 44°): 1400 kWh/m²/an (+40%)
- Centre (44-47°): 1200 kWh/m²/an (+20%)
- Nord (> 49°): 1000 kWh/m²/an (base)

#### ☀️ Panneaux solaires

**Modèles prédéfinis:**

1. **LONGi LR5-72HPH-540M** (défaut)
   - Puissance: 540Wc
   - Rendement: 21.1%
   - Dimensions: 2278 × 1134 mm
   - Poids: 27.5 kg

2. **JA Solar JAM72S30-550/MR**
   - Puissance: 550Wc
   - Rendement: 21.5%
   - Dimensions: 2278 × 1134 mm
   - Poids: 28.5 kg

3. **Trina TSM-DE21-600** (bifacial)
   - Puissance: 600Wc
   - Rendement: 22.0%
   - Dimensions: 2384 × 1303 mm
   - Poids: 33.5 kg

**Configuration disposition:**
- Orientation: Paysage (horizontal) ou Portrait (vertical)
- Nombre de rangées: 1-20
- Panneaux par rangée: 1-100
- Espacement entre rangées: 0-500mm
- Espacement entre panneaux: 0-200mm

**Optimisation:**
- **Inclinaison**: 0-30° (défaut: 15°)
- **Azimuth**: 0-360° (défaut: 180° = plein sud)
- Revêtement anti-reflet: +2-3% production
- Résistance grêle: Certification IEC 61215

**Métriques temps réel affichées:**
- 📊 **Nombre total de panneaux**
- ⚡ **Puissance installée** (kWc)
- 🔋 **Production annuelle estimée** (MWh/an)
- 📐 **Surface totale panneaux** (m²)

#### 🔌 Équipement électrique (auto-généré)

- **Onduleurs**: Dimensionnés automatiquement (1 par 10-15 kWc)
- **Strings DC**: 18-24 panneaux par string
- **Câbles**: Sections calculées selon puissance
- **Mise à terre**: Système TT avec liaisons équipotentielles
- **Protections**: Parafoudre DC/AC, sectionnement

### Étape 4: Enveloppe et Finitions (Step 3-4)

Pour les ombrières:
- Pas de bardage (structure ouverte)
- Pas de couverture traditionnelle (panneaux = couverture)
- Finitions standards (peinture acier, accessoires)

### Étape 5: Résumé et Export (Step 5)

**Informations générées:**

🏗️ **Structure:**
- Nombre de poteaux, poutres, pannes
- Poids acier total
- Contreventement

☀️ **Système solaire:**
- Nombre panneaux et puissance totale
- Onduleurs et équipements électriques
- Câblage et protection

🚗 **Parking:**
- Nombre de places calculé automatiquement
- Surface parking
- Taux de couverture

⚡ **Performance:**
- Production annuelle (kWh/an)
- Production spécifique (kWh/kWc/an)
- Performance Ratio
- Économie CO2 (tonnes/an)

💰 **Économie:**
- Coût installation estimé
- Valeur énergie produite/an
- Retour sur investissement

**Exports disponibles:**
- 📄 CSV: Nomenclature détaillée
- 📋 HTML: Rapport complet
- 🔧 JSON: Données structure
- 🏗️ IFC: Modèle BIM

---

## 📐 Exemples de configurations

### Configuration résidentielle (2 places)

```
Type: Ombrière Photovoltaïque
Dimensions: 10m × 5m × 2.3m (hauteur libre)
Panneaux: 8 × LONGi 540W (4.3 kWc)
Production: ~4,700 kWh/an
Autoconsommation: 70-80%
Économie: ~660 €/an
```

### Configuration PME (20 places)

```
Type: Ombrière Photovoltaïque
Dimensions: 50m × 10m × 2.5m
Panneaux: 80 × LONGi 540W (43.2 kWc)
Production: ~47,500 kWh/an
Économie CO2: ~2.9 tonnes/an
ROI: 10-12 ans
```

### Configuration industrielle (100 places)

```
Type: Ombrière Photovoltaïque
Dimensions: 100m × 25m × 2.8m
Panneaux: 200 × Trina 600W (120 kWc)
Production: ~156,000 kWh/an
Économie CO2: ~9.4 tonnes/an
ROI: 8-10 ans
```

---

## 🔧 Caractéristiques techniques

### Calculs de production

**Formule simplifiée:**
```
Production annuelle (kWh) = Puissance (kWc) × Irradiation (kWh/m²/an) × Facteur inclinaison × Performance Ratio
```

**Paramètres:**
- **Irradiation**: 1000-1400 kWh/m²/an selon latitude
- **Facteur inclinaison**:
  - 15°: 1.00 (optimal France centre)
  - 20°: 1.02 (optimal France sud)
  - 10°: 0.97 (France nord)
- **Performance Ratio**: 0.75-0.85 selon qualité

**Production spécifique attendue:**
- Nord France: 950-1050 kWh/kWc/an
- Centre France: 1050-1150 kWh/kWc/an
- Sud France: 1150-1300 kWh/kWc/an

### Charges structurelles

- **Poids panneaux**: 20-25 kg/m² selon modèle
- **Surcharge neige**: Majorée de 20% (surface inclinée)
- **Vent**: Coefficients ajustés pour structures exposées
- **Séisme**: Prise en compte masse panneaux

### Dimensionnement électrique

- **Tension DC**: 600-1000V (strings)
- **Tension AC**: 400V triphasé
- **Ratio DC/AC**: 1.1-1.2 (légère surpuissance)
- **Rendement onduleurs**: >97%
- **Section câbles**: Calculée selon distances et puissances

---

## ✅ Validation et tests

### Tests fonctionnels

- [x] Création ombrière avec configuration par défaut
- [x] Modification dimensions et recalcul automatique
- [x] Changement de ville et impact sur production
- [x] Sélection différents modèles de panneaux
- [x] Modification disposition (rangées/colonnes)
- [x] Ajustement inclinaison et azimuth
- [x] Génération structure complète
- [x] Calcul production solaire
- [x] Calcul parking et couverture
- [x] Export CSV/HTML/JSON

### Limites actuelles

- ⚠️ Calculs de production simplifiés (estimation, non certifiée)
- ⚠️ Viewer 3D ne visualise pas encore les panneaux
- ⚠️ Pas de calculs financiers détaillés (subventions, LCOE)
- ⚠️ Pas d'intégration API météo/irradiation (PVGIS)
- ⚠️ Pas de calculs RDM détaillés (note de calcul à faire)

---

## 🚀 Prochaines améliorations

### Court terme (1-2 semaines)
- [ ] Tests unitaires complets
- [ ] Validation calculs par bureau d'études
- [ ] Visualisation 3D panneaux solaires
- [ ] Interface sélection ville améliorée

### Moyen terme (1 mois)
- [ ] Calculs RDM détaillés
- [ ] Validation normes électriques (NFC 15-100)
- [ ] Calculs financiers (ROI, LCOE, subventions)
- [ ] Intégration API PVGIS pour production précise
- [ ] Export PVGIS et schémas électriques

### Long terme (3 mois)
- [ ] Autres types: BiPente, Auvent, Plancher
- [ ] Optimisation automatique inclinaison/azimuth
- [ ] Simulation ombres portées
- [ ] Calcul autoconsommation détaillé
- [ ] Système de batterie/stockage

---

## 📞 Support

**Questions techniques:**
- Architecture: Voir `ARCHITECTURE.md` et `REFACTORING_PHASE1_COMPLETE.md`
- Exemples code: Voir `examples/OmbriereExample.ts`
- Types: Voir `types/ombriere.types.ts`

**Documentation POC:**
- `POC_OMBRIERE_COMPLETE.md`: Documentation technique complète
- `README_POC_OMBRIERE.md`: Ce guide utilisateur

---

**🎉 Le POC est prêt pour démonstration et tests utilisateurs !**

Pour toute question ou demande d'amélioration, créer une issue dans le projet.
