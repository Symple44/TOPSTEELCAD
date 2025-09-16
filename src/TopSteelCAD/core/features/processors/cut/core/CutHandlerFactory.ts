/**
 * CutHandlerFactory.ts - Factory pour la création et gestion des handlers de coupe
 * Gère l'enregistrement, la sélection et l'instanciation des handlers
 */

import { Feature } from '../../../types';
import { PivotElement } from '@/types/viewer';
import { ICutHandler, ICutHandlerFactory } from '../types/ICutHandler';
import { CutType } from '../types/CutTypes';
import { CutTypeDetector } from './CutTypeDetector';
import { monitoringIntegration } from '../monitoring/MonitoringIntegration';
import { configManager } from '../config/ProductionConfig';

// Import des handlers concrets
import { PartialNotchHandler } from '../handlers/PartialNotchHandler';
import { EndCutHandler } from '../handlers/EndCutHandler';
import { ExteriorCutHandler } from '../handlers/ExteriorCutHandler';
import { KontourHandler } from '../handlers/KontourHandler';
import { PlateHandler } from '../handlers/PlateHandler';
import { InteriorCutHandler } from '../handlers/InteriorCutHandler';
import { StraightCutHandler } from '../handlers/StraightCutHandler';
import { AngleCutHandler } from '../handlers/AngleCutHandler';
import { BevelCutHandler } from '../handlers/BevelCutHandler';
import { CompoundCutHandler } from '../handlers/CompoundCutHandler';
import { NotchHandler } from '../handlers/NotchHandler';
import { TransverseCutHandler } from '../handlers/TransverseCutHandler';
import { SlotCutHandler } from '../handlers/SlotCutHandler';
import { CopingCutHandler } from '../handlers/CopingCutHandler';
import { LegacyFallbackHandler } from '../handlers/LegacyFallbackHandler';

/**
 * Factory pour la gestion des handlers de coupe
 */
export class CutHandlerFactory implements ICutHandlerFactory {
  private handlers: Map<string, ICutHandler>;
  private typeHandlerMap: Map<CutType, ICutHandler[]>;
  private typeDetector: CutTypeDetector;
  private defaultHandler: ICutHandler | null;

  constructor() {
    this.handlers = new Map();
    this.typeHandlerMap = new Map();
    this.typeDetector = CutTypeDetector.getInstance();
    this.defaultHandler = null;
    
    // Initialiser le monitoring de production
    monitoringIntegration.initialize();
    
    // Enregistrer les handlers disponibles
    this.registerBuiltInHandlers();
    
    console.log(`🚀 Cut Handler Factory initialized with production monitoring`);
  }

  /**
   * Enregistre les handlers intégrés
   */
  private registerBuiltInHandlers(): void {
    // Enregistrer tous les handlers disponibles
    // Ordre par priorité décroissante
    this.registerHandler(new PartialNotchHandler());  // Priority: 100
    this.registerHandler(new NotchHandler());         // Priority: 95
    this.registerHandler(new EndCutHandler());        // Priority: 90
    this.registerHandler(new CompoundCutHandler());   // Priority: 85
    this.registerHandler(new CopingCutHandler());     // Priority: 80
    this.registerHandler(new BevelCutHandler());      // Priority: 75
    this.registerHandler(new ExteriorCutHandler());   // Priority: 70
    this.registerHandler(new KontourHandler());       // Priority: 68
    this.registerHandler(new PlateHandler());         // Priority: 65
    this.registerHandler(new InteriorCutHandler());   // Priority: 60
    this.registerHandler(new AngleCutHandler());      // Priority: 55
    this.registerHandler(new StraightCutHandler());   // Priority: 50
    this.registerHandler(new TransverseCutHandler()); // Priority: 45
    this.registerHandler(new SlotCutHandler());       // Priority: 40
    
    // Enregistrer le handler de fallback et le définir comme défaut
    const fallbackHandler = new LegacyFallbackHandler();
    this.registerHandler(fallbackHandler);            // Priority: 0
    this.setDefaultHandler(fallbackHandler);
    
    console.log(`✅ Registered ${this.handlers.size} built-in cut handlers`);
  }

  /**
   * Enregistre un nouveau handler
   */
  registerHandler(handler: ICutHandler): void {
    // Wrapper le handler avec le monitoring si activé
    const config = configManager.getConfig();
    const wrappedHandler = config.monitoring.enabled 
      ? monitoringIntegration.wrapHandler(handler)
      : handler;
    
    // Enregistrer par nom
    this.handlers.set(handler.name, wrappedHandler);
    
    // Enregistrer par types supportés
    for (const type of handler.supportedTypes) {
      if (!this.typeHandlerMap.has(type)) {
        this.typeHandlerMap.set(type, []);
      }
      const handlers = this.typeHandlerMap.get(type)!;
      
      // Insérer selon la priorité (plus haute priorité en premier)
      const insertIndex = handlers.findIndex(h => h.priority < wrappedHandler.priority);
      if (insertIndex === -1) {
        handlers.push(wrappedHandler);
      } else {
        handlers.splice(insertIndex, 0, wrappedHandler);
      }
    }
    
    console.log(`✅ Registered cut handler: ${handler.name} for types: ${handler.supportedTypes.join(', ')}`);
  }

  /**
   * Désenregistre un handler
   */
  unregisterHandler(handlerName: string): void {
    const handler = this.handlers.get(handlerName);
    if (!handler) return;
    
    // Retirer de la map principale
    this.handlers.delete(handlerName);
    
    // Retirer de la map par type
    for (const [type, handlers] of this.typeHandlerMap.entries()) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
        if (handlers.length === 0) {
          this.typeHandlerMap.delete(type);
        }
      }
    }
    
    console.log(`❌ Unregistered cut handler: ${handlerName}`);
  }

  /**
   * Définit le handler par défaut (fallback)
   */
  setDefaultHandler(handler: ICutHandler): void {
    this.defaultHandler = handler;
    console.log(`📌 Set default cut handler: ${handler.name}`);
  }

  /**
   * Crée un handler pour un type de coupe donné
   */
  createHandler(type: CutType): ICutHandler | null {
    const handlers = this.typeHandlerMap.get(type);
    if (!handlers || handlers.length === 0) {
      console.warn(`No handler registered for cut type: ${type}`);
      return this.defaultHandler;
    }
    
    // Retourner le handler avec la plus haute priorité
    return handlers[0];
  }

  /**
   * Obtient un handler par son nom
   */
  getHandlerByName(name: string): ICutHandler | null {
    return this.handlers.get(name) || null;
  }

  /**
   * Obtient tous les handlers disponibles
   */
  getAllHandlers(): ICutHandler[] {
    return Array.from(this.handlers.values());
  }

  /**
   * Trouve le meilleur handler pour une feature donnée
   */
  findBestHandler(feature: Feature): ICutHandler | null {
    const element = this.extractElementFromFeature(feature);
    
    // CORRECTION M1002: Vérifier si c'est un pattern M1002 avec cutType forcé
    const forcedCutType = feature.parameters?.cutType;
    if (forcedCutType === 'partial_notches') {
      console.log(`🎯 M1002 FORCED: Using PartialNotchHandler for cutType=${forcedCutType}`);
      // Chercher directement le PartialNotchHandler
      const partialNotchHandler = Array.from(this.typeHandlerMap.values())
        .flat()
        .find(handler => handler.name === 'PartialNotchHandler');
      
      if (partialNotchHandler && partialNotchHandler.canHandle(CutType.CUT_WITH_NOTCHES, feature)) {
        console.log(`✅ Forced handler: ${partialNotchHandler.name} for M1002 pattern`);
        return partialNotchHandler;
      }
    }
    
    // Utiliser le détecteur de type pour identifier le type de coupe
    const cutType = this.typeDetector.detect(feature, element);
    
    console.log(`🔍 Detected cut type: ${cutType} for feature ${feature.id}`);
    
    // Obtenir les handlers pour ce type
    const handlers = this.typeHandlerMap.get(cutType) || [];
    
    // Trouver le premier handler qui peut traiter cette feature
    for (const handler of handlers) {
      if (handler.canHandle(cutType, feature)) {
        console.log(`✅ Handler ${handler.name} can handle feature ${feature.id}`);
        return handler;
      }
    }
    
    // Si aucun handler spécialisé, essayer les handlers génériques
    if (this.defaultHandler && this.defaultHandler.canHandle(cutType, feature)) {
      console.log(`📌 Using default handler ${this.defaultHandler.name} for feature ${feature.id}`);
      return this.defaultHandler;
    }
    
    console.warn(`❌ No handler found for feature ${feature.id} with type ${cutType}`);
    return null;
  }

  /**
   * Trouve tous les handlers capables de traiter une feature
   */
  findCompatibleHandlers(feature: Feature): ICutHandler[] {
    const element = this.extractElementFromFeature(feature);
    const cutType = this.typeDetector.detect(feature, element);
    
    const compatibleHandlers: ICutHandler[] = [];
    
    // Vérifier tous les handlers pour ce type
    const handlers = this.typeHandlerMap.get(cutType) || [];
    for (const handler of handlers) {
      if (handler.canHandle(cutType, feature)) {
        compatibleHandlers.push(handler);
      }
    }
    
    // Ajouter le handler par défaut s'il est compatible
    if (this.defaultHandler && 
        this.defaultHandler.canHandle(cutType, feature) && 
        !compatibleHandlers.includes(this.defaultHandler)) {
      compatibleHandlers.push(this.defaultHandler);
    }
    
    return compatibleHandlers;
  }

  /**
   * Extrait l'élément PivotElement de la feature
   * (Nécessaire car l'élément peut être stocké à différents endroits selon le contexte)
   */
  private extractElementFromFeature(feature: Feature): PivotElement {
    // L'élément peut être dans parameters.element ou parameters directement
    const params = feature.parameters as any;
    
    if (params.element && typeof params.element === 'object') {
      return params.element as PivotElement;
    }
    
    // Créer un élément minimal si non disponible
    return {
      id: 'unknown',
      type: 'profile',
      dimensions: params.dimensions || {
        length: 1000,
        height: 300,
        width: 150,
        webThickness: 10,
        flangeThickness: 15
      }
    } as PivotElement;
  }

  /**
   * Obtient des statistiques sur les handlers enregistrés
   */
  getStatistics(): {
    totalHandlers: number;
    handlersByType: Map<CutType, number>;
    handlersWithHighPriority: string[];
  } {
    const stats = {
      totalHandlers: this.handlers.size,
      handlersByType: new Map<CutType, number>(),
      handlersWithHighPriority: [] as string[]
    };
    
    // Compter les handlers par type
    for (const [type, handlers] of this.typeHandlerMap.entries()) {
      stats.handlersByType.set(type, handlers.length);
    }
    
    // Identifier les handlers avec priorité élevée (>= 80)
    for (const handler of this.handlers.values()) {
      if (handler.priority >= 80) {
        stats.handlersWithHighPriority.push(handler.name);
      }
    }
    
    return stats;
  }

  /**
   * Réinitialise la factory
   */
  reset(): void {
    this.handlers.clear();
    this.typeHandlerMap.clear();
    this.defaultHandler = null;
    
    // Ré-enregistrer les handlers intégrés
    this.registerBuiltInHandlers();
  }

  /**
   * Clone la factory (utile pour les tests)
   */
  clone(): CutHandlerFactory {
    const newFactory = new CutHandlerFactory();
    
    // Copier tous les handlers
    for (const handler of this.handlers.values()) {
      newFactory.registerHandler(handler);
    }
    
    // Copier le handler par défaut
    if (this.defaultHandler) {
      newFactory.setDefaultHandler(this.defaultHandler);
    }
    
    return newFactory;
  }
}

// Singleton pour usage global
let instance: CutHandlerFactory | null = null;

/**
 * Obtient l'instance singleton de la factory
 */
export function getCutHandlerFactory(): CutHandlerFactory {
  if (!instance) {
    instance = new CutHandlerFactory();
  }
  return instance;
}

/**
 * Réinitialise l'instance singleton (utile pour les tests)
 */
export function resetCutHandlerFactory(): void {
  if (instance) {
    instance.reset();
  }
  instance = null;
}