/**
 * Composant TreeView pour gérer la hiérarchie des extensions
 * Permet de visualiser et modifier les rattachements
 * Building Estimator - TopSteelCAD
 */

import React, { useState } from 'react';
import { BuildingExtension, ExtensionAttachmentType } from '../types';
import { getMainBuildingColor, getExtensionColor } from '../utils/extensionColors';

export interface ExtensionTreeViewProps {
  extensions: BuildingExtension[];
  onUpdateExtension: (extensionId: string, updates: Partial<BuildingExtension>) => void;
  onDeleteExtension: (extensionId: string) => void;
  onAddExtension: (extension: BuildingExtension) => void;
}

interface TreeNode {
  id: string;
  name: string;
  type: string;
  extension?: BuildingExtension;
  children: TreeNode[];
  level: number;
}

export const ExtensionTreeView: React.FC<ExtensionTreeViewProps> = ({
  extensions,
  onUpdateExtension,
  onDeleteExtension,
  onAddExtension
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['main']));
  const [editingNode, setEditingNode] = useState<string | null>(null);

  // Construire l'arbre hiérarchique
  const buildTree = (): TreeNode => {
    const root: TreeNode = {
      id: 'main',
      name: 'Bâtiment principal',
      type: 'main',
      children: [],
      level: 0
    };

    const addChildren = (node: TreeNode) => {
      const children = extensions.filter(ext => ext.parentId === (node.extension?.id || undefined));

      node.children = children.map(ext => {
        const childNode: TreeNode = {
          id: ext.id,
          name: ext.name,
          type: ext.type,
          extension: ext,
          children: [],
          level: node.level + 1
        };
        addChildren(childNode);
        return childNode;
      });
    };

    addChildren(root);
    return root;
  };

  const tree = buildTree();

  // Toggle expand/collapse
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // Vérifie si une extension est descendante d'une autre
  const isDescendantOf = (potentialParentId: string, extensionId: string): boolean => {
    const ext = extensions.find(e => e.id === extensionId);
    if (!ext || !ext.parentId) return false;
    if (ext.parentId === potentialParentId) return true;
    return isDescendantOf(potentialParentId, ext.parentId);
  };

  // Rendu d'un noeud
  const renderNode = (node: TreeNode): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const isEditing = editingNode === node.id;
    const isMain = node.id === 'main';

    // Couleur du noeud
    const color = isMain
      ? getMainBuildingColor()
      : getExtensionColor(node.extension!, extensions);

    // Style de la ligne
    const lineStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      padding: '8px 12px',
      marginLeft: `${node.level * 24}px`,
      borderLeft: node.level > 0 ? `3px solid ${color.border}` : 'none',
      backgroundColor: isEditing ? '#f0f9ff' : 'transparent',
      borderRadius: '4px',
      marginBottom: '4px',
      transition: 'all 0.2s'
    };

    return (
      <div key={node.id}>
        <div style={lineStyle}>
          {/* Toggle expand/collapse */}
          {hasChildren && (
            <button
              onClick={() => toggleNode(node.id)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                marginRight: '8px',
                padding: '0',
                width: '20px'
              }}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <span style={{ width: '28px', display: 'inline-block' }}></span>}

          {/* Indicateur de couleur */}
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '2px',
              backgroundColor: color.border,
              marginRight: '8px',
              flexShrink: 0
            }}
          ></span>

          {/* Nom */}
          <span style={{ fontWeight: '600', marginRight: '12px', flex: '0 0 auto' }}>
            {node.name}
          </span>

          {/* Type */}
          <span style={{ fontSize: '0.85rem', color: '#64748b', marginRight: '12px' }}>
            {node.type}
          </span>

          {/* Infos de rattachement (extensions uniquement) */}
          {!isMain && node.extension && (
            <>
              <span style={{ fontSize: '0.85rem', color: '#475569', marginRight: '8px' }}>
                {node.extension.attachmentType === ExtensionAttachmentType.LONG_PAN ? '📏 Long-pan' : '🏠 Pignon'}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#475569', marginRight: '8px' }}>
                {node.extension.side === 'front' ? '⬅️ Avant' :
                 node.extension.side === 'back' ? '➡️ Arrière' :
                 node.extension.side === 'left' ? '⬆️ Gauche' : '⬇️ Droite'}
              </span>
            </>
          )}

          {/* Actions */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            {!isMain && (
              <>
                <button
                  onClick={() => setEditingNode(isEditing ? null : node.id)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.8rem',
                    background: isEditing ? '#2563eb' : '#e2e8f0',
                    color: isEditing ? '#fff' : '#475569',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  {isEditing ? '✓ OK' : '✏️ Éditer'}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Supprimer "${node.name}" et toutes ses extensions filles ?`)) {
                      onDeleteExtension(node.id);
                    }
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.8rem',
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  🗑️
                </button>
              </>
            )}
          </div>
        </div>

        {/* Formulaire d'édition */}
        {isEditing && node.extension && (
          <div style={{
            marginLeft: `${(node.level + 1) * 24}px`,
            padding: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            marginBottom: '8px'
          }}>
            {/* Rattacher à */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px', color: '#475569' }}>
                Rattacher à
              </label>
              <select
                value={node.extension.parentId || ''}
                onChange={(e) => onUpdateExtension(node.id, { parentId: e.target.value || undefined })}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: '0.9rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px'
                }}
              >
                <option value="">🏢 Bâtiment principal</option>
                {extensions
                  .filter(ext => ext.id !== node.id)
                  .map(ext => {
                    const isDescendant = isDescendantOf(node.id, ext.id);
                    return (
                      <option
                        key={ext.id}
                        value={ext.id}
                        disabled={isDescendant}
                        style={{ color: isDescendant ? '#9ca3af' : 'inherit' }}
                      >
                        ➕ {ext.name} {isDescendant ? '(⚠️ fille)' : ''}
                      </option>
                    );
                  })
                }
              </select>
            </div>

            {/* Type d'attachement */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px', color: '#475569' }}>
                Type d'attachement
              </label>
              <select
                value={node.extension.attachmentType}
                onChange={(e) => onUpdateExtension(node.id, { attachmentType: e.target.value as ExtensionAttachmentType })}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: '0.9rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px'
                }}
              >
                <option value={ExtensionAttachmentType.LONG_PAN}>📏 Long-pan</option>
                <option value={ExtensionAttachmentType.GABLE}>🏠 Pignon</option>
              </select>
            </div>

            {/* Côté */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px', color: '#475569' }}>
                Côté rattaché
              </label>
              <select
                value={node.extension.side}
                onChange={(e) => onUpdateExtension(node.id, { side: e.target.value as 'front' | 'back' | 'left' | 'right' })}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: '0.9rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px'
                }}
              >
                <option value="front">⬅️ Avant (front)</option>
                <option value="back">➡️ Arrière (back)</option>
                <option value="left">⬆️ Gauche (left)</option>
                <option value="right">⬇️ Droite (right)</option>
              </select>
            </div>
          </div>
        )}

        {/* Enfants */}
        {isExpanded && node.children.map(child => renderNode(child))}
      </div>
    );
  };

  return (
    <div style={{
      padding: '20px',
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '8px'
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>
        🌳 Hiérarchie des structures
      </h3>
      <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem', color: '#64748b' }}>
        Visualisez et modifiez la hiérarchie des extensions. Cliquez sur "✏️ Éditer" pour modifier le rattachement.
      </p>
      {renderNode(tree)}
    </div>
  );
};
