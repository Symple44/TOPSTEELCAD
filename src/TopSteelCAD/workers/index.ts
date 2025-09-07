/**
 * workers/index.ts - Point d'entrée pour le chargement dynamique des WebWorkers
 * Optimise le bundle en chargeant les workers seulement quand nécessaire
 */

/**
 * Chargeur lazy pour le système CSG WebWorker
 */
export const CSGWorkerSystem = {
  /**
   * Charge le gestionnaire de WebWorkers CSG
   */
  async loadManager() {
    const module = await import('../core/features/processors/cut/workers/CSGWorkerManager');
    return module.getCSGWorkerManager();
  },

  /**
   * Charge le service CSG principal avec support WebWorker
   */
  async loadCSGService() {
    const module = await import('../core/features/processors/cut/services/CSGOperationService');
    return module.getCSGService();
  },

  /**
   * Initialise le système WebWorker pour les opérations CSG lourdes
   */
  async initialize() {
    try {
      console.log('🔄 Initializing CSG WebWorker system...');
      
      const manager = await this.loadManager();
      await manager.initialize();
      
      console.log('✅ CSG WebWorker system initialized');
      return manager;
    } catch (error) {
      console.warn('⚠️ Failed to initialize CSG WebWorker system:', error);
      // Fallback gracieux sans workers
      return null;
    }
  },

  /**
   * Obtient les statistiques du système WebWorker
   */
  async getStats() {
    try {
      const service = await this.loadCSGService();
      return service.getServiceStats();
    } catch (error) {
      return null;
    }
  }
};

/**
 * Helper pour précharger les WebWorkers de manière optimisée
 */
export async function preloadCSGWorkers() {
  // Ne précharger qu'en environnement de production/staging
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const shouldPreload = !hostname.includes('localhost') && !hostname.includes('127.0.0.1');
    
    if (shouldPreload) {
      // Précharger après un délai pour ne pas impacter le chargement initial
      setTimeout(() => {
        CSGWorkerSystem.initialize().catch(error => {
          console.debug('CSG WebWorker preload failed:', error);
        });
      }, 3000); // 3 secondes après le chargement
    }
  }
}

export default CSGWorkerSystem;