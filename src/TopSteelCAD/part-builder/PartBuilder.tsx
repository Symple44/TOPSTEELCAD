import React, { useState, useReducer, useRef } from 'react';
import {
  PartElement,
  DisplayMode,
  HoleDSTV,
  PartBuilderState,
  PartBuilderAction
} from './types/partBuilder.types';
import { ProfileDatabase } from '../3DLibrary/database/ProfileDatabase';
import { ProfileType, SteelProfile } from '../3DLibrary/types/profile.types';
import PartDataTable from './components/PartDataTable';
import PartDetailModal from './components/PartDetailModal';
import { ProfessionalViewer } from '../ProfessionalViewer';
import { PivotElement, MaterialType } from '../../types/viewer';
import { exportParts } from './utils/exporters';

// Instance de la base de données des profilés
const profileDB = ProfileDatabase.getInstance();

// Reducer pour gérer l'état
const partBuilderReducer = (state: PartBuilderState, action: PartBuilderAction): PartBuilderState => {
  switch (action.type) {
    case 'ADD_ELEMENT':
      return {
        ...state,
        elements: [...state.elements, action.payload]
      };
    case 'UPDATE_ELEMENT':
      return {
        ...state,
        elements: state.elements.map(el =>
          el.id === action.payload.id ? { ...el, ...action.payload.updates } : el
        )
      };
    case 'DELETE_ELEMENT':
      return {
        ...state,
        elements: state.elements.filter(el => el.id !== action.payload),
        selectedElementId: state.selectedElementId === action.payload ? null : state.selectedElementId
      };
    case 'SELECT_ELEMENT':
      return {
        ...state,
        selectedElementId: action.payload
      };
    case 'SET_DISPLAY_MODE':
      return {
        ...state,
        displayMode: action.payload
      };
    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload }
      };
    case 'SET_SORT':
      return {
        ...state,
        sortBy: action.payload.sortBy,
        sortOrder: action.payload.sortOrder
      };
    case 'BATCH_UPDATE':
      return {
        ...state,
        elements: action.payload
      };
    case 'IMPORT_ELEMENTS':
      return {
        ...state,
        elements: [...state.elements, ...action.payload]
      };
    default:
      return state;
  }
};

// Composant principal
export const PartBuilder: React.FC = () => {
  const initialState: PartBuilderState = {
    elements: [],
    selectedElementId: null,
    displayMode: DisplayMode.LIST,
    filters: {},
    sortBy: null,
    sortOrder: 'asc',
    editingCell: null
  };

  const [state, dispatch] = useReducer(partBuilderReducer, initialState);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [selectedElement3D, setSelectedElement3D] = useState<PartElement | null>(null);
  const [viewerTheme, setViewerTheme] = useState<'light' | 'dark'>('light');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Génération d'un nouvel élément
  const createNewElement = async (): Promise<PartElement> => {
    const id = `el-${Date.now()}`;
    const nextRef = `A${state.elements.length + 1}`;
    const profileType = ProfileType.IPE;
    const profileDesignation = 'IPE 200';

    // Récupérer les dimensions depuis la base de données
    const profile = await profileDB.getProfile(profileDesignation);
    const dimensions = profile ? {
      height: profile.dimensions.height,
      width: profile.dimensions.width,
      webThickness: profile.dimensions.webThickness || 5.6,
      flangeThickness: profile.dimensions.flangeThickness || 8.5
    } : {
      height: 200,
      width: 100,
      webThickness: 5.6,
      flangeThickness: 8.5
    };

    return {
      id,
      reference: nextRef,
      designation: 'Nouvelle pièce',
      quantity: 1,
      profileType: profileType,
      profileSubType: '200',
      length: 3000,
      material: 'S355',
      dimensions,
      holes: [],
      status: 'draft',
      notes: ''
    };
  };

  // Ajout d'un nouvel élément
  const handleAddElement = async () => {
    const newElement = await createNewElement();
    dispatch({ type: 'ADD_ELEMENT', payload: newElement });
    dispatch({ type: 'SELECT_ELEMENT', payload: newElement.id });
  };

  // Mise à jour d'un élément
  const handleUpdateElement = async (elementId: string, field: keyof PartElement, value: any) => {
    const element = state.elements.find(el => el.id === elementId);
    let updates: any = { [field]: value };

    // Si on change le type ou sous-type de profil, mettre à jour les dimensions
    if ((field === 'profileType' || field === 'profileSubType') && element) {
      const profileType = field === 'profileType' ? value : element.profileType;
      const profileSubType = field === 'profileSubType' ? value : element.profileSubType;

      if (profileType && profileSubType) {
        // Récupérer les dimensions depuis la base de données
        const designation = `${profileType} ${profileSubType}`;
        const profile = await profileDB.getProfile(designation);

        if (profile) {
          updates.dimensions = {
            height: profile.dimensions.height,
            width: profile.dimensions.width,
            webThickness: profile.dimensions.webThickness || 10,
            flangeThickness: profile.dimensions.flangeThickness || 15
          };
        }
      }
    }

    dispatch({
      type: 'UPDATE_ELEMENT',
      payload: { id: elementId, updates }
    });
  };

  // Suppression d'un élément
  const handleDeleteElement = (elementId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
      dispatch({ type: 'DELETE_ELEMENT', payload: elementId });
    }
  };

  // Duplication d'un élément
  const handleDuplicateElement = (elementId: string) => {
    const element = state.elements.find(el => el.id === elementId);
    if (element) {
      const newElement = {
        ...element,
        id: `el-${Date.now()}`,
        reference: `${element.reference}-copie`,
        designation: `${element.designation} (copie)`
      };
      dispatch({ type: 'ADD_ELEMENT', payload: newElement });
    }
  };

  // Affichage du détail
  const handleShowDetail = (elementId: string) => {
    dispatch({ type: 'SELECT_ELEMENT', payload: elementId });
    setShowDetailModal(true);
  };

  // Affichage 3D
  const handleShow3D = (elementId: string) => {
    const element = state.elements.find(el => el.id === elementId);
    if (element) {
      setSelectedElement3D(element);
      setShow3DViewer(true);
    }
  };

  // Tri
  const handleSort = (column: keyof PartElement) => {
    const newOrder = state.sortBy === column && state.sortOrder === 'asc' ? 'desc' : 'asc';
    dispatch({
      type: 'SET_SORT',
      payload: { sortBy: column, sortOrder: newOrder }
    });
  };

  // Gestion des trous dans la modale
  const handleAddHole = (holes: HoleDSTV | HoleDSTV[]) => {
    if (state.selectedElementId) {
      const element = state.elements.find(el => el.id === state.selectedElementId);
      if (element) {
        const newHoles = Array.isArray(holes) ? holes : [holes];
        const updatedHoles = [...element.holes, ...newHoles];
        handleUpdateElement(state.selectedElementId, 'holes', updatedHoles);
      }
    }
  };

  const handleEditHole = (holeId: string, hole: HoleDSTV) => {
    if (state.selectedElementId) {
      const element = state.elements.find(el => el.id === state.selectedElementId);
      if (element) {
        const updatedHoles = element.holes.map(h => h.id === holeId ? hole : h);
        handleUpdateElement(state.selectedElementId, 'holes', updatedHoles);
      }
    }
  };

  const handleDeleteHole = (holeId: string) => {
    if (state.selectedElementId) {
      const element = state.elements.find(el => el.id === state.selectedElementId);
      if (element) {
        const updatedHoles = element.holes.filter(h => h.id !== holeId);
        handleUpdateElement(state.selectedElementId, 'holes', updatedHoles);
      }
    }
  };

  // Export
  const handleExport = (format: 'DSTV' | 'CSV' | 'JSON' | 'IFC' | 'STEP') => {
    const partsToExport = state.elements.map(el => ({
      ...el,
      features: {
        holes: el.holes.map(h => ({
          id: h.id,
          type: 'HOLE' as const,
          diameter: h.diameter,
          position: {
            x: h.coordinates.x,
            y: h.coordinates.y,
            z: h.coordinates.z || 0
          },
          face: h.coordinates.face
        })),
        notches: [],
        cuts: []
      }
    }));

    // Utiliser la fonction d'export existante
    exportParts(partsToExport as any, format);
  };

  // Import CSV
  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',');

      const newElements: PartElement[] = lines.slice(1).map((line, index) => {
        const values = line.split(',');
        return {
          id: `el-${Date.now()}-${index}`,
          reference: values[0] || `A${state.elements.length + index + 1}`,
          designation: values[1] || 'Pièce importée',
          quantity: parseInt(values[2]) || 1,
          profileType: values[3] as ProfileType || 'IPE',
          profileSubType: values[4] || '200',
          length: parseFloat(values[5]) || 3000,
          material: values[6] || 'S355',
          holes: [],
          status: 'draft',
          notes: values[7] || ''
        };
      });

      dispatch({ type: 'IMPORT_ELEMENTS', payload: newElements });
    };
    reader.readAsText(file);
  };

  // Élément sélectionné
  const selectedElement = state.elements.find(el => el.id === state.selectedElementId);

  // Styles
  const containerStyle: React.CSSProperties = {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f5f6fa'
  };

  const headerStyle: React.CSSProperties = {
    padding: '20px',
    backgroundColor: 'white',
    borderBottom: '1px solid #dee2e6',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  };

  const toolbarStyle: React.CSSProperties = {
    padding: '15px 20px',
    backgroundColor: 'white',
    borderBottom: '1px solid #dee2e6',
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    alignItems: 'center'
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: state.displayMode === DisplayMode.LIST ? '0' : '20px'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px'
  };

  const toggleButtonStyle = (active: boolean): React.CSSProperties => ({
    ...buttonStyle,
    backgroundColor: active ? '#007bff' : '#6c757d'
  });

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
          🏗️ Part Builder Professional - Système Modulaire
        </h1>
        <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>
          Création et gestion d'éléments métalliques avec support DSTV complet
        </p>
      </div>

      {/* Toolbar */}
      <div style={toolbarStyle}>
        {/* Boutons d'action */}
        <button onClick={handleAddElement} style={{ ...buttonStyle, backgroundColor: '#28a745' }}>
          ➕ Nouvel élément
        </button>

        {/* Modes d'affichage */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '5px' }}>
          <button
            onClick={() => dispatch({ type: 'SET_DISPLAY_MODE', payload: DisplayMode.LIST })}
            style={toggleButtonStyle(state.displayMode === DisplayMode.LIST)}
          >
            📋 Mode Liste
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_DISPLAY_MODE', payload: DisplayMode.EXTENDED })}
            style={toggleButtonStyle(state.displayMode === DisplayMode.EXTENDED)}
          >
            📐 Mode Étendu
          </button>
        </div>

        {/* Export/Import */}
        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ ...buttonStyle, backgroundColor: '#6c757d' }}
          >
            📁 Importer CSV
          </button>
          <select
            onChange={(e) => handleExport(e.target.value as any)}
            style={{
              padding: '8px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
            defaultValue=""
          >
            <option value="" disabled>📤 Exporter...</option>
            <option value="CSV">CSV (Excel)</option>
            <option value="JSON">JSON</option>
            <option value="DSTV">DSTV (NC)</option>
            <option value="IFC">IFC (BIM)</option>
            <option value="STEP">STEP (CAO)</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {state.displayMode === DisplayMode.LIST ? (
          <PartDataTable
            elements={state.elements}
            selectedElementId={state.selectedElementId}
            onSelectElement={(id) => dispatch({ type: 'SELECT_ELEMENT', payload: id })}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
            onDuplicateElement={handleDuplicateElement}
            onShowDetail={handleShowDetail}
            onShow3D={handleShow3D}
            sortBy={state.sortBy}
            sortOrder={state.sortOrder}
            onSort={handleSort}
          />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '20px'
          }}>
            {state.elements.map(element => (
              <div
                key={element.id}
                style={{
                  padding: '20px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: state.selectedElementId === element.id ? '2px solid #007bff' : '1px solid #dee2e6',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => dispatch({ type: 'SELECT_ELEMENT', payload: element.id })}
              >
                <h3 style={{ margin: '0 0 10px 0' }}>
                  {element.reference} - {element.designation}
                </h3>
                <div style={{ fontSize: '14px', color: '#6c757d' }}>
                  <div>Profil: {element.profileType} {element.profileSubType}</div>
                  <div>Longueur: {element.length}mm</div>
                  <div>Quantité: {element.quantity}</div>
                  <div>Matériau: {element.material}</div>
                  <div>Trous: {element.holes.length}</div>
                </div>
                <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShowDetail(element.id);
                    }}
                    style={{ ...buttonStyle, fontSize: '12px', padding: '6px 12px' }}
                  >
                    Détails
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShow3D(element.id);
                    }}
                    style={{ ...buttonStyle, fontSize: '12px', padding: '6px 12px', backgroundColor: '#17a2b8' }}
                  >
                    3D
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '15px 20px',
        backgroundColor: 'white',
        borderTop: '1px solid #dee2e6',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <strong>{state.elements.length}</strong> éléments |
          <strong> {state.elements.reduce((sum, el) => sum + el.quantity, 0)}</strong> pièces totales
        </div>
        <div style={{ fontSize: '12px', color: '#6c757d' }}>
          TopSteelCAD Part Builder v2.0 - Support DSTV complet
        </div>
      </div>

      {/* Modal de détail optimisé */}
      {showDetailModal && selectedElement && (
        <PartDetailModal
          element={selectedElement}
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          onSave={(element) => {
            dispatch({
              type: 'UPDATE_ELEMENT',
              payload: { id: element.id, updates: element }
            });
            setShowDetailModal(false);
          }}
          onAddHole={handleAddHole}
          onEditHole={handleEditHole}
          onDeleteHole={handleDeleteHole}
        />
      )}

      {/* Viewer 3D */}
      {show3DViewer && selectedElement3D && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            width: '90%',
            maxWidth: '1000px',
            height: '80vh'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: 0 }}>
                Visualisation 3D - {selectedElement3D.reference}
              </h2>
              <button
                onClick={() => setShow3DViewer(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>
            <ProfessionalViewer
              elements={[(() => {
                const element: any = {
                id: selectedElement3D.id,
                type: 'beam',
                materialType: MaterialType.BEAM,
                name: `${selectedElement3D.profileType}${selectedElement3D.profileSubType}`,
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                dimensions: {
                  length: selectedElement3D.length,
                  width: selectedElement3D.dimensions?.width || 100,
                  height: selectedElement3D.dimensions?.height || 100,
                  webThickness: selectedElement3D.dimensions?.webThickness || 10,
                  flangeThickness: selectedElement3D.dimensions?.flangeThickness || 15,
                  thickness: selectedElement3D.dimensions?.thickness || 10
                },
                material: {
                  type: 'steel',
                  grade: selectedElement3D.material || 'S355',
                  density: 7850
                },
                profile: {
                  type: selectedElement3D.profileType,
                  subType: selectedElement3D.profileSubType
                },
                // Les features vont dans les deux endroits pour compatibilité
                features: {
                  holes: selectedElement3D.holes.map(h => ({
                    id: h.id,
                    type: 'hole' as const,
                    position: [h.coordinates.x, h.coordinates.y, h.coordinates.z || 0],
                    face: h.coordinates.face,
                    parameters: {
                      diameter: h.diameter,
                      depth: h.isThrough ? 0 : (h.depth || 20),
                      holeType: 'round'
                    }
                  }))
                },
                // IMPORTANT: FeatureApplicator cherche les features dans metadata
                metadata: {
                  features: selectedElement3D.holes.map(h => ({
                    id: h.id,
                    type: 'hole' as const,
                    position: [h.coordinates.x, h.coordinates.y, h.coordinates.z || 0],
                    face: h.coordinates.face,
                    parameters: {
                      diameter: h.diameter,
                      depth: h.isThrough ? 0 : (h.depth || 20),
                      holeType: 'round'
                    }
                  }))
                },
                scale: [1, 1, 1],
                visible: true
              };


              return element;
            })()]}
              theme={viewerTheme}
              onThemeChange={(newTheme) => {
                setViewerTheme(newTheme);
              }}
            />
          </div>
        </div>
      )}

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleImportCSV}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default PartBuilder;