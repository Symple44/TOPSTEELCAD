'use client';

import React, { useState } from 'react';
import { PivotElement, MaterialType } from '@/types/viewer';
import { ViewerStore } from '../types';

interface PropertiesPanelProps {
  element?: PivotElement;
  store: ViewerStore;
  theme?: 'dark' | 'light';
  onUpdate?: (updates: Partial<PivotElement>) => void;
}

/**
 * Panneau de propriétés pour afficher et éditer les informations d'un élément
 */
export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  element,
  store: _store,
  theme = 'dark',
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValues, setEditedValues] = useState<Partial<PivotElement>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['general', 'dimensions', 'material'])
  );
  
  const isDark = theme === 'dark';
  const themeClasses = {
    bg: isDark ? 'bg-gray-800' : 'bg-white',
    border: isDark ? 'border-gray-700' : 'border-gray-300',
    text: isDark ? 'text-gray-100' : 'text-gray-900',
    textSecondary: isDark ? 'text-gray-400' : 'text-gray-600',
    input: isDark ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300',
    hover: isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
  };
  
  if (!element) {
    return (
      <div className={`h-full flex items-center justify-center ${themeClasses.bg} ${themeClasses.text}`}>
        <p className={themeClasses.textSecondary}>Aucun élément sélectionné</p>
      </div>
    );
  }
  
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };
  
  const startEdit = () => {
    setIsEditing(true);
    setEditedValues({
      name: element.name,
      description: element.description,
      partNumber: element.partNumber
    });
  };
  
  const cancelEdit = () => {
    setIsEditing(false);
    setEditedValues({});
  };
  
  const saveEdit = () => {
    if (onUpdate) {
      onUpdate(editedValues);
    }
    setIsEditing(false);
    setEditedValues({});
  };
  
  const formatDimension = (value: number | undefined, unit: string = 'mm'): string => {
    if (value === undefined) return '-';
    if (value < 1000) {
      return `${value.toFixed(1)} ${unit}`;
    }
    return `${(value / 1000).toFixed(3)} m`;
  };
  
  const formatWeight = (weight: number | undefined): string => {
    if (!weight) return '-';
    if (weight < 1) {
      return `${(weight * 1000).toFixed(0)} g`;
    }
    if (weight < 1000) {
      return `${weight.toFixed(2)} kg`;
    }
    return `${(weight / 1000).toFixed(3)} t`;
  };
  
  const getMaterialTypeLabel = (type: MaterialType): string => {
    const labels: Record<MaterialType, string> = {
      [MaterialType.PLATE]: 'Plaque',
      [MaterialType.BEAM]: 'Poutre',
      [MaterialType.COLUMN]: 'Colonne',
      [MaterialType.TUBE]: 'Tube',
      [MaterialType.ANGLE]: 'Cornière',
      [MaterialType.CHANNEL]: 'Profil U',
      [MaterialType.TEE]: 'Profil T',
      [MaterialType.BAR]: 'Barre',
      [MaterialType.SHEET]: 'Tôle',
      [MaterialType.BOLT]: 'Boulon',
      [MaterialType.NUT]: 'Écrou',
      [MaterialType.WASHER]: 'Rondelle',
      [MaterialType.BOLT_HEAD]: 'Tête de boulon',
      [MaterialType.WELD]: 'Soudure',
      [MaterialType.ANCHOR_ROD]: 'Tige d\'ancrage',
      [MaterialType.L_ANCHOR]: 'Crosse d\'ancrage',
      [MaterialType.J_ANCHOR]: 'Ancrage en J',
      [MaterialType.LIFTING_EYE]: 'Anneau de levage',
      [MaterialType.SHACKLE]: 'Manille',
      [MaterialType.TURNBUCKLE]: 'Ridoir',
      [MaterialType.BEARING_PAD]: 'Plaque d\'appui',
      [MaterialType.EXPANSION_JOINT]: 'Joint de dilatation',
      [MaterialType.DRAINAGE_SCUPPER]: 'Gargouille',
      [MaterialType.SAFETY_CABLE]: 'Câble de sécurité',
      [MaterialType.CUSTOM]: 'Personnalisé'
    };
    return labels[type] || type;
  };
  
  return (
    <div className={`h-full flex flex-col ${themeClasses.bg}`}>
      {/* En-tête */}
      <div className={`px-4 py-3 border-b ${themeClasses.border} flex items-center justify-between`}>
        <h3 className={`font-semibold ${themeClasses.text}`}>Propriétés</h3>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              onClick={startEdit}
              className={`p-1 rounded ${themeClasses.hover} transition-colors`}
              title="Éditer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          ) : (
            <>
              <button
                onClick={saveEdit}
                className="p-1 text-green-500 hover:text-green-400"
                title="Sauvegarder"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={cancelEdit}
                className="p-1 text-red-500 hover:text-red-400"
                title="Annuler"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Section Général */}
        <div className={`border-b ${themeClasses.border}`}>
          <button
            onClick={() => toggleSection('general')}
            className={`w-full px-4 py-2 flex items-center justify-between ${themeClasses.hover} transition-colors`}
          >
            <span className={`text-sm font-medium ${themeClasses.text}`}>Général</span>
            <svg 
              className={`w-4 h-4 transition-transform ${expandedSections.has('general') ? 'rotate-90' : ''}`}
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          
          {expandedSections.has('general') && (
            <div className="px-4 py-3 space-y-2">
              <div>
                <label className={`text-xs ${themeClasses.textSecondary}`}>ID</label>
                <p className={`text-sm font-mono ${themeClasses.text}`}>{element.id}</p>
              </div>
              
              <div>
                <label className={`text-xs ${themeClasses.textSecondary}`}>Nom</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedValues.name || element.name}
                    onChange={(e) => setEditedValues({ ...editedValues, name: e.target.value })}
                    className={`w-full px-2 py-1 text-sm rounded ${themeClasses.input} focus:outline-none focus:border-blue-500`}
                  />
                ) : (
                  <p className={`text-sm ${themeClasses.text}`}>{element.name}</p>
                )}
              </div>
              
              <div>
                <label className={`text-xs ${themeClasses.textSecondary}`}>Description</label>
                {isEditing ? (
                  <textarea
                    value={editedValues.description || element.description || ''}
                    onChange={(e) => setEditedValues({ ...editedValues, description: e.target.value })}
                    className={`w-full px-2 py-1 text-sm rounded ${themeClasses.input} focus:outline-none focus:border-blue-500 resize-none`}
                    rows={2}
                  />
                ) : (
                  <p className={`text-sm ${themeClasses.text}`}>{element.description || '-'}</p>
                )}
              </div>
              
              <div>
                <label className={`text-xs ${themeClasses.textSecondary}`}>Type</label>
                <p className={`text-sm ${themeClasses.text}`}>{getMaterialTypeLabel(element.materialType)}</p>
              </div>
              
              {/* Afficher le type de profil si disponible */}
              {element.metadata?.profileName && (
                <div>
                  <label className={`text-xs ${themeClasses.textSecondary}`}>Profil</label>
                  <p className={`text-sm ${themeClasses.text} font-medium`}>{element.metadata.profileName}</p>
                </div>
              )}
              
              <div>
                <label className={`text-xs ${themeClasses.textSecondary}`}>Référence</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedValues.partNumber || element.partNumber || ''}
                    onChange={(e) => setEditedValues({ ...editedValues, partNumber: e.target.value })}
                    className={`w-full px-2 py-1 text-sm rounded ${themeClasses.input} focus:outline-none focus:border-blue-500`}
                  />
                ) : (
                  <p className={`text-sm ${themeClasses.text}`}>{element.partNumber || '-'}</p>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Section Dimensions */}
        <div className={`border-b ${themeClasses.border}`}>
          <button
            onClick={() => toggleSection('dimensions')}
            className={`w-full px-4 py-2 flex items-center justify-between ${themeClasses.hover} transition-colors`}
          >
            <span className={`text-sm font-medium ${themeClasses.text}`}>Dimensions</span>
            <svg 
              className={`w-4 h-4 transition-transform ${expandedSections.has('dimensions') ? 'rotate-90' : ''}`}
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          
          {expandedSections.has('dimensions') && (
            <div className="px-4 py-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-xs ${themeClasses.textSecondary}`}>Longueur</label>
                  <p className={`text-sm ${themeClasses.text}`}>
                    {formatDimension(element.dimensions.length)}
                  </p>
                </div>
                
                <div>
                  <label className={`text-xs ${themeClasses.textSecondary}`}>Largeur</label>
                  <p className={`text-sm ${themeClasses.text}`}>
                    {formatDimension(element.dimensions.width)}
                  </p>
                </div>
                
                {element.dimensions.height && (
                  <div>
                    <label className={`text-xs ${themeClasses.textSecondary}`}>Hauteur</label>
                    <p className={`text-sm ${themeClasses.text}`}>
                      {formatDimension(element.dimensions.height)}
                    </p>
                  </div>
                )}
                
                {element.dimensions.thickness && (
                  <div>
                    <label className={`text-xs ${themeClasses.textSecondary}`}>Épaisseur</label>
                    <p className={`text-sm ${themeClasses.text}`}>
                      {formatDimension(element.dimensions.thickness)}
                    </p>
                  </div>
                )}
                
                {element.dimensions.diameter && (
                  <div>
                    <label className={`text-xs ${themeClasses.textSecondary}`}>Diamètre</label>
                    <p className={`text-sm ${themeClasses.text}`}>
                      {formatDimension(element.dimensions.diameter)}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Dimensions spécifiques aux profilés */}
              {(element.dimensions.flangeWidth || element.dimensions.webThickness) && (
                <div className="pt-2 border-t border-gray-700">
                  <p className={`text-xs ${themeClasses.textSecondary} mb-2`}>Profilé</p>
                  <div className="grid grid-cols-2 gap-2">
                    {element.dimensions.flangeWidth && (
                      <div>
                        <label className={`text-xs ${themeClasses.textSecondary}`}>Semelle</label>
                        <p className={`text-sm ${themeClasses.text}`}>
                          {formatDimension(element.dimensions.flangeWidth)}
                        </p>
                      </div>
                    )}
                    
                    {element.dimensions.webThickness && (
                      <div>
                        <label className={`text-xs ${themeClasses.textSecondary}`}>Âme</label>
                        <p className={`text-sm ${themeClasses.text}`}>
                          {formatDimension(element.dimensions.webThickness)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Section Matériau */}
        <div className={`border-b ${themeClasses.border}`}>
          <button
            onClick={() => toggleSection('material')}
            className={`w-full px-4 py-2 flex items-center justify-between ${themeClasses.hover} transition-colors`}
          >
            <span className={`text-sm font-medium ${themeClasses.text}`}>Matériau</span>
            <svg 
              className={`w-4 h-4 transition-transform ${expandedSections.has('material') ? 'rotate-90' : ''}`}
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          
          {expandedSections.has('material') && element.material && (
            <div className="px-4 py-3 space-y-2">
              <div>
                <label className={`text-xs ${themeClasses.textSecondary}`}>Nuance</label>
                <p className={`text-sm ${themeClasses.text}`}>{element.material.grade}</p>
              </div>
              
              <div>
                <label className={`text-xs ${themeClasses.textSecondary}`}>Densité</label>
                <p className={`text-sm ${themeClasses.text}`}>{element.material.density} kg/m³</p>
              </div>
              
              <div>
                <label className={`text-xs ${themeClasses.textSecondary}`}>Couleur</label>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded border border-gray-600"
                    style={{ backgroundColor: element.material.color }}
                  />
                  <p className={`text-sm font-mono ${themeClasses.text}`}>{element.material.color}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Section Calculs */}
        <div className={`border-b ${themeClasses.border}`}>
          <button
            onClick={() => toggleSection('calculations')}
            className={`w-full px-4 py-2 flex items-center justify-between ${themeClasses.hover} transition-colors`}
          >
            <span className={`text-sm font-medium ${themeClasses.text}`}>Calculs</span>
            <svg 
              className={`w-4 h-4 transition-transform ${expandedSections.has('calculations') ? 'rotate-90' : ''}`}
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          
          {expandedSections.has('calculations') && (
            <div className="px-4 py-3 space-y-2">
              <div>
                <label className={`text-xs ${themeClasses.textSecondary}`}>Poids</label>
                <p className={`text-sm ${themeClasses.text}`}>{formatWeight(element.weight)}</p>
              </div>
              
              {element.volume && (
                <div>
                  <label className={`text-xs ${themeClasses.textSecondary}`}>Volume</label>
                  <p className={`text-sm ${themeClasses.text}`}>
                    {element.volume < 0.001 
                      ? `${(element.volume * 1e9).toFixed(0)} mm³`
                      : `${element.volume.toFixed(6)} m³`
                    }
                  </p>
                </div>
              )}
              
              {element.surface && (
                <div>
                  <label className={`text-xs ${themeClasses.textSecondary}`}>Surface</label>
                  <p className={`text-sm ${themeClasses.text}`}>
                    {element.surface < 1 
                      ? `${(element.surface * 1e6).toFixed(0)} mm²`
                      : `${element.surface.toFixed(3)} m²`
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Section Position */}
        <div className={`border-b ${themeClasses.border}`}>
          <button
            onClick={() => toggleSection('position')}
            className={`w-full px-4 py-2 flex items-center justify-between ${themeClasses.hover} transition-colors`}
          >
            <span className={`text-sm font-medium ${themeClasses.text}`}>Position & Rotation</span>
            <svg 
              className={`w-4 h-4 transition-transform ${expandedSections.has('position') ? 'rotate-90' : ''}`}
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          
          {expandedSections.has('position') && (
            <div className="px-4 py-3 space-y-2">
              <div>
                <label className={`text-xs ${themeClasses.textSecondary}`}>Position (X, Y, Z)</label>
                <p className={`text-sm font-mono ${themeClasses.text}`}>
                  [{element.position[0].toFixed(1)}, {element.position[1].toFixed(1)}, {element.position[2].toFixed(1)}]
                </p>
              </div>
              
              {element.rotation && (
                <div>
                  <label className={`text-xs ${themeClasses.textSecondary}`}>Rotation (°)</label>
                  <p className={`text-sm font-mono ${themeClasses.text}`}>
                    [{(element.rotation[0] * 180 / Math.PI).toFixed(1)}, 
                     {(element.rotation[1] * 180 / Math.PI).toFixed(1)}, 
                     {(element.rotation[2] * 180 / Math.PI).toFixed(1)}]
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};