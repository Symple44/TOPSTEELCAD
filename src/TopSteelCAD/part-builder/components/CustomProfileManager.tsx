/**
 * Gestionnaire de profils personnalisés
 * Interface pour lister, importer, exporter et supprimer des profils personnalisés
 */

import React, { useState, useEffect } from 'react';
import { CustomProfile, CustomProfileExportFormat } from '../../3DLibrary/types/custom-profile.types';
import { getCustomProfileStorage } from '../services/CustomProfileStorage';

interface CustomProfileManagerProps {
  onSelectProfile?: (profile: CustomProfile) => void;
  onClose?: () => void;
}

export const CustomProfileManager: React.FC<CustomProfileManagerProps> = ({
  onSelectProfile,
  onClose
}) => {
  const [profiles, setProfiles] = useState<CustomProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<CustomProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const storage = getCustomProfileStorage();

  // Charger les profils au montage
  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setIsLoading(true);
    try {
      const allProfiles = await storage.list();
      setProfiles(allProfiles);
    } catch (error) {
      console.error('Error loading custom profiles:', error);
      alert('Erreur lors du chargement des profils personnalisés');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrer les profils selon la recherche
  const filteredProfiles = profiles.filter(profile => {
    const query = searchQuery.toLowerCase();
    return (
      profile.name.toLowerCase().includes(query) ||
      profile.designation.toLowerCase().includes(query) ||
      profile.description?.toLowerCase().includes(query) ||
      profile.metadata.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  // Exporter un profil
  const handleExport = async (profile: CustomProfile) => {
    try {
      const exportData = await storage.export(profile.id);
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${profile.designation}.json`;
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting profile:', error);
      alert('Erreur lors de l\'export du profil');
    }
  };

  // Importer un profil
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data: CustomProfileExportFormat = JSON.parse(text);

        const importedProfile = await storage.import(data);
        await loadProfiles();

        alert(`Profil "${importedProfile.name}" importé avec succès!`);
      } catch (error) {
        console.error('Error importing profile:', error);
        alert('Erreur lors de l\'import du profil. Vérifiez le format du fichier.');
      }
    };

    input.click();
  };

  // Supprimer un profil
  const handleDelete = async (profile: CustomProfile) => {
    if (!confirm(`Supprimer le profil "${profile.name}" ?`)) return;

    try {
      await storage.delete(profile.id);
      await loadProfiles();
      if (selectedProfile?.id === profile.id) {
        setSelectedProfile(null);
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      alert('Erreur lors de la suppression du profil');
    }
  };

  // Sélectionner un profil
  const handleSelect = (profile: CustomProfile) => {
    setSelectedProfile(profile);
    if (onSelectProfile) {
      onSelectProfile(profile);
    }
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h2 style={{ margin: 0 }}>Bibliothèque de Profils Personnalisés</h2>
        <button onClick={onClose} style={closeButtonStyle}>×</button>
      </div>

      {/* Toolbar */}
      <div style={toolbarStyle}>
        <input
          type="text"
          placeholder="🔍 Rechercher un profil..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={searchInputStyle}
        />
        <button onClick={handleImport} style={actionButtonStyle}>
          📥 Importer JSON
        </button>
        <button onClick={loadProfiles} style={actionButtonStyle}>
          🔄 Actualiser
        </button>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {/* Liste des profils */}
        <div style={listPanelStyle}>
          <h3 style={panelTitleStyle}>Profils ({filteredProfiles.length})</h3>

          {isLoading ? (
            <div style={emptyStateStyle}>Chargement...</div>
          ) : filteredProfiles.length === 0 ? (
            <div style={emptyStateStyle}>
              {searchQuery ? 'Aucun profil trouvé' : 'Aucun profil personnalisé. Créez-en un avec l\'éditeur 2D!'}
            </div>
          ) : (
            <div style={profileListStyle}>
              {filteredProfiles.map(profile => (
                <div
                  key={profile.id}
                  style={{
                    ...profileCardStyle,
                    ...(selectedProfile?.id === profile.id ? selectedCardStyle : {})
                  }}
                  onClick={() => handleSelect(profile)}
                >
                  <div style={cardHeaderStyle}>
                    <strong>{profile.name}</strong>
                    <span style={designationBadgeStyle}>{profile.designation}</span>
                  </div>
                  {profile.description && (
                    <p style={cardDescriptionStyle}>{profile.description}</p>
                  )}
                  <div style={cardMetaStyle}>
                    <span>📐 {profile.properties.area.toFixed(2)} cm²</span>
                    {profile.weight && (
                      <span>⚖️ {profile.weight.toFixed(2)} kg/m</span>
                    )}
                  </div>
                  {profile.metadata.tags && profile.metadata.tags.length > 0 && (
                    <div style={tagsContainerStyle}>
                      {profile.metadata.tags.map(tag => (
                        <span key={tag} style={tagStyle}>{tag}</span>
                      ))}
                    </div>
                  )}
                  <div style={cardActionsStyle}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExport(profile);
                      }}
                      style={smallButtonStyle}
                      title="Exporter en JSON"
                    >
                      📤 Export
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(profile);
                      }}
                      style={deleteButtonStyle}
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Détails du profil sélectionné */}
        <div style={detailsPanelStyle}>
          <h3 style={panelTitleStyle}>Détails</h3>

          {selectedProfile ? (
            <div style={detailsContentStyle}>
              <div style={detailRowStyle}>
                <strong>Nom:</strong> {selectedProfile.name}
              </div>
              <div style={detailRowStyle}>
                <strong>Désignation:</strong> {selectedProfile.designation}
              </div>
              {selectedProfile.description && (
                <div style={detailRowStyle}>
                  <strong>Description:</strong> {selectedProfile.description}
                </div>
              )}

              <hr style={dividerStyle} />

              <h4 style={sectionTitleStyle}>Propriétés géométriques</h4>
              <div style={detailRowStyle}>
                <strong>Aire:</strong> {selectedProfile.properties.area.toFixed(2)} cm²
              </div>
              <div style={detailRowStyle}>
                <strong>Périmètre:</strong> {selectedProfile.properties.perimeter.toFixed(2)} mm
              </div>
              <div style={detailRowStyle}>
                <strong>Centroïde:</strong> ({selectedProfile.properties.centroid.x.toFixed(1)}, {selectedProfile.properties.centroid.y.toFixed(1)})
              </div>
              {selectedProfile.weight && (
                <div style={detailRowStyle}>
                  <strong>Poids linéique:</strong> {selectedProfile.weight.toFixed(2)} kg/m
                </div>
              )}

              {selectedProfile.referenceDimensions && (
                <>
                  <hr style={dividerStyle} />
                  <h4 style={sectionTitleStyle}>Dimensions</h4>
                  {selectedProfile.referenceDimensions.height && (
                    <div style={detailRowStyle}>
                      <strong>Hauteur:</strong> {selectedProfile.referenceDimensions.height.toFixed(1)} mm
                    </div>
                  )}
                  {selectedProfile.referenceDimensions.width && (
                    <div style={detailRowStyle}>
                      <strong>Largeur:</strong> {selectedProfile.referenceDimensions.width.toFixed(1)} mm
                    </div>
                  )}
                </>
              )}

              <hr style={dividerStyle} />

              <h4 style={sectionTitleStyle}>Métadonnées</h4>
              {selectedProfile.metadata.author && (
                <div style={detailRowStyle}>
                  <strong>Auteur:</strong> {selectedProfile.metadata.author}
                </div>
              )}
              {selectedProfile.metadata.organization && (
                <div style={detailRowStyle}>
                  <strong>Organisation:</strong> {selectedProfile.metadata.organization}
                </div>
              )}
              <div style={detailRowStyle}>
                <strong>Créé le:</strong> {new Date(selectedProfile.metadata.createdAt).toLocaleDateString()}
              </div>
              <div style={detailRowStyle}>
                <strong>Modifié le:</strong> {new Date(selectedProfile.metadata.updatedAt).toLocaleDateString()}
              </div>
              <div style={detailRowStyle}>
                <strong>Version:</strong> {selectedProfile.metadata.version}
              </div>

              <hr style={dividerStyle} />

              <h4 style={sectionTitleStyle}>Géométrie</h4>
              <div style={detailRowStyle}>
                <strong>Segments:</strong> {selectedProfile.shape.outerContour.segments.length}
              </div>
              <div style={detailRowStyle}>
                <strong>Trous:</strong> {selectedProfile.shape.holes?.length || 0}
              </div>
              <div style={detailRowStyle}>
                <strong>Fermé:</strong> {selectedProfile.shape.outerContour.closed ? 'Oui' : 'Non'}
              </div>
            </div>
          ) : (
            <div style={emptyStateStyle}>
              Sélectionnez un profil pour voir les détails
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Styles
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  backgroundColor: '#ecf0f1'
};

const headerStyle: React.CSSProperties = {
  padding: '20px',
  backgroundColor: '#2c3e50',
  color: 'white',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const closeButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'white',
  fontSize: '32px',
  cursor: 'pointer',
  padding: '0 10px'
};

const toolbarStyle: React.CSSProperties = {
  padding: '15px',
  backgroundColor: '#34495e',
  display: 'flex',
  gap: '10px',
  alignItems: 'center'
};

const searchInputStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px',
  border: '1px solid #95a5a6',
  borderRadius: '4px',
  fontSize: '14px'
};

const actionButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: '#3498db',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 'bold'
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  gap: '20px',
  padding: '20px',
  overflow: 'hidden'
};

const listPanelStyle: React.CSSProperties = {
  flex: 2,
  backgroundColor: 'white',
  borderRadius: '8px',
  padding: '20px',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column'
};

const detailsPanelStyle: React.CSSProperties = {
  flex: 1,
  backgroundColor: 'white',
  borderRadius: '8px',
  padding: '20px',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column'
};

const panelTitleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: '15px',
  color: '#2c3e50',
  borderBottom: '2px solid #3498db',
  paddingBottom: '10px'
};

const profileListStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
};

const profileCardStyle: React.CSSProperties = {
  padding: '15px',
  border: '2px solid #ecf0f1',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  backgroundColor: 'white'
};

const selectedCardStyle: React.CSSProperties = {
  borderColor: '#3498db',
  backgroundColor: '#ebf5fb'
};

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px'
};

const designationBadgeStyle: React.CSSProperties = {
  backgroundColor: '#3498db',
  color: 'white',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '12px',
  fontFamily: 'monospace'
};

const cardDescriptionStyle: React.CSSProperties = {
  margin: '8px 0',
  fontSize: '13px',
  color: '#7f8c8d'
};

const cardMetaStyle: React.CSSProperties = {
  display: 'flex',
  gap: '15px',
  fontSize: '12px',
  color: '#95a5a6',
  marginTop: '8px'
};

const tagsContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '5px',
  marginTop: '8px',
  flexWrap: 'wrap'
};

const tagStyle: React.CSSProperties = {
  backgroundColor: '#ecf0f1',
  padding: '3px 8px',
  borderRadius: '3px',
  fontSize: '11px',
  color: '#7f8c8d'
};

const cardActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '5px',
  marginTop: '10px',
  paddingTop: '10px',
  borderTop: '1px solid #ecf0f1'
};

const smallButtonStyle: React.CSSProperties = {
  padding: '5px 10px',
  fontSize: '12px',
  backgroundColor: '#95a5a6',
  color: 'white',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer'
};

const deleteButtonStyle: React.CSSProperties = {
  padding: '5px 10px',
  fontSize: '12px',
  backgroundColor: '#e74c3c',
  color: 'white',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer'
};

const detailsContentStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto'
};

const detailRowStyle: React.CSSProperties = {
  marginBottom: '10px',
  fontSize: '14px',
  lineHeight: '1.6'
};

const sectionTitleStyle: React.CSSProperties = {
  marginTop: '15px',
  marginBottom: '10px',
  color: '#34495e',
  fontSize: '16px'
};

const dividerStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #ecf0f1',
  margin: '15px 0'
};

const emptyStateStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#95a5a6',
  fontSize: '14px',
  textAlign: 'center',
  padding: '20px'
};
