# Instructions pour Claude Code - TopSteelCAD

## 🤖 Agents de Contrôle Qualité

### Agent: Quality Check
**À exécuter après chaque modification de code:**
```bash
npm run lint
npm run typecheck
```
- Corriger automatiquement les problèmes de formatage
- Vérifier les types TypeScript
- Valider les conventions de code
- Signaler les imports inutilisés

### Agent: Security Check
**À exécuter après ajout/modification de dépendances:**
```bash
npm audit
npm audit fix
```
- Scanner les vulnérabilités connues
- Vérifier les dépendances obsolètes
- Valider les patterns de sécurité (pas de eval(), innerHTML, etc.)
- Contrôler les imports externes

### Agent: Build Validation
**À exécuter avant chaque commit:**
```bash
npm run build
npm test
```
- Compiler le projet complet
- Exécuter tous les tests unitaires
- Vérifier la couverture de code (minimum 80%)
- Confirmer aucune régression

### Agent: Architecture Check
**À exécuter lors de refactoring majeur:**
- Vérifier la cohérence des interfaces
- Valider les patterns utilisés (Factory, Strategy, etc.)
- Contrôler les dépendances circulaires
- Assurer la séparation des responsabilités

### Agent: Performance Check
**À exécuter après optimisations:**
- Mesurer les temps de parsing DSTV
- Vérifier l'utilisation mémoire
- Détecter les fuites mémoire (geometry.dispose())
- Optimiser les opérations CSG

## 📋 Workflow Automatisé

1. **Avant de coder:** Lire ce fichier et les TODOs actifs
2. **Pendant le code:** Exécuter Quality Check régulièrement
3. **Avant commit:** Exécuter tous les agents
4. **Après merge:** Vérifier les métriques de performance

## 🎯 Standards de Code

### Architecture Modulaire
```
src/TopSteelCAD/
├── parsers/
│   └── dstv/
│       ├── lexer/
│       ├── parser/
│       ├── converters/
│       └── validators/
├── core/
│   └── features/
│       ├── processors/
│       ├── builders/
│       └── cache/
```

### Conventions
- **Interfaces:** Préfixe `I` (ex: `IFeatureProcessor`)
- **Types:** PascalCase (ex: `NormalizedFeature`)
- **Classes:** PascalCase avec suffixe descriptif (ex: `DSTVLexer`)
- **Méthodes:** camelCase, verbe d'action (ex: `processFeature`)
- **Constantes:** UPPER_SNAKE_CASE

### Patterns à Utiliser
- **Factory Pattern:** Pour création de processors
- **Strategy Pattern:** Pour variantes de traitement
- **Builder Pattern:** Pour objets complexes
- **Registry Pattern:** Pour enregistrement dynamique
- **Cache Pattern:** Pour optimisation performance

## ⚠️ Points d'Attention

### Sécurité
- Ne jamais utiliser `eval()` ou `Function()`
- Valider toutes les entrées utilisateur
- Sanitizer les chemins de fichiers
- Limiter la taille des fichiers parsés

### Performance
- Disposer les géométries Three.js après usage
- Utiliser le cache pour géométries répétitives
- Batching des opérations similaires
- Lazy loading des modules lourds

### Maintenabilité
- Maximum 200 lignes par fichier
- Maximum 20 lignes par méthode
- Complexité cyclomatique < 10
- Couverture de tests > 80%

## 🧹 Nettoyage

### Fichiers à Supprimer
- Fichiers de test temporaires (.bak, .tmp)
- Duplications de code
- Modules non utilisés
- Commentaires obsolètes

### À Vérifier Régulièrement
```bash
# Trouver les imports inutilisés
npm run lint:unused

# Analyser la taille du bundle
npm run analyze

# Détecter le code dupliqué
npx jscpd src/
```

## 📊 Métriques Cibles

- **Build Time:** < 10 secondes
- **Test Suite:** < 30 secondes
- **Bundle Size:** < 2MB
- **Code Coverage:** > 80%
- **Lighthouse Score:** > 90

## 🔄 Mise à Jour

Ce fichier doit être mis à jour à chaque:
- Ajout de nouveau pattern
- Changement d'architecture
- Nouvelle règle de qualité
- Découverte de best practice

---
*Dernière mise à jour: ${new Date().toISOString().split('T')[0]}*