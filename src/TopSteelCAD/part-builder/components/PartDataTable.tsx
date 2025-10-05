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
  const PROFILE_TYPES = [
    'IPE', 'HEA', 'HEB', 'HEM',           // Profilés en I
    'UPN', 'UAP', 'UPE',                   // Profilés en U
    'L', 'LA',                             // Cornières
    'RHS', 'SHS', 'CHS',                   // Tubes
    'T',                                    // Profilé T
    'C', 'Z',                              // Profilés formés à froid
    'FLAT', 'ROUND_BAR', 'SQUARE_BAR'     // Plats et barres
  ];
  const MATERIALS = ['S235', 'S275', 'S355', 'S420', 'S460'];

  const PROFILE_SECTIONS: Record<string, string[]> = {
    // Profilés en I
    IPE: ['80', '100', '120', '140', '160', '180', '200', '220', '240', '270', '300', '330', '360', '400', '450', '500', '550', '600'],
    HEA: ['100', '120', '140', '160', '180', '200', '220', '240', '260', '280', '300', '320', '340', '360', '400', '450', '500', '550', '600', '650', '700', '800', '900', '1000'],
    HEB: ['100', '120', '140', '160', '180', '200', '220', '240', '260', '280', '300', '320', '340', '360', '400', '450', '500', '550', '600', '650', '700', '800', '900', '1000'],
    HEM: ['100', '120', '140', '160', '180', '200', '220', '240', '260', '280', '300', '320', '340', '360', '400', '450', '500', '550', '600', '650', '700', '800', '900', '1000'],

    // Profilés en U
    UPN: ['50', '65', '80', '100', '120', '140', '160', '180', '200', '220', '240', '260', '280', '300', '320', '350', '380', '400'],
    UAP: ['80', '100', '130', '150', '175', '200', '220', '250', '300'],
    UPE: ['80', '100', '120', '140', '160', '180', '200', '220', '240', '270', '300', '330', '360', '400'],

    // Cornières à ailes égales
    L: ['20x20x3', '25x25x3', '25x25x4', '30x30x3', '30x30x4', '35x35x4', '40x40x4', '40x40x5', '45x45x4.5', '50x50x4', '50x50x5', '50x50x6',
        '60x60x5', '60x60x6', '60x60x8', '70x70x6', '70x70x7', '75x75x6', '75x75x8', '80x80x8', '80x80x10',
        '90x90x7', '90x90x9', '100x100x8', '100x100x10', '100x100x12', '120x120x10', '120x120x12', '120x120x13',
        '130x130x12', '150x150x12', '150x150x14', '150x150x15', '160x160x15', '180x180x16', '180x180x18', '200x200x16', '200x200x20'],

    // Cornières à ailes inégales
    LA: ['30x20x3', '40x25x4', '45x30x4.5', '50x30x5', '60x30x5', '60x40x5', '60x40x6', '65x50x5', '70x45x6', '75x50x6', '75x50x8',
         '80x40x6', '80x40x8', '80x60x7', '80x60x8', '90x60x7', '90x60x8', '100x50x6', '100x50x8', '100x50x10', '100x65x7', '100x65x10',
         '100x75x8', '100x75x10', '120x80x8', '120x80x10', '120x80x12', '125x75x8', '125x75x10', '130x65x8', '130x90x10', '150x75x9',
         '150x90x10', '150x90x12', '150x100x10', '150x100x12', '200x100x10', '200x100x12', '200x150x12', '200x150x15'],

    // Tubes rectangulaires
    RHS: ['40x20x2', '40x20x2.5', '40x20x3', '50x25x2.5', '50x25x3', '50x30x2.5', '50x30x3', '60x30x3', '60x40x3', '60x40x4',
          '70x50x3', '80x40x3', '80x40x4', '90x50x3', '100x40x3', '100x50x3', '100x50x4', '100x50x5', '100x60x4', '100x60x5',
          '120x60x4', '120x60x5', '120x80x4', '120x80x5', '140x80x5', '140x80x6', '150x100x5', '150x100x6', '160x80x5', '160x80x6',
          '180x100x5', '180x100x6', '200x100x5', '200x100x6', '200x120x6', '200x120x8', '250x150x6', '250x150x8', '300x200x8', '300x200x10'],

    // Tubes carrés
    SHS: ['20x20x2', '25x25x2', '25x25x2.5', '30x30x2', '30x30x2.5', '30x30x3', '40x40x2.5', '40x40x3', '40x40x4', '50x50x2.5', '50x50x3',
          '50x50x4', '50x50x5', '60x60x3', '60x60x4', '60x60x5', '70x70x3', '70x70x4', '70x70x5', '80x80x3', '80x80x4', '80x80x5',
          '90x90x4', '90x90x5', '100x100x4', '100x100x5', '100x100x6', '120x120x5', '120x120x6', '120x120x8', '140x140x5', '140x140x6',
          '150x150x5', '150x150x6', '150x150x8', '160x160x6', '160x160x8', '180x180x6', '180x180x8', '200x200x6', '200x200x8', '200x200x10'],

    // Tubes circulaires
    CHS: ['21.3x2', '21.3x2.3', '26.9x2', '26.9x2.3', '33.7x2.6', '33.7x3.2', '42.4x2.6', '42.4x3.2', '48.3x2.6', '48.3x2.9', '48.3x3.2',
          '60.3x2.6', '60.3x2.9', '60.3x3.6', '76.1x2.6', '76.1x2.9', '76.1x3.6', '88.9x3.2', '88.9x4', '101.6x3.6', '101.6x4', '114.3x3.6',
          '114.3x4', '114.3x5', '139.7x4', '139.7x5', '139.7x6.3', '168.3x4.5', '168.3x5', '168.3x6.3', '193.7x5', '193.7x6.3', '193.7x8',
          '219.1x5', '219.1x6.3', '219.1x8', '244.5x6.3', '244.5x8', '273x6.3', '273x8', '323.9x8', '323.9x10'],

    // Profilés T
    T: ['40x40x5', '50x50x6', '60x60x6', '70x70x7', '80x80x8', '100x100x10', '120x120x11', '140x140x13'],

    // Profilés C
    C: ['80', '100', '120', '140', '160', '180', '200', '220', '240', '260', '280', '300'],

    // Profilés Z
    Z: ['100', '120', '140', '160', '180', '200', '220', '240', '260', '280', '300'],

    // Plats
    FLAT: ['20x3', '20x4', '20x5', '25x3', '25x4', '25x5', '30x3', '30x4', '30x5', '40x5', '40x6', '40x8', '50x5', '50x6', '50x8', '50x10',
           '60x5', '60x6', '60x8', '60x10', '80x8', '80x10', '100x8', '100x10', '100x12', '120x10', '120x12', '150x10', '150x12', '150x15',
           '200x10', '200x12', '200x15', '200x20'],

    // Barres rondes
    ROUND_BAR: ['8', '10', '12', '14', '16', '18', '20', '22', '25', '28', '30', '32', '35', '40', '45', '50', '60', '70', '80', '90', '100', '110', '120'],

    // Barres carrées
    SQUARE_BAR: ['8', '10', '12', '14', '16', '18', '20', '22', '25', '28', '30', '32', '35', '40', '45', '50', '60', '70', '80', '90', '100']
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