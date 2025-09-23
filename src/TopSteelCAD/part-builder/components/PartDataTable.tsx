import React, { useState, useMemo } from 'react';
import { PartElement, PartTableColumn } from '../types/partBuilder.types';

interface PartDataTableProps {
  elements: PartElement[];
  selectedElementId: string | null;
  onSelectElement: (elementId: string | null) => void;
  onUpdateElement: (elementId: string, field: keyof PartElement, value: any) => void;
  onDeleteElement: (elementId: string) => void;
  onDuplicateElement: (elementId: string) => void;
  onShowDetail: (elementId: string) => void;
  onShow3D: (elementId: string) => void;
  sortBy: keyof PartElement | null;
  sortOrder: 'asc' | 'desc';
  onSort: (column: keyof PartElement) => void;
}

export const PartDataTable: React.FC<PartDataTableProps> = ({
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onShowDetail,
  onShow3D,
  sortBy,
  sortOrder,
  onSort
}) => {
  const [editingCell, setEditingCell] = useState<{ elementId: string; field: string } | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Formatage des trous pour l'affichage (ex: "A.2xD10, B.5xD20")
  const formatHolesDisplay = (element: PartElement): string => {
    const holesGrouped = element.holes.reduce((acc, hole) => {
      const key = `${hole.label}-${hole.diameter}`;
      if (!acc[key]) {
        acc[key] = { label: hole.label, diameter: hole.diameter, count: 0 };
      }
      acc[key].count++;
      return acc;
    }, {} as Record<string, { label: string; diameter: number; count: number }>);

    return Object.values(holesGrouped)
      .map(group => `${group.label}.${group.count}xD${group.diameter}`)
      .join(', ');
  };

  // Formatage des coordonnées DSTV avec face
  const formatDSTVCoordinates = (element: PartElement): string => {
    return element.holes
      .map(hole => `<${hole.label} face='${hole.coordinates.face}' x='${hole.coordinates.x}' y='${hole.coordinates.y}' d='${hole.diameter}'/>`)
      .join(' ');
  };


  // Bibliothèque de profils (importée du parent ou définie localement)
  const PROFILE_TYPES = ['IPE', 'HEA', 'HEB', 'HEM', 'UPN', 'UAP', 'L', 'TUBES_RECT', 'TUBES_CARRE', 'TUBES_ROND'];
  const MATERIALS = ['S235', 'S275', 'S355', 'S420', 'S460'];

  const PROFILE_SECTIONS: Record<string, string[]> = {
    IPE: ['80', '100', '120', '140', '160', '180', '200', '220', '240', '270', '300', '330', '360', '400', '450', '500'],
    HEA: ['100', '120', '140', '160', '180', '200', '220', '240', '260', '280', '300', '320', '340', '360', '400'],
    HEB: ['100', '120', '140', '160', '180', '200', '220', '240', '260', '280', '300', '320', '340', '360', '400'],
    HEM: ['100', '120', '140', '160', '180', '200', '220', '240', '260', '280', '300'],
    UPN: ['50', '65', '80', '100', '120', '140', '160', '180', '200', '220', '240', '260', '280', '300'],
    UAP: ['80', '100', '130', '150', '175', '200', '220', '250', '300'],
    L: ['20x20x3', '30x30x3', '40x40x4', '50x50x5', '60x60x6', '70x70x7', '80x80x8', '90x90x9', '100x100x10'],
    TUBES_RECT: ['40x20x2', '50x30x3', '60x40x3', '80x40x3', '100x50x4', '120x60x4', '140x80x5', '150x100x5'],
    TUBES_CARRE: ['20x20x2', '30x30x3', '40x40x3', '50x50x3', '60x60x4', '80x80x4', '100x100x5'],
    TUBES_ROND: ['21.3x2', '26.9x2', '33.7x2.6', '42.4x2.6', '48.3x2.9', '60.3x2.9', '76.1x2.9', '88.9x3.2']
  };

  // Configuration des colonnes
  const columns: PartTableColumn[] = [
    { key: 'reference', label: 'Repère', width: '100px', sortable: true, editable: true },
    { key: 'designation', label: 'Désignation', width: '200px', sortable: true, editable: true },
    { key: 'quantity', label: 'Qté', width: '60px', sortable: true, editable: true },
    { key: 'profileType', label: 'Type', width: '100px', sortable: true, editable: true },
    { key: 'profileSubType', label: 'Section', width: '120px', sortable: false, editable: true },
    { key: 'length', label: 'Long. (mm)', width: '100px', sortable: true, editable: true },
    { key: 'material', label: 'Matériau', width: '100px', sortable: true, editable: true },
    {
      key: 'holesDisplay',
      label: 'Trous',
      width: '150px',
      render: (element) => formatHolesDisplay(element)
    },
    {
      key: 'dstvCoordinates',
      label: 'Coordonnées DSTV',
      width: 'auto',
      render: (element) => {
        const fullDSTV = formatDSTVCoordinates(element);
        return (
          <span style={{
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#666',
            display: 'block',
            whiteSpace: 'normal',
            wordBreak: 'break-word'
          }}>
            {fullDSTV || 'Aucun trou'}
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '150px',
      render: (element) => (
        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            onClick={() => onShowDetail(element.id)}
            style={buttonStyle}
            title="Détails et édition des trous"
          >
            📋
          </button>
          <button
            onClick={() => onShow3D(element.id)}
            style={buttonStyle}
            title="Visualisation 3D"
          >
            🎬
          </button>
          <button
            onClick={() => onDuplicateElement(element.id)}
            style={{ ...buttonStyle, backgroundColor: '#f59e0b' }}
            title="Dupliquer"
          >
            📄
          </button>
          <button
            onClick={() => onDeleteElement(element.id)}
            style={{ ...buttonStyle, backgroundColor: '#ef4444' }}
            title="Supprimer"
          >
            🗑️
          </button>
        </div>
      )
    }
  ];

  // Tri des éléments
  const sortedElements = useMemo(() => {
    if (!sortBy) return elements;

    return [...elements].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (aVal === undefined || bVal === undefined) return 0;

      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [elements, sortBy, sortOrder]);

  // Gestion de l'édition de cellule
  const handleCellEdit = (elementId: string, field: string, value: any) => {
    onUpdateElement(elementId, field as keyof PartElement, value);
    setEditingCell(null);
  };

  // Sélection multiple
  const handleSelectAll = () => {
    if (selectedRows.size === elements.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(elements.map(e => e.id)));
    }
  };

  const handleSelectRow = (elementId: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      const newSelection = new Set(selectedRows);
      if (newSelection.has(elementId)) {
        newSelection.delete(elementId);
      } else {
        newSelection.add(elementId);
      }
      setSelectedRows(newSelection);
    } else {
      onSelectElement(elementId);
    }
  };

  // Styles
  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #dee2e6',
    position: 'sticky',
    top: 0,
    zIndex: 10
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 8px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '12px',
    textTransform: 'uppercase',
    color: '#495057',
    userSelect: 'none',
    cursor: 'pointer'
  };

  const tdStyle: React.CSSProperties = {
    padding: '8px',
    borderBottom: '1px solid #e9ecef',
    fontSize: '13px'
  };

  const editableCellStyle: React.CSSProperties = {
    ...tdStyle,
    backgroundColor: '#f8f9fa',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background-color 0.2s'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '4px 8px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background-color 0.2s'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '4px 6px',
    border: '1px solid #ced4da',
    borderRadius: '3px',
    fontSize: '13px'
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '4px 6px',
    border: '1px solid #ced4da',
    borderRadius: '3px',
    fontSize: '13px',
    backgroundColor: 'white'
  };

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead style={headerStyle}>
          <tr>
            <th style={{ ...thStyle, width: '40px' }}>
              <input
                type="checkbox"
                checked={selectedRows.size === elements.length && elements.length > 0}
                onChange={handleSelectAll}
              />
            </th>
            <th style={{ ...thStyle, width: '40px' }}>#</th>
            {columns.map(column => (
              <th
                key={column.key}
                style={{ ...thStyle, width: column.width }}
                onClick={() => column.sortable && onSort(column.key as keyof PartElement)}
              >
                {column.label}
                {sortBy === column.key && (
                  <span style={{ marginLeft: '5px' }}>
                    {sortOrder === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedElements.map((element, index) => (
            <tr
              key={element.id}
              style={{
                backgroundColor: selectedElementId === element.id ? '#e7f3ff' :
                                selectedRows.has(element.id) ? '#f8f9fa' : 'white',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                // Empêcher la propagation si on clique sur un bouton ou une cellule éditable
                const target = e.target as HTMLElement;
                if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'SELECT') {
                  return;
                }
                handleSelectRow(element.id, e);
              }}
            >
              <td style={tdStyle}>
                <input
                  type="checkbox"
                  checked={selectedRows.has(element.id) || selectedElementId === element.id}
                  onChange={(e) => {
                    e.stopPropagation();
                    if (e.target.checked) {
                      onSelectElement(element.id);
                    } else {
                      onSelectElement(null);
                    }
                  }}
                />
              </td>
              <td style={tdStyle}>{index + 1}</td>
              {columns.map(column => (
                <td
                key={column.key}
                style={column.editable ? editableCellStyle : tdStyle}
                onMouseEnter={(e) => {
                  if (column.editable) {
                    e.currentTarget.style.backgroundColor = '#e7f3ff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (column.editable && (!editingCell || editingCell.elementId !== element.id || editingCell.field !== column.key)) {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }
                }}
              >
                  {column.render ? (
                    column.render(element)
                  ) : (column.editable && editingCell?.elementId === element.id && editingCell?.field === column.key) ? (
                    // Mode édition
                    column.key === 'profileType' ? (
                      <select
                        value={element[column.key as keyof PartElement] as string}
                        onChange={(e) => {
                          handleCellEdit(element.id, column.key, e.target.value);
                          // Réinitialiser la section lors du changement de type
                          const newSections = PROFILE_SECTIONS[e.target.value];
                          if (newSections && newSections.length > 0) {
                            handleCellEdit(element.id, 'profileSubType', newSections[0]);
                          }
                        }}
                        onBlur={(e) => {
                          // Ne pas fermer si on clique dans le même select
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setEditingCell(null);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setEditingCell(null);
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setEditingCell(null);
                          }
                        }}
                        autoFocus
                        style={selectStyle}
                      >
                        {PROFILE_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    ) : column.key === 'profileSubType' ? (
                      <select
                        value={element[column.key as keyof PartElement] as string}
                        onChange={(e) => handleCellEdit(element.id, column.key, e.target.value)}
                        onBlur={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setEditingCell(null);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setEditingCell(null);
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setEditingCell(null);
                          }
                        }}
                        autoFocus
                        style={selectStyle}
                      >
                        {PROFILE_SECTIONS[element.profileType]?.map(section => (
                          <option key={section} value={section}>{section}</option>
                        ))}
                      </select>
                    ) : column.key === 'material' ? (
                      <select
                        value={element[column.key as keyof PartElement] as string}
                        onChange={(e) => handleCellEdit(element.id, column.key, e.target.value)}
                        onBlur={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setEditingCell(null);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setEditingCell(null);
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setEditingCell(null);
                          }
                        }}
                        autoFocus
                        style={selectStyle}
                      >
                        {MATERIALS.map(mat => (
                          <option key={mat} value={mat}>{mat}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={column.key === 'quantity' || column.key === 'length' ? 'number' : 'text'}
                        value={element[column.key as keyof PartElement] as string | number}
                        onChange={(e) => {
                          const value = column.key === 'quantity' || column.key === 'length'
                            ? parseFloat(e.target.value) || 0
                            : e.target.value;
                          handleCellEdit(element.id, column.key, value);
                        }}
                        onBlur={(e) => {
                          // Délai pour permettre de cliquer sur d'autres éléments
                          setTimeout(() => {
                            if (!document.activeElement || !e.currentTarget.parentElement?.contains(document.activeElement)) {
                              setEditingCell(null);
                            }
                          }, 100);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const value = column.key === 'quantity' || column.key === 'length'
                              ? parseFloat(e.currentTarget.value) || 0
                              : e.currentTarget.value;
                            handleCellEdit(element.id, column.key, value);
                            setEditingCell(null);
                          }
                          if (e.key === 'Escape') setEditingCell(null);
                        }}
                        autoFocus
                        style={inputStyle}
                      />
                    )
                  ) : (
                    // Mode visualisation avec indication éditable
                    <div
                      onDoubleClick={() => column.editable && setEditingCell({ elementId: element.id, field: column.key })}
                      style={{
                        minHeight: '20px',
                        width: '100%',
                        position: 'relative'
                      }}
                      title={column.editable ? 'Double-cliquez pour éditer' : ''}
                    >
                      {element[column.key as keyof PartElement] as React.ReactNode}
                      {column.editable && (
                        <span style={{
                          position: 'absolute',
                          right: '2px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '10px',
                          color: '#6c757d',
                          opacity: 0.5
                        }}>✏️</span>
                      )}
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {elements.length === 0 && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#6c757d',
          backgroundColor: '#f8f9fa'
        }}>
          Aucun élément à afficher. Cliquez sur "Nouvel élément" pour commencer.
        </div>
      )}
    </div>
  );
};

export default PartDataTable;