/**
 * Plugin de mesure pour TopSteelCAD
 * Exemple d'implémentation d'un plugin avec outils et panneaux
 */

import { EnhancedViewerPlugin, PluginContext, PluginConfig } from '../types';
import { ViewerAPI, ToolExtension, PanelExtension, ShortcutExtension } from '../../modes/types';
import { Ruler, Compass, Calculator, Triangle, Square } from 'lucide-react';
import React from 'react';

// Types spécifiques au plugin de mesure
interface MeasurementData {
  id: string;
  type: 'distance' | 'angle' | 'area' | 'volume';
  value: number;
  unit: string;
  points: Array<{ x: number; y: number; z: number }>;
  timestamp: number;
  label?: string;
}

interface MeasurementConfig extends PluginConfig {
  defaultUnit?: 'mm' | 'cm' | 'm' | 'in' | 'ft';
  precision?: number;
  showInViewport?: boolean;
  autoSave?: boolean;
  maxMeasurements?: number;
}

// Composant React pour le panneau de mesures
const MeasurementPanel: React.FC<{ context: PluginContext }> = ({ context }) => {
  const [measurements, setMeasurements] = React.useState<MeasurementData[]>([]);
  const [activeType, setActiveType] = React.useState<string>('distance');
  
  React.useEffect(() => {
    // Charger les mesures sauvegardées
    context.storage.get<MeasurementData[]>('measurements').then(saved => {
      if (saved) {
        setMeasurements(saved);
      }
    });
    
    // Écouter les nouvelles mesures
    const handleNewMeasurement = (data: MeasurementData) => {
      setMeasurements(prev => [...prev, data]);
    };
    
    context.events.on('measurement-added', handleNewMeasurement);
    
    return () => {
      context.events.off('measurement-added', handleNewMeasurement);
    };
  }, [context]);
  
  const clearAllMeasurements = () => {
    setMeasurements([]);
    context.storage.set('measurements', []);
    context.api.clearMeasurements();
  };
  
  const deleteMeasurement = (id: string) => {
    const updated = measurements.filter(m => m.id !== id);
    setMeasurements(updated);
    context.storage.set('measurements', updated);
  };
  
  return React.createElement('div', { className: 'measurement-panel p-4' }, [
    // En-tête du panneau
    React.createElement('div', { 
      key: 'header',
      className: 'flex items-center justify-between mb-4' 
    }, [
      React.createElement('h3', { 
        key: 'title',
        className: 'text-lg font-semibold' 
      }, 'Mesures'),
      React.createElement('button', {
        key: 'clear',
        onClick: clearAllMeasurements,
        className: 'px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600',
        disabled: measurements.length === 0
      }, 'Tout effacer')
    ]),
    
    // Types de mesures
    React.createElement('div', {
      key: 'types',
      className: 'grid grid-cols-2 gap-2 mb-4'
    }, [
      React.createElement('button', {
        key: 'distance',
        onClick: () => {
          setActiveType('distance');
          context.api.startMeasurement('distance');
        },
        className: `p-2 rounded ${activeType === 'distance' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`
      }, 'Distance'),
      React.createElement('button', {
        key: 'angle',
        onClick: () => {
          setActiveType('angle');
          context.api.startMeasurement('angle');
        },
        className: `p-2 rounded ${activeType === 'angle' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`
      }, 'Angle'),
      React.createElement('button', {
        key: 'area',
        onClick: () => {
          setActiveType('area');
          context.api.startMeasurement('area');
        },
        className: `p-2 rounded ${activeType === 'area' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`
      }, 'Surface')
    ]),
    
    // Liste des mesures
    React.createElement('div', { 
      key: 'list',
      className: 'space-y-2' 
    }, measurements.map(measurement => 
      React.createElement('div', {
        key: measurement.id,
        className: 'p-3 bg-gray-100 rounded flex justify-between items-center'
      }, [
        React.createElement('div', { key: 'info' }, [
          React.createElement('div', { 
            key: 'type',
            className: 'font-medium' 
          }, measurement.type.charAt(0).toUpperCase() + measurement.type.slice(1)),
          React.createElement('div', { 
            key: 'value',
            className: 'text-sm text-gray-600' 
          }, `${measurement.value.toFixed(2)} ${measurement.unit}`)
        ]),
        React.createElement('button', {
          key: 'delete',
          onClick: () => deleteMeasurement(measurement.id),
          className: 'text-red-500 hover:text-red-700'
        }, '×')
      ])
    ))
  ]);
};

/**
 * Plugin principal de mesure
 */
export const MeasurementPlugin: EnhancedViewerPlugin = {
  id: 'measurement-plugin',
  name: 'Measurement Tools',
  version: '1.0.0',
  description: 'Outils de mesure avancés pour distance, angle, surface et volume',
  
  metadata: {
    id: 'measurement-plugin',
    name: 'Measurement Tools',
    version: '1.0.0',
    description: 'Outils de mesure avancés pour distance, angle, surface et volume',
    author: 'TopSteel Team',
    category: 'tools',
    keywords: ['measure', 'distance', 'angle', 'area', 'tools'],
    dependencies: []
  },
  
  // Configuration par défaut
  getDefaultConfig(): PluginConfig {
    return {
      enabled: true,
      autoActivate: true,
      settings: {
        defaultUnit: 'mm',
        precision: 2,
        showInViewport: true,
        autoSave: true,
        maxMeasurements: 100
      }
    };
  },
  
  // Validation de la configuration
  validateConfig(config: PluginConfig): boolean {
    if (!config.settings) return true;
    
    const validUnits = ['mm', 'cm', 'm', 'in', 'ft'];
    if (config.settings.defaultUnit && !validUnits.includes(config.settings.defaultUnit)) {
      return false;
    }
    
    if (config.settings.precision && (config.settings.precision < 0 || config.settings.precision > 10)) {
      return false;
    }
    
    return true;
  },
  
  // Hooks du cycle de vie
  async onInit(api: ViewerAPI): Promise<void> {
    console.log('Measurement plugin initialized');
  },
  
  async onActivate(context: PluginContext): Promise<void> {
    context.logger.info('Measurement plugin activated');
    
    // Charger les mesures sauvegardées
    const savedMeasurements = await context.storage.get<MeasurementData[]>('measurements');
    if (savedMeasurements && savedMeasurements.length > 0) {
      context.logger.info(`Loaded ${savedMeasurements.length} saved measurements`);
    }
  },
  
  async onDeactivate(context: PluginContext): Promise<void> {
    context.logger.info('Measurement plugin deactivated');
    context.api.clearMeasurements();
  },
  
  async onConfigChange(newConfig: PluginConfig, oldConfig: PluginConfig): Promise<void> {
    console.log('Measurement plugin config changed:', { newConfig, oldConfig });
  },
  
  // Extensions du plugin
  tools: [
    {
      id: 'measure-distance',
      name: 'Distance',
      icon: Ruler,
      tooltip: 'Mesurer une distance entre deux points',
      group: 'measurement',
      handler: (api: ViewerAPI) => {
        api.startMeasurement('distance');
      }
    },
    {
      id: 'measure-angle',
      name: 'Angle',
      icon: Compass,
      tooltip: 'Mesurer un angle entre trois points',
      group: 'measurement',
      handler: (api: ViewerAPI) => {
        api.startMeasurement('angle');
      }
    },
    {
      id: 'measure-area',
      name: 'Surface',
      icon: Triangle,
      tooltip: 'Calculer la surface d\'une zone',
      group: 'measurement',
      handler: (api: ViewerAPI) => {
        api.startMeasurement('area');
      }
    },
    {
      id: 'calculate-volume',
      name: 'Volume',
      icon: Square,
      tooltip: 'Calculer le volume d\'un élément sélectionné',
      group: 'measurement',
      handler: (api: ViewerAPI) => {
        const selected = api.getSelectedElement();
        if (selected) {
          // Logique de calcul de volume
          console.log('Calculating volume for:', selected);
        }
      }
    },
    {
      id: 'measurement-calculator',
      name: 'Calculatrice',
      icon: Calculator,
      tooltip: 'Calculatrice pour les mesures',
      group: 'measurement',
      handler: (api: ViewerAPI) => {
        // Ouvrir une calculatrice contextuelle
        console.log('Opening measurement calculator');
      }
    }
  ],
  
  panels: [
    {
      id: 'measurements',
      title: 'Mesures',
      icon: Ruler,
      position: 'right',
      component: MeasurementPanel
    }
  ],
  
  shortcuts: [
    {
      key: 'm',
      handler: (api: ViewerAPI) => api.startMeasurement('distance'),
      description: 'Démarrer une mesure de distance'
    },
    {
      key: 'a',
      shift: true,
      handler: (api: ViewerAPI) => api.startMeasurement('angle'),
      description: 'Démarrer une mesure d\'angle'
    },
    {
      key: 'Delete',
      handler: (api: ViewerAPI) => api.clearMeasurements(),
      description: 'Effacer toutes les mesures'
    }
  ],
  
  commands: [
    {
      id: 'clear-measurements',
      name: 'Effacer les mesures',
      description: 'Supprime toutes les mesures de la scène',
      handler: (api: ViewerAPI) => {
        api.clearMeasurements();
      }
    },
    {
      id: 'export-measurements',
      name: 'Exporter les mesures',
      description: 'Exporte toutes les mesures vers un fichier CSV',
      handler: async (api: ViewerAPI, context: PluginContext) => {
        const measurements = await context.storage.get<MeasurementData[]>('measurements');
        if (measurements && measurements.length > 0) {
          // Logique d'export CSV
          console.log('Exporting measurements:', measurements);
        }
      }
    }
  ]
};

export default MeasurementPlugin;