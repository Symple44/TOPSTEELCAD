import React, { useState } from 'react';
import { PartElement, HoleDSTV, DetailModalProps } from '../types/partBuilder.types';
import { HoleAddingInterface } from './HoleAddingInterface';

export const PartDetailModal: React.FC<DetailModalProps> = ({
  element,
  isOpen,
  onClose,
  onSave,
  onAddHole = (_holes) => {},
  onEditHole = (_id, _hole) => {},
  onDeleteHole = (_id) => {}
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'holes'>('holes');
  const [editedElement, setEditedElement] = useState<PartElement>(element);

  if (!isOpen) return null;

  // Styles
  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  };

  const modalContentStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '1200px',
    height: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
  };

  const headerStyle: React.CSSProperties = {
    padding: '20px',
    backgroundColor: '#2c3e50',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const tabBarStyle: React.CSSProperties = {
    display: 'flex',
    backgroundColor: '#ecf0f1',
    borderBottom: '1px solid #bdc3c7'
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '15px',
    backgroundColor: active ? 'white' : 'transparent',
    border: 'none',
    borderBottom: active ? '3px solid #3498db' : 'none',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: active ? 'bold' : 'normal',
    color: active ? '#2c3e50' : '#7f8c8d',
    transition: 'all 0.3s'
  });

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: activeTab === 'details' ? '20px' : '0'
  };

  const detailsSectionStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  const formGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  };

  const inputGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#7f8c8d',
    marginBottom: '5px',
    fontWeight: '500'
  };

  const inputStyle: React.CSSProperties = {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    transition: 'border-color 0.3s'
  };

  const footerStyle: React.CSSProperties = {
    padding: '20px',
    backgroundColor: '#ecf0f1',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    borderTop: '1px solid #bdc3c7'
  };

  const buttonStyle = (variant: 'primary' | 'secondary' | 'danger'): React.CSSProperties => {
    const colors = {
      primary: { bg: '#3498db', hover: '#2980b9' },
      secondary: { bg: '#95a5a6', hover: '#7f8c8d' },
      danger: { bg: '#e74c3c', hover: '#c0392b' }
    };

    return {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '4px',
      backgroundColor: colors[variant].bg,
      color: 'white',
      fontSize: '14px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'background-color 0.3s'
    };
  };

  const handleSave = () => {
    onSave(editedElement);
    onClose();
  };

  const handleAddHoles = (holes: HoleDSTV[]) => {
    if (onAddHole) {
      onAddHole(holes);
    }
    // Mettre à jour l'élément local
    setEditedElement({
      ...editedElement,
      holes: [...editedElement.holes, ...holes]
    });
  };

  const handleEditHole = (id: string, hole: HoleDSTV) => {
    if (onEditHole) {
      onEditHole(id, hole);
    }
    // Mettre à jour l'élément local
    setEditedElement({
      ...editedElement,
      holes: editedElement.holes.map(h => h.id === id ? hole : h)
    });
  };

  const handleDeleteHole = (id: string) => {
    if (onDeleteHole) {
      onDeleteHole(id);
    }
    // Mettre à jour l'élément local
    setEditedElement({
      ...editedElement,
      holes: editedElement.holes.filter(h => h.id !== id)
    });
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={{ margin: 0 }}>
            {editedElement.reference} - {editedElement.designation}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '28px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        {/* Tab Bar */}
        <div style={tabBarStyle}>
          <button
            style={tabStyle(activeTab === 'details')}
            onClick={() => setActiveTab('details')}
          >
            📋 Détails de la pièce
          </button>
          <button
            style={tabStyle(activeTab === 'holes')}
            onClick={() => setActiveTab('holes')}
          >
            🔩 Configuration des trous ({editedElement.holes.length})
          </button>
        </div>

        {/* Content */}
        <div style={contentStyle}>
          {activeTab === 'details' ? (
            <>
              {/* Informations générales */}
              <div style={detailsSectionStyle}>
                <h3 style={{ marginTop: 0, color: '#2c3e50', marginBottom: '20px' }}>
                  Informations générales
                </h3>
                <div style={formGridStyle}>
                  <div style={inputGroupStyle}>
                    <label style={labelStyle}>Référence</label>
                    <input
                      type="text"
                      value={editedElement.reference}
                      onChange={(e) => setEditedElement({
                        ...editedElement,
                        reference: e.target.value
                      })}
                      style={inputStyle}
                    />
                  </div>
                  <div style={inputGroupStyle}>
                    <label style={labelStyle}>Désignation</label>
                    <input
                      type="text"
                      value={editedElement.designation}
                      onChange={(e) => setEditedElement({
                        ...editedElement,
                        designation: e.target.value
                      })}
                      style={inputStyle}
                    />
                  </div>
                  <div style={inputGroupStyle}>
                    <label style={labelStyle}>Quantité</label>
                    <input
                      type="number"
                      value={editedElement.quantity}
                      onChange={(e) => setEditedElement({
                        ...editedElement,
                        quantity: parseInt(e.target.value) || 1
                      })}
                      min="1"
                      style={inputStyle}
                    />
                  </div>
                  <div style={inputGroupStyle}>
                    <label style={labelStyle}>Statut</label>
                    <select
                      value={editedElement.status || 'draft'}
                      onChange={(e) => setEditedElement({
                        ...editedElement,
                        status: e.target.value as any
                      })}
                      style={inputStyle}
                    >
                      <option value="draft">Brouillon</option>
                      <option value="validated">Validé</option>
                      <option value="production">En production</option>
                      <option value="completed">Terminé</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Profil et dimensions */}
              <div style={detailsSectionStyle}>
                <h3 style={{ marginTop: 0, color: '#2c3e50', marginBottom: '20px' }}>
                  Profil et dimensions
                </h3>
                <div style={formGridStyle}>
                  <div style={inputGroupStyle}>
                    <label style={labelStyle}>Type de profil</label>
                    <input
                      type="text"
                      value={`${editedElement.profileType} ${editedElement.profileSubType}`}
                      disabled
                      style={{ ...inputStyle, backgroundColor: '#ecf0f1' }}
                    />
                  </div>
                  <div style={inputGroupStyle}>
                    <label style={labelStyle}>Longueur (mm)</label>
                    <input
                      type="number"
                      value={editedElement.length}
                      onChange={(e) => setEditedElement({
                        ...editedElement,
                        length: parseFloat(e.target.value) || 0
                      })}
                      style={inputStyle}
                    />
                  </div>
                  <div style={inputGroupStyle}>
                    <label style={labelStyle}>Matériau</label>
                    <select
                      value={editedElement.material}
                      onChange={(e) => setEditedElement({
                        ...editedElement,
                        material: e.target.value
                      })}
                      style={inputStyle}
                    >
                      <option value="S235">S235</option>
                      <option value="S275">S275</option>
                      <option value="S355">S355</option>
                      <option value="S420">S420</option>
                      <option value="S460">S460</option>
                    </select>
                  </div>
                  <div style={inputGroupStyle}>
                    <label style={labelStyle}>Poids (kg)</label>
                    <input
                      type="text"
                      value={editedElement.weight?.toFixed(2) || 'N/A'}
                      disabled
                      style={{ ...inputStyle, backgroundColor: '#ecf0f1' }}
                    />
                  </div>
                </div>
              </div>

              {/* Dimensions du profil */}
              {editedElement.dimensions && (
                <div style={detailsSectionStyle}>
                  <h3 style={{ marginTop: 0, color: '#2c3e50', marginBottom: '20px' }}>
                    Dimensions du profil
                  </h3>
                  <div style={formGridStyle}>
                    {editedElement.dimensions.height && (
                      <div style={inputGroupStyle}>
                        <label style={labelStyle}>Hauteur (mm)</label>
                        <input
                          type="text"
                          value={editedElement.dimensions.height}
                          disabled
                          style={{ ...inputStyle, backgroundColor: '#ecf0f1' }}
                        />
                      </div>
                    )}
                    {editedElement.dimensions.width && (
                      <div style={inputGroupStyle}>
                        <label style={labelStyle}>Largeur (mm)</label>
                        <input
                          type="text"
                          value={editedElement.dimensions.width}
                          disabled
                          style={{ ...inputStyle, backgroundColor: '#ecf0f1' }}
                        />
                      </div>
                    )}
                    {editedElement.dimensions.webThickness && (
                      <div style={inputGroupStyle}>
                        <label style={labelStyle}>Épaisseur âme (mm)</label>
                        <input
                          type="text"
                          value={editedElement.dimensions.webThickness}
                          disabled
                          style={{ ...inputStyle, backgroundColor: '#ecf0f1' }}
                        />
                      </div>
                    )}
                    {editedElement.dimensions.flangeThickness && (
                      <div style={inputGroupStyle}>
                        <label style={labelStyle}>Épaisseur semelle (mm)</label>
                        <input
                          type="text"
                          value={editedElement.dimensions.flangeThickness}
                          disabled
                          style={{ ...inputStyle, backgroundColor: '#ecf0f1' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div style={detailsSectionStyle}>
                <h3 style={{ marginTop: 0, color: '#2c3e50', marginBottom: '20px' }}>
                  Notes et remarques
                </h3>
                <textarea
                  value={editedElement.notes || ''}
                  onChange={(e) => setEditedElement({
                    ...editedElement,
                    notes: e.target.value
                  })}
                  placeholder="Ajoutez des notes ou remarques..."
                  style={{
                    ...inputStyle,
                    width: '100%',
                    minHeight: '100px',
                    resize: 'vertical'
                  }}
                />
              </div>
            </>
          ) : (
            // Interface de configuration des trous
            <HoleAddingInterface
              element={editedElement}
              holes={editedElement.holes}
              onAddHole={handleAddHoles}
              onEditHole={handleEditHole}
              onDeleteHole={handleDeleteHole}
            />
          )}
        </div>

        {/* Footer (seulement pour l'onglet détails) */}
        {activeTab === 'details' && (
          <div style={footerStyle}>
            <button
              onClick={onClose}
              style={buttonStyle('secondary')}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              style={buttonStyle('primary')}
            >
              Enregistrer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartDetailModal;