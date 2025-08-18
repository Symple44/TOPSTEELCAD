# Matrice de Comparaison - Parsers DSTV

## Features Comparison Matrix

| Feature | Parser Monolithique | Parser Modulaire | Status | Priority |
|---------|-------------------|------------------|---------|----------|
| **LEXER / TOKENIZATION** |
| Basic tokenization | ✅ Complet | ✅ Basique | 🔧 À enrichir | 🔴 Critical |
| Trous oblongs (modifier 'l') | ✅ Supporté | ❌ Manquant | ⚠️ À porter | 🔴 Critical |
| Faces composées (v...u) | ✅ Détection web | ❌ Manquant | ⚠️ À porter | 🔴 Critical |
| Notation scientifique | ✅ Regex complet | ⚠️ Partiel | 🔧 À améliorer | 🟠 Important |
| Commentaires (**) | ✅ Supporté | ✅ Supporté | ✅ OK | ✅ Done |
| **BLOCK PARSERS** |
| ST Block (16 fields) | ✅ 16 champs | ⚠️ 3 champs | ⚠️ À compléter | 🔴 Critical |
| BO Block (holes) | ✅ 4 types | ⚠️ 1 type | ⚠️ À enrichir | 🔴 Critical |
| AK Block (contours) | ✅ Logique complexe | ⚠️ Basique | ⚠️ À porter | 🔴 Critical |
| IK Block (inner) | ✅ Supporté | ❌ Manquant | ⚠️ À créer | 🟠 Important |
| SI Block (marking) | ✅ Complet | ⚠️ Basique | 🔧 À enrichir | 🟠 Important |
| SC Block (cuts) | ✅ Supporté | ❌ Manquant | ⚠️ À créer | 🟠 Important |
| BR Block (chamfer) | ✅ Supporté | ❌ Manquant | ⚠️ À créer | 🟡 Nice to have |
| PU Block | ✅ Supporté | ❌ Manquant | ⚠️ À créer | 🟡 Nice to have |
| KO Block | ✅ Supporté | ❌ Manquant | ⚠️ À créer | 🟡 Nice to have |
| **CONVERSION** |
| Material type detection | ✅ 10+ types | ⚠️ 5 types | ⚠️ À compléter | 🔴 Critical |
| Contours complexes | ✅ 9+ points | ❌ Non géré | ⚠️ À porter | 🔴 Critical |
| Découpes transversales | ✅ Détection auto | ❌ Manquant | ⚠️ À porter | 🔴 Critical |
| Bounds calculation | ✅ Précis | ⚠️ Basique | 🔧 À améliorer | 🟠 Important |
| Metadata preservation | ✅ Complet | ⚠️ Partiel | ⚠️ À enrichir | 🟠 Important |
| **VALIDATION** |
| File validation | ✅ Structure + data | ❌ Profile only | ⚠️ À implémenter | 🔴 Critical |
| Hole overlap detection | ✅ Implémenté | ✅ Implémenté | ✅ OK | ✅ Done |
| Self-intersecting check | ✅ Complet | ⚠️ Basique | 🔧 À améliorer | 🟠 Important |
| Validation levels | ❌ Non | ✅ 3 niveaux | ✅ Avantage nouveau | ✅ Done |
| **ARCHITECTURE** |
| Modularity | ❌ Monolithique | ✅ Modulaire | ✅ Avantage nouveau | ✅ Done |
| Testability | ❌ Difficile | ✅ Facile | ✅ Avantage nouveau | ✅ Done |
| Type safety | ⚠️ Partiel | ✅ Complet | ✅ Avantage nouveau | ✅ Done |
| Performance cache | ❌ Non | ⚠️ Prévu | 🔧 À implémenter | 🟡 Nice to have |
| Error handling | ⚠️ Basique | ⚠️ Basique | 🔧 À améliorer | 🟠 Important |

## Summary Statistics

### Parser Monolithique
- ✅ Features complètes: 20
- ⚠️ Features partielles: 2
- ❌ Features manquantes: 4
- **Score: 20/26 (77%)**

### Parser Modulaire
- ✅ Features complètes: 7
- ⚠️ Features partielles: 10
- ❌ Features manquantes: 9
- **Score: 7/26 (27%)**

## Migration Priority

### 🔴 Critical (Must have)
1. Lexer: Trous oblongs, faces composées
2. ST Block: 16 champs complets
3. BO Block: 4 types de trous
4. AK Block: Logique de découpe
5. Converter: Types matériaux, contours, découpes
6. Validator: File validation

### 🟠 Important (Should have)
1. IK, SI, SC Blocks
2. Bounds calculation
3. Metadata preservation
4. Error handling

### 🟡 Nice to have
1. BR, PU, KO Blocks
2. Performance cache
3. Advanced optimizations

## Features to Port from Monolithic Parser

```typescript
// Critical functions to migrate:
1. parseFaceData() - Line 238-315
2. parseSTBlock() - Line 416-503
3. parseBOBlock() - Line 508-550
4. parseAKBlock() - Line 602-655
5. detectMaterialType() - Line 919-941
6. isBaseShapeContour() - Line 973-1023
7. extractCutRegion() - Line 1028-1133
8. findMainRectangle() - Line 1138-1217
9. convertProfileToElement() - Line 689-914
10. calculateBounds() - Line 946-968
```

## Gaps to Fill

### Nouveau Parser Needs:
1. **Complete tokenization logic** from old lexer
2. **All 16 ST fields** mapping
3. **4 hole types** support (round, slotted, square, rectangular)
4. **Complex contour** analysis algorithms
5. **Transverse cut** detection
6. **Material type** complete patterns
7. **File-level** validation
8. **Rich metadata** preservation

## Migration Effort Estimate

| Component | Lines to Port | Complexity | Days |
|-----------|--------------|------------|------|
| Lexer | ~150 | High | 2 |
| ST Parser | ~100 | Medium | 1 |
| BO Parser | ~50 | Medium | 1 |
| AK Parser | ~400 | Very High | 3 |
| Other Parsers | ~200 | Medium | 2 |
| Converter | ~300 | High | 2 |
| Validator | ~100 | Medium | 1 |
| Tests | ~500 | Medium | 3 |
| **TOTAL** | **~1800** | **High** | **15** |

---
*Generated: ${new Date().toISOString()}*