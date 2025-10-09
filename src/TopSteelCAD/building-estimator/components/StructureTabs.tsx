/**
 * Composant d'onglets réutilisable pour naviguer entre structures
 * Building Estimator - TopSteelCAD
 */

import React from 'react';

export interface Structure {
  id: string;
  name: string;
  type: 'main' | 'extension';
  icon?: string;
  parentId?: string;  // Pour afficher la hiérarchie
}

export interface StructureTabsProps {
  structures: Structure[];
  activeStructureId: string;
  onStructureChange: (id: string) => void;
  children: React.ReactNode;
}

export const StructureTabs: React.FC<StructureTabsProps> = ({
  structures,
  activeStructureId,
  onStructureChange,
  children
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Onglets des structures */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #e2e8f0',
        overflowX: 'auto',
        paddingBottom: '0'
      }}>
        {structures.map((structure) => {
          // Déterminer la profondeur et l'icône
          let depth = 0;
          let currentParentId = structure.parentId;
          const parents: string[] = [];

          while (currentParentId) {
            depth++;
            parents.push(currentParentId);
            const parent = structures.find(s => s.id === currentParentId);
            if (parent) {
              currentParentId = parent.parentId;
            } else {
              break;
            }
          }

          // Icône selon la profondeur
          const getIcon = () => {
            if (structure.type === 'main') return '🏢';
            if (depth === 0) return '🏗️';
            if (depth === 1) return '➕';
            if (depth === 2) return '⊕';
            return '⊞';
          };

          const indent = '  '.repeat(depth);
          const isActive = activeStructureId === structure.id;

          return (
            <button
              key={structure.id}
              onClick={() => onStructureChange(structure.id)}
              style={{
                padding: '12px 20px',
                border: 'none',
                borderBottom: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                background: isActive ? '#eff6ff' : 'transparent',
                color: isActive ? '#1e40af' : '#64748b',
                cursor: 'pointer',
                fontWeight: isActive ? '600' : '400',
                fontSize: '0.95rem',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              title={structure.parentId ? `Extension de: ${parents.join(' → ')}` : 'Bâtiment principal'}
            >
              <span>{getIcon()}</span>
              <span>{indent}{structure.name}</span>
            </button>
          );
        })}
      </div>

      {/* Contenu de l'onglet actif */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto'
      }}>
        {children}
      </div>
    </div>
  );
};
