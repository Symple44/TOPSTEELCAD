/**
 * EventBus - Système d'événements centralisé
 * 
 * Permet la communication découplée entre les différents modules du viewer
 */

type EventHandler<T = any> = (data: T) => void;
type UnsubscribeFn = () => void;

interface EventSubscription {
  id: string;
  handler: EventHandler;
  once: boolean;
}

export class EventBus {
  private static instance: EventBus;
  private events: Map<string, Set<EventSubscription>>;
  private eventIdCounter: number = 0;
  private history: Array<{ event: string; data: any; timestamp: number }> = [];
  private maxHistorySize: number = 100;
  
  constructor() {
    this.events = new Map();
  }
  
  /**
   * Obtient l'instance unique (Singleton)
   */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
  
  /**
   * S'abonne à un événement
   */
  on<T = any>(event: string, handler: EventHandler<T>): UnsubscribeFn {
    const subscription: EventSubscription = {
      id: `sub_${++this.eventIdCounter}`,
      handler,
      once: false,
    };
    
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    
    this.events.get(event)!.add(subscription);
    
    // Retourne une fonction pour se désabonner
    return () => this.off(event, subscription.id);
  }
  
  /**
   * S'abonne à un événement une seule fois
   */
  once<T = any>(event: string, handler: EventHandler<T>): UnsubscribeFn {
    const subscription: EventSubscription = {
      id: `sub_${++this.eventIdCounter}`,
      handler,
      once: true,
    };
    
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    
    this.events.get(event)!.add(subscription);
    
    return () => this.off(event, subscription.id);
  }
  
  /**
   * Se désabonne d'un événement
   */
  off(event: string, subscriptionId: string): void {
    const subscriptions = this.events.get(event);
    if (subscriptions) {
      const toRemove = Array.from(subscriptions).find(s => s.id === subscriptionId);
      if (toRemove) {
        subscriptions.delete(toRemove);
      }
      
      // Nettoyer si plus d'abonnés
      if (subscriptions.size === 0) {
        this.events.delete(event);
      }
    }
  }
  
  /**
   * Émet un événement
   */
  emit<T = any>(event: string, data?: T): void {
    // Ajouter à l'historique
    this.addToHistory(event, data);
    
    // Notifier les abonnés
    const subscriptions = this.events.get(event);
    if (subscriptions) {
      const toExecute = Array.from(subscriptions);
      
      toExecute.forEach(subscription => {
        try {
          subscription.handler(data);
          
          // Retirer si c'était un "once"
          if (subscription.once) {
            subscriptions.delete(subscription);
          }
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error);
        }
      });
      
      // Nettoyer si plus d'abonnés
      if (subscriptions.size === 0) {
        this.events.delete(event);
      }
    }
  }
  
  /**
   * Émet un événement de manière asynchrone
   */
  async emitAsync<T = any>(event: string, data?: T): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.emit(event, data);
        resolve();
      }, 0);
    });
  }
  
  /**
   * Attend qu'un événement soit émis
   */
  waitFor<T = any>(event: string, timeout?: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const unsubscribe = this.once<T>(event, (data) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(data);
      });
      
      let timeoutId: NodeJS.Timeout | undefined;
      if (timeout) {
        timeoutId = setTimeout(() => {
          unsubscribe();
          reject(new Error(`Timeout waiting for event "${event}"`));
        }, timeout);
      }
    });
  }
  
  /**
   * Supprime tous les abonnements pour un événement
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
  
  /**
   * Obtient le nombre d'abonnés pour un événement
   */
  listenerCount(event: string): number {
    return this.events.get(event)?.size || 0;
  }
  
  /**
   * Obtient la liste des événements actifs
   */
  getActiveEvents(): string[] {
    return Array.from(this.events.keys());
  }
  
  /**
   * Ajoute à l'historique des événements
   */
  private addToHistory(event: string, data: any): void {
    this.history.push({
      event,
      data,
      timestamp: Date.now(),
    });
    
    // Limiter la taille de l'historique
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }
  
  /**
   * Obtient l'historique des événements
   */
  getHistory(event?: string): Array<{ event: string; data: any; timestamp: number }> {
    if (event) {
      return this.history.filter(h => h.event === event);
    }
    return [...this.history];
  }
  
  /**
   * Efface l'historique
   */
  clearHistory(): void {
    this.history = [];
  }
  
  /**
   * Nettoie toutes les ressources
   */
  dispose(): void {
    this.events.clear();
    this.history = [];
    this.eventIdCounter = 0;
  }
}

// Export de l'instance globale
export const globalEventBus = EventBus.getInstance();