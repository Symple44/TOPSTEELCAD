'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { PivotElement, MaterialType, SelectableFeature, FeatureType } from '@/types/viewer';
import { ViewerStore } from '../types';
import { EventBus } from '@/TopSteelCAD/core/EventBus';

interface SceneHierarchyProps {
  store: ViewerStore;
  theme?: 'dark' | 'light';
  onElementSelect?: (id: string) => void;
  onElementVisibilityToggle?: (id: string, visible: boolean) => void;
  onFeatureSelect?: (elementId: string, featureId: string) => void;
  eventBus?: EventBus;
}

interface TreeNode {
  element: PivotElement;
  children: TreeNode[];
  features?: FeatureNode[];
  assemblies?: AssemblyNode[];
  level: number;
  isExpanded: boolean;
}

interface FeatureNode {
  id: string;
  type: string;
  name: string;
  data: any;
  level: number;
  elementId: string;
  selectable?: boolean;
  selected?: boolean;
  highlighted?: boolean;
}

interface AssemblyNode {
  id: string;
  type: string;
  name: string;
  data: any;
  level: number;
}

/**
 * Panneau de hiérarchie moderne avec détails des composants
 */
export const SceneHierarchy: React.FC<SceneHierarchyProps> = ({
  store,
  theme: _theme = 'dark',
  onElementSelect,
  onElementVisibilityToggle,
  onFeatureSelect,
  eventBus
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<MaterialType | 'all'>('all');
  const [showHidden, setShowHidden] = useState(true);
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  // const [_groupBy, _setGroupBy] = useState<'none' | 'type' | 'material'>('type');
  
  // Thème moderne slate
  const themeClasses = {
    bg: 'bg-slate-900/90',
    border: 'border-slate-700',
    text: 'text-slate-100',
    textSecondary: 'text-slate-400',
    input: 'bg-slate-800 text-slate-200 border-slate-600',
    hover: 'hover:bg-slate-700',
    selected: 'bg-blue-600',
    feature: 'text-orange-300',
    assembly: 'text-green-300'
  };
  
  // Générer le nom d'une feature
  const getFeatureName = (feature: any): string => {
    const type = feature.type?.toUpperCase() || feature.featureType;
    
    switch (type) {
      case 'HOLE':
      case FeatureType.HOLE:
        return `Perçage Ø${feature.diameter || 20}mm`;
      case 'TAPPED_HOLE':
      case FeatureType.TAPPED_HOLE:
        return `Trou taraudé M${feature.diameter || 12}`;
      case 'COUNTERSINK':
      case FeatureType.COUNTERSINK:
        return `Fraisage Ø${feature.diameter || 20}mm`;
      case 'SLOT':
      case FeatureType.SLOT:
        return `Oblong ${feature.slottedLength || 30}x${feature.diameter || 10}mm`;
      case 'CUTOUT':
      case FeatureType.CUTOUT:
        return `Découpe ${feature.width || 20}x${feature.length || 20}mm`;
      case 'NOTCH':
      case FeatureType.NOTCH:
        return `Encoche ${feature.width || 15}x${feature.depth || 10}mm`;
      case 'TEXT':
      case 'MARKING':
      case FeatureType.TEXT:
      case FeatureType.MARKING:
        return `Marquage "${feature.text || 'TOPSTEEL'}"`;
      case 'CHAMFER':
      case FeatureType.CHAMFER:
        return `Chanfrein ${feature.size || 5}mm`;
      case 'BEVEL':
      case FeatureType.BEVEL:
        return `Biseau ${feature.angle || 45}°`;
      case 'WELD':
      case FeatureType.WELD:
        return `Soudure ${feature.size || 'a5'}`;
      default:
        return `Feature ${type}`;
    }
  };
  
  // Générer le nom d'un assemblage
  const getAssemblyName = (assembly: any): string => {
    switch (assembly.type) {
      case 'weld':
        return `Soudure ${assembly.size || 'standard'}`;
      case 'bolt':
        return `Boulon M${assembly.diameter || 16}`;
      default:
        return `Assemblage ${assembly.type}`;
    }
  };
  
  // Construire l'arbre hiérarchique avec features et assemblages
  const buildTree = useCallback((): TreeNode[] => {
    const elementMap = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];
    
    // Créer les nœuds avec features et assemblages
    store.elements.forEach(element => {
      const features: FeatureNode[] = [];
      const assemblies: AssemblyNode[] = [];
      
      // Ajouter les features depuis la nouvelle structure
      if (element.features) {
        element.features.forEach((feature: SelectableFeature) => {
          const isSelected = selectedFeatures.has(`${element.id}_${feature.id}`);
          const isHovered = hoveredFeature === `${element.id}_${feature.id}`;
          
          features.push({
            id: feature.id,
            type: feature.type,
            name: getFeatureName(feature),
            data: feature,
            level: 1,
            elementId: element.id,
            selectable: feature.selectable,
            selected: isSelected,
            highlighted: feature.highlighted || isHovered
          });
        });
      }
      
      // Ajouter aussi les features legacy si présentes
      if (element.metadata?.cuttingFeatures) {
        const cuttingFeatures = element.metadata.cuttingFeatures as any[];
        cuttingFeatures.forEach((feature, idx) => {
          const featureId = `legacy-feature-${idx}`;
          const isSelected = selectedFeatures.has(`${element.id}_${featureId}`);
          const isHovered = hoveredFeature === `${element.id}_${featureId}`;
          
          features.push({
            id: featureId,
            type: feature.type,
            name: getFeatureName(feature),
            data: feature,
            level: 1,
            elementId: element.id,
            selectable: true,
            selected: isSelected,
            highlighted: isHovered
          });
        });
      }
      
      // Ajouter les assemblages
      if (element.assemblies) {
        element.assemblies.forEach((assembly, idx) => {
          assemblies.push({
            id: `${element.id}-assembly-${idx}`,
            type: assembly.type,
            name: getAssemblyName(assembly),
            data: assembly,
            level: 1
          });
        });
      }
      
      const node: TreeNode = {
        element,
        children: [],
        features,
        assemblies,
        level: 0,
        isExpanded: expandedNodes.has(element.id)
      };
      elementMap.set(element.id, node);
    });
    
    // Construire les relations parent-enfant
    store.elements.forEach(element => {
      const node = elementMap.get(element.id)!;
      
      if (element.parentId && elementMap.has(element.parentId)) {
        const parent = elementMap.get(element.parentId)!;
        parent.children.push(node);
        node.level = parent.level + 1;
      } else {
        roots.push(node);
      }
    });
    
    return roots;
  }, [store.elements, expandedNodes, selectedFeatures, hoveredFeature]);
  
  // Gérer la sélection de feature
  const handleFeatureClick = (elementId: string, featureId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const featureKey = `${elementId}_${featureId}`;
    const isCtrlPressed = event.ctrlKey || event.metaKey;
    
    if (isCtrlPressed) {
      // Sélection multiple
      const newSelected = new Set(selectedFeatures);
      if (newSelected.has(featureKey)) {
        newSelected.delete(featureKey);
      } else {
        newSelected.add(featureKey);
      }
      setSelectedFeatures(newSelected);
    } else {
      // Sélection simple
      setSelectedFeatures(new Set([featureKey]));
    }
    
    // Notifier via le callback ou l'EventBus
    if (onFeatureSelect) {
      onFeatureSelect(elementId, featureId);
    }
    
    if (eventBus) {
      eventBus.emit('feature:click', {
        elementId,
        featureId,
        event: event.nativeEvent
      });
    }
  };
  
  // Gérer le survol de feature
  const handleFeatureHover = (elementId: string, featureId: string | null) => {
    const featureKey = featureId ? `${elementId}_${featureId}` : null;
    setHoveredFeature(featureKey);
    
    if (eventBus) {
      eventBus.emit('feature:hover', {
        elementId,
        featureId
      });
    }
  };
  
  // Toggle expansion
  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };
  
  // Icône pour les features
  const getFeatureIcon = (type: string): React.JSX.Element => {
    const iconProps = { className: "w-3 h-3", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" };
    
    switch (type?.toUpperCase()) {
      case 'HOLE':
      case FeatureType.HOLE:
        return (
          <svg {...iconProps} className="w-3 h-3 text-cyan-400">
            <circle cx="12" cy="12" r="6" strokeWidth={2} />
          </svg>
        );
      case 'SLOT':
      case FeatureType.SLOT:
        return (
          <svg {...iconProps} className="w-3 h-3 text-purple-400">
            <rect x="6" y="10" width="12" height="4" rx="2" strokeWidth={2} />
          </svg>
        );
      case 'CUTOUT':
      case FeatureType.CUTOUT:
      case 'NOTCH':
      case FeatureType.NOTCH:
        return (
          <svg {...iconProps} className="w-3 h-3 text-orange-400">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
          </svg>
        );
      case 'TEXT':
      case 'MARKING':
      case FeatureType.TEXT:
      case FeatureType.MARKING:
        return (
          <svg {...iconProps} className="w-3 h-3 text-green-400">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'WELD':
      case FeatureType.WELD:
        return (
          <svg {...iconProps} className="w-3 h-3 text-yellow-400">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      default:
        return (
          <svg {...iconProps} className="w-3 h-3 text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m6 0a2 2 0 100-4m0 4a2 2 0 110-4" />
          </svg>
        );
    }
  };
  
  // Icônes pour les types d'éléments
  const getTypeIcon = (type: MaterialType): React.JSX.Element => {
    const iconProps = { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" };
    
    switch (type) {
      case MaterialType.BEAM:
        return (
          <svg {...iconProps} className="w-4 h-4 text-blue-400">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 18h16M9 6v12M15 6v12" />
          </svg>
        );
      case MaterialType.PLATE:
        return (
          <svg {...iconProps} className="w-4 h-4 text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v16H4V4z" />
          </svg>
        );
      case MaterialType.TUBE:
        return (
          <svg {...iconProps} className="w-4 h-4 text-purple-400">
            <circle cx="12" cy="12" r="8" strokeWidth={2} />
          </svg>
        );
      case MaterialType.BOLT:
        return (
          <svg {...iconProps} className="w-4 h-4 text-yellow-400">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4" />
          </svg>
        );
      case MaterialType.WELD:
        return (
          <svg {...iconProps} className="w-4 h-4 text-orange-400">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      default:
        return (
          <svg {...iconProps} className="w-4 h-4 text-slate-400">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v16H4V4z" />
          </svg>
        );
    }
  };
  
  
  // Icônes pour les assemblages
  const getAssemblyIcon = (type: string): React.JSX.Element => {
    const iconProps = { className: "w-3 h-3", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" };
    
    switch (type) {
      case 'weld':
        return (
          <svg {...iconProps} className="w-3 h-3 text-orange-400">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'bolt':
        return (
          <svg {...iconProps} className="w-3 h-3 text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4" />
          </svg>
        );
      default:
        return (
          <svg {...iconProps} className="w-3 h-3 text-green-400">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l4-4a4 4 0 000-5.656z" />
          </svg>
        );
    }
  };
  
  // Fonction pour zoomer vers un élément ou sous-élément
  const focusOnElement = (elementId: string, subItemPosition?: [number, number, number]) => {
    onElementSelect?.(elementId);
    
    // Si on a une position spécifique (feature/assemblage), zoomer dessus
    if (subItemPosition && store.focusOnPosition) {
      store.focusOnPosition(subItemPosition);
    } else if (store.fitToElement) {
      // Sinon zoomer sur l'élément complet
      store.fitToElement(elementId);
    }
  };

  // Rendre un élément de l'arbre avec features et assemblages
  const renderTreeNode = (node: TreeNode): React.JSX.Element => {
    const element = node.element;
    const isSelected = store.selectedElementId === element.id;
    const isHidden = store.hiddenElementIds.has(element.id);
    const isIsolated = store.isolatedElementIds.size > 0 && !store.isolatedElementIds.has(element.id);
    const hasChildren = node.children.length > 0;
    const hasFeatures = node.features && node.features.length > 0;
    const hasAssemblies = node.assemblies && node.assemblies.length > 0;
    const hasSubItems = hasChildren || hasFeatures || hasAssemblies;
    
    return (
      <div key={element.id}>
        {/* Élément principal */}
        <div
          className={`flex items-center px-2 py-1.5 cursor-pointer transition-colors ${
            isSelected ? themeClasses.selected + ' text-white' : themeClasses.hover
          } ${isHidden || isIsolated ? 'opacity-50' : ''}`}
          style={{ paddingLeft: `${node.level * 16 + 8}px` }}
          onClick={() => focusOnElement(element.id)}
        >
          {/* Expand/Collapse */}
          {hasSubItems && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(element.id);
              }}
              className="mr-2 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <svg
                className={`w-3 h-3 transition-transform ${
                  node.isExpanded ? 'rotate-90' : ''
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
          
          {/* Icône du type */}
          <div className="mr-3" style={{ marginLeft: hasSubItems ? 0 : '20px' }}>
            {getTypeIcon(element.materialType)}
          </div>
          
          {/* Nom et détails */}
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium truncate ${themeClasses.text}`}>
              {element.name}
            </div>
            {element.description && (
              <div className={`text-xs truncate ${themeClasses.textSecondary}`}>
                {element.description}
              </div>
            )}
          </div>
          
          {/* Compteurs de sous-éléments */}
          <div className="flex items-center space-x-1 mr-2">
            {hasFeatures && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-orange-600/20 text-orange-300">
                {node.features!.length}
              </span>
            )}
            {hasAssemblies && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-600/20 text-green-300">
                {node.assemblies!.length}
              </span>
            )}
          </div>
          
          {/* Visibilité */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onElementVisibilityToggle?.(element.id, isHidden);
            }}
            className={`p-1 rounded ${themeClasses.hover} transition-colors`}
          >
            {isHidden ? (
              <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        
        {/* Sous-éléments expandés - Hauteur limitée globalement */}
        {node.isExpanded && (
          <div className="max-h-80 overflow-y-auto" style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#475569 #1e293b'
          }}>
            {/* Features (perçages, découpes, etc.) - Cliquables avec zoom et scroll limité */}
            {hasFeatures && (
              <div className="relative">
                <div className="max-h-60 overflow-y-auto" style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#475569 #1e293b'
                }}>
                  {node.features!.map((feature) => (
                  <div
                    key={feature.id}
                    className={`flex items-center px-2 py-1 text-xs cursor-pointer transition-colors ${
                      feature.selected 
                        ? 'bg-green-600/30 text-green-300 hover:bg-green-600/40'
                        : feature.highlighted
                        ? 'bg-yellow-600/20 text-yellow-300 hover:bg-yellow-600/30'
                        : `${themeClasses.feature} bg-slate-800/30 hover:bg-slate-700/50`
                    }`}
                    style={{ paddingLeft: `${(node.level + 1) * 16 + 8}px` }}
                    onClick={(e) => handleFeatureClick(feature.elementId, feature.id, e)}
                    onMouseEnter={() => handleFeatureHover(feature.elementId, feature.id)}
                    onMouseLeave={() => handleFeatureHover(feature.elementId, null)}
                    title={`${feature.name} - ${feature.selected ? 'Sélectionné' : 'Cliquer pour sélectionner'} (Ctrl+clic pour sélection multiple)`}
                  >
                    <div className="mr-2 ml-5">
                      {getFeatureIcon(feature.type)}
                    </div>
                    <span className="flex-1">{feature.name}</span>
                    {feature.selectable && (
                      <span className="text-xs mr-2">
                        {feature.selected && (
                          <svg className="w-3 h-3 text-green-400 inline" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                    )}
                    <span className="text-slate-500 text-xs">
                      {feature.data.position ? 
                        `(${Math.round(feature.data.position[0])}, ${Math.round(feature.data.position[1])}, ${Math.round(feature.data.position[2])})` : ''}
                    </span>
                  </div>
                  ))}
                </div>
                {/* Indicateur de scroll si plus de 6 features (environ 240px de hauteur) */}
                {node.features!.length > 6 && (
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-800/95 to-transparent pointer-events-none flex items-end justify-center">
                    <span className="text-xs text-slate-300 bg-slate-800/90 px-3 py-1.5 rounded-t border-t border-slate-500 font-medium">
                      {node.features!.length} usinages - Scroll pour voir tout
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* Assemblages - Cliquables avec zoom et scroll limité */}
            {hasAssemblies && (
              <div className="relative">
                <div className="max-h-40 overflow-y-auto" style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#475569 #1e293b'
                }}>
                  {node.assemblies!.map((assembly) => (
                  <div
                    key={assembly.id}
                    className={`flex items-center px-2 py-1 text-xs ${themeClasses.assembly} bg-slate-800/30 cursor-pointer hover:bg-slate-700/50 transition-colors`}
                    style={{ paddingLeft: `${(node.level + 1) * 16 + 8}px` }}
                    onClick={() => {
                      // Zoomer directement sur la position d'assemblage
                      focusOnElement(element.id, assembly.data.position);
                    }}
                    title={`Cliquer pour zoomer sur ${assembly.name}`}
                  >
                    <div className="mr-2 ml-5">
                      {getAssemblyIcon(assembly.type)}
                    </div>
                    <span className="flex-1">{assembly.name}</span>
                    <span className="text-slate-500 text-xs">
                      {assembly.data.position ? 
                        `(${Math.round(assembly.data.position[0])}, ${Math.round(assembly.data.position[1])}, ${Math.round(assembly.data.position[2])})` : ''}
                    </span>
                    {/* Indicateur de zoom */}
                    <svg className="w-3 h-3 ml-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  ))}
                </div>
                {/* Indicateur de scroll si plus de 4 assemblages */}
                {node.assemblies!.length > 4 && (
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-800/95 to-transparent pointer-events-none flex items-end justify-center">
                    <span className="text-xs text-slate-300 bg-slate-800/90 px-3 py-1.5 rounded-t border-t border-slate-500 font-medium">
                      {node.assemblies!.length} assemblages - Scroll pour voir tout
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* Enfants */}
            {hasChildren && node.children.map(child => renderTreeNode(child))}
            
            {/* Indicateur global pour conteneur avec beaucoup d'éléments */}
            {(hasFeatures && node.features!.length > 10) || (hasAssemblies && node.assemblies!.length > 8) ? (
              <div className="sticky bottom-0 left-0 right-0 bg-slate-800/95 border-t border-slate-600 p-2 text-center">
                <span className="text-xs text-slate-300 font-medium">
                  Section limitée à 320px - Utilisez le scroll pour naviguer
                </span>
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  };
  
  // Filtrer les éléments
  const filteredElements = useMemo(() => {
    let filtered = store.elements;
    
    // Filtre par recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(term) ||
        e.description?.toLowerCase().includes(term) ||
        e.partNumber?.toLowerCase().includes(term) ||
        e.id.toLowerCase().includes(term)
      );
    }
    
    // Filtre par type
    if (filterType !== 'all') {
      filtered = filtered.filter(e => e.materialType === filterType);
    }
    
    // Filtre par visibilité
    if (!showHidden) {
      filtered = filtered.filter(e => !store.hiddenElementIds.has(e.id));
    }
    
    return filtered;
  }, [store.elements, store.hiddenElementIds, searchTerm, filterType, showHidden]);

  // Stats
  const stats = {
    total: store.elements.length,
    visible: store.elements.length - store.hiddenElementIds.size,
    selected: store.selectedElementId ? 1 : 0,
    features: store.elements.reduce((acc, el) => acc + (el.metadata?.cuttingFeatures?.length || 0), 0),
    assemblies: store.elements.reduce((acc, el) => acc + (el.assemblies?.length || 0), 0)
  };

  return (
    <div className={`h-full flex flex-col ${themeClasses.bg}`}>
      {/* En-tête amélioré - Hauteur fixe */}
      <div className={`flex-shrink-0 px-4 py-3 border-b ${themeClasses.border} bg-slate-800/50`}>
        <div className="flex items-center justify-between">
          <h3 className={`font-medium text-sm ${themeClasses.text} flex items-center`}>
            <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 21l4-7 4 7" />
            </svg>
            Structure
          </h3>
          <div className="flex items-center space-x-1">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-orange-600/20 text-orange-300">Usinages</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-600/20 text-green-300">Assemblages</span>
          </div>
        </div>
      </div>
      
      {/* Barre de recherche améliorée - Hauteur fixe */}
      <div className={`flex-shrink-0 p-3 border-b ${themeClasses.border}`}>
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher éléments, features..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full px-3 py-2 pl-8 text-sm rounded-lg ${themeClasses.input} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          <svg className="w-4 h-4 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      
      {/* Options de filtre simplifiées - Hauteur fixe */}
      <div className={`flex-shrink-0 px-3 py-2 border-b ${themeClasses.border}`}>
        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className={`flex-1 px-2 py-1 text-xs rounded ${themeClasses.input} focus:outline-none`}
          >
            <option value="all">Tous les types</option>
            <option value={MaterialType.BEAM}>Poutres</option>
            <option value={MaterialType.PLATE}>Plaques</option>
            <option value={MaterialType.TUBE}>Tubes</option>
            <option value={MaterialType.BOLT}>Boulons</option>
            <option value={MaterialType.WELD}>Soudures</option>
          </select>
          <label className="flex items-center gap-1 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
              className="text-blue-600"
            />
            <span className={themeClasses.textSecondary}>Masqués</span>
          </label>
        </div>
      </div>
      
      {/* Liste des éléments avec arbre détaillé - Zone flexible avec scroll strict */}
      <div 
        className="flex-1 min-h-0 overflow-hidden" 
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: '#64748b #334155'
        }}
      >
        <div className="h-full overflow-y-auto">
          <div className="space-y-0.5 px-1 py-1">
            {buildTree().map(node => renderTreeNode(node))}
          </div>
          
          {/* Message si liste vide */}
          {store.elements.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <svg className="w-12 h-12 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
              </svg>
              <h3 className="text-lg font-medium text-slate-300 mb-1">Aucun élément</h3>
              <p className="text-sm text-slate-500">Chargez un modèle pour voir la structure</p>
            </div>
          )}
          
          {/* Message si recherche sans résultat */}
          {store.elements.length > 0 && filteredElements.length === 0 && searchTerm && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <svg className="w-8 h-8 text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-sm text-slate-400">Aucun résultat pour &quot;{searchTerm}&quot;</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Statistiques détaillées - Hauteur fixe */}
      <div className={`flex-shrink-0 px-3 py-2 border-t ${themeClasses.border} text-xs space-y-1`}>
        <div className="flex justify-between">
          <span className={themeClasses.textSecondary}>Éléments: {stats.total}</span>
          <span className={themeClasses.textSecondary}>Visibles: {stats.visible}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-orange-300">Usinages: {stats.features}</span>
          <span className="text-green-300">Assemblages: {stats.assemblies}</span>
        </div>
        {stats.selected > 0 && (
          <div className="text-center">
            <span className="text-blue-300">1 élément sélectionné</span>
          </div>
        )}
      </div>
      
      {/* Actions rapides - Hauteur fixe */}
      <div className={`flex-shrink-0 px-3 py-2 border-t ${themeClasses.border} flex gap-2`}>
        <button
          onClick={() => {
            // Expand all elements to show features
            const allIds = store.elements.map(e => e.id);
            setExpandedNodes(new Set(allIds));
          }}
          className={`flex-1 px-2 py-1 text-xs rounded ${themeClasses.hover} transition-colors text-slate-300`}
        >
          Tout déplier
        </button>
        <button
          onClick={() => {
            setExpandedNodes(new Set());
          }}
          className={`flex-1 px-2 py-1 text-xs rounded ${themeClasses.hover} transition-colors text-slate-300`}
        >
          Tout replier
        </button>
      </div>
    </div>
  );
};