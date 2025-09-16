/**
 * FeatureSelectionEvents - Définition des événements de sélection de features
 * 
 * Ce module centralise tous les événements liés à la sélection et l'interaction
 * avec les features dans le système TopSteelCAD.
 */

import { FeatureType } from '@/types/viewer';

/**
 * Événements de sélection de features
 */
export interface FeatureSelectionEvents {
  // Sélection de features
  'feature:click': {
    elementId: string;
    featureId: string;
    event: MouseEvent;
    ctrlKey?: boolean;
    shiftKey?: boolean;
  };
  
  'feature:hover': {
    elementId: string;
    featureId: string | null;
  };
  
  'feature:selection:changed': {
    features: Array<{
      elementId: string;
      featureId: string;
      type?: FeatureType;
    }>;
    mode?: 'single' | 'multiple' | 'range';
  };
  
  'feature:selection:single': {
    elementId: string;
    featureId: string;
    type?: FeatureType;
    position?: [number, number, number];
  };
  
  'feature:selection:multiple': {
    features: Array<{
      elementId: string;
      featureId: string;
      type?: FeatureType;
    }>;
  };
  
  'feature:selection:none': void;
  
  'feature:selection:cleared': void;
  
  // Surbrillance de features
  'scene:highlightFeature': {
    elementId: string;
    featureId: string;
    highlight: boolean;
    color?: string;
    opacity?: number;
  };
  
  'scene:hoverFeature': {
    elementId: string;
    featureId: string;
    hover: boolean;
    color?: string;
    opacity?: number;
  };
  
  'feature:hover:changed': {
    elementId: string;
    featureId: string;
  } | null;
  
  // Configuration de la sélection
  'feature:selection:enabled': boolean;
  
  'feature:selection:mode': {
    mode: 'element' | 'feature' | 'mixed';
  };
  
  // Actions sur les features
  'feature:focus': {
    elementId: string;
    featureId: string;
    zoomLevel?: number;
  };
  
  'feature:edit': {
    elementId: string;
    featureId: string;
    property?: string;
    value?: any;
  };
  
  'feature:delete': {
    elementId: string;
    featureId: string;
  };
  
  'feature:duplicate': {
    elementId: string;
    featureId: string;
    offset?: [number, number, number];
  };
  
  // Groupes de features
  'feature:group:select': {
    elementId: string;
    groupId: string;
    featureIds: string[];
  };
  
  'feature:group:create': {
    elementId: string;
    groupName: string;
    featureIds: string[];
  };
  
  'feature:group:delete': {
    elementId: string;
    groupId: string;
  };
  
  // Filtrage et visibilité
  'feature:filter': {
    types?: FeatureType[];
    visible?: boolean;
    selectable?: boolean;
  };
  
  'feature:visibility:changed': {
    elementId: string;
    featureId: string;
    visible: boolean;
  };
  
  'feature:type:visibility': {
    type: FeatureType;
    visible: boolean;
  };
  
  // Statistiques et informations
  'feature:count:changed': {
    elementId: string;
    count: number;
    byType: Record<string, number>;
  };
  
  'feature:info:request': {
    elementId: string;
    featureId: string;
  };
  
  'feature:info:response': {
    elementId: string;
    featureId: string;
    type: FeatureType;
    position: [number, number, number];
    parameters: Record<string, any>;
    metadata?: Record<string, any>;
  };
}

/**
 * Type helper pour les noms d'événements
 */
export type FeatureEventName = keyof FeatureSelectionEvents;

/**
 * Type helper pour les données d'événements
 */
export type FeatureEventData<T extends FeatureEventName> = FeatureSelectionEvents[T];

/**
 * Interface pour les listeners d'événements
 */
export interface FeatureEventListener<T extends FeatureEventName> {
  (data: FeatureEventData<T>): void;
}

/**
 * Classe de gestion des événements de features
 */
export class FeatureEventManager {
  private listeners: Map<FeatureEventName, Set<(...args: any[]) => any>> = new Map();
  
  /**
   * Écoute un événement
   */
  on<T extends FeatureEventName>(
    event: T,
    listener: FeatureEventListener<T>
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }
  
  /**
   * Arrête d'écouter un événement
   */
  off<T extends FeatureEventName>(
    event: T,
    listener: FeatureEventListener<T>
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }
  
  /**
   * Émet un événement
   */
  emit<T extends FeatureEventName>(
    event: T,
    data: FeatureEventData<T>
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in feature event listener for ${event}:`, error);
        }
      });
    }
  }
  
  /**
   * Écoute un événement une seule fois
   */
  once<T extends FeatureEventName>(
    event: T,
    listener: FeatureEventListener<T>
  ): void {
    const onceListener = (data: FeatureEventData<T>) => {
      listener(data);
      this.off(event, onceListener as any);
    };
    this.on(event, onceListener as any);
  }
  
  /**
   * Supprime tous les listeners d'un événement
   */
  removeAllListeners(event?: FeatureEventName): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
  
  /**
   * Obtient le nombre de listeners pour un événement
   */
  listenerCount(event: FeatureEventName): number {
    const eventListeners = this.listeners.get(event);
    return eventListeners ? eventListeners.size : 0;
  }
}

/**
 * Instance globale du gestionnaire d'événements
 */
export const featureEventManager = new FeatureEventManager();

/**
 * Helper pour créer un événement de sélection
 */
export function createFeatureSelectionEvent(
  elementId: string,
  featureId: string,
  type?: FeatureType
): FeatureSelectionEvents['feature:selection:single'] {
  return {
    elementId,
    featureId,
    type
  };
}

/**
 * Helper pour créer un événement de surbrillance
 */
export function createFeatureHighlightEvent(
  elementId: string,
  featureId: string,
  highlight: boolean,
  color?: string
): FeatureSelectionEvents['scene:highlightFeature'] {
  return {
    elementId,
    featureId,
    highlight,
    color,
    opacity: highlight ? 1.0 : 0
  };
}