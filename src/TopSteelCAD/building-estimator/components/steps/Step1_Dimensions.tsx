/**
 * Étape 1 : Configuration des dimensions du bâtiment
 * Building Estimator - TopSteelCAD
 * VERSION REFONTE : Système d'onglets unifié
 */

import React from 'react';
import { Step1DimensionsProps } from '../types';
import { BuildingType, BuildingExtension, BuildingDimensions, ExtensionAttachmentType } from '../../types';
import { BuildingPreview3D } from '../BuildingPreview3D';
import { BuildingOrExtensionForm } from '../BuildingOrExtensionForm';
import {
  buttonGroupStyle,
  buttonStyle,
  buttonGroupStyleResponsive,
  buttonStyleResponsive
} from '../../styles/buildingEstimator.styles';

export const Step1_Dimensions: React.FC<Step1DimensionsProps> = ({
  buildingType,
  dimensions,
  parameters,
  extensions,
  errors,
  onBuildingTypeChange,
  onDimensionsChange,
  onParametersChange,
  onAddExtension,
  onUpdateExtension,
  onDeleteExtension,
  onNext
}) => {
  // État pour gérer les onglets : 'main' pour bâtiment principal, index pour extensions
  const [activeTab, setActiveTab] = React.useState<'main' | number>('main');
  // État pour afficher/masquer le viewer 3D
  const [showViewer, setShowViewer] = React.useState(false);
  // État pour détecter si on est sur desktop ou mobile
  const [isDesktop, setIsDesktop] = React.useState(window.innerWidth >= 1024);
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 640);
  // État pour masquer le viewer sur desktop
  const [viewerHidden, setViewerHidden] = React.useState(false);

  // Détecter le redimensionnement de la fenêtre
  React.useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fonction pour obtenir le niveau d'une extension (profondeur dans la hiérarchie)
  const getExtensionLevel = (extension: BuildingExtension): number => {
    if (!extension.parentId) return 1; // Directement attachée au bâtiment principal

    const parent = extensions.find(e => e.id === extension.parentId);
    if (!parent) return 1;

    return 1 + getExtensionLevel(parent);
  };

  // Fonction pour obtenir la couleur selon le niveau
  const getColorByLevel = (level: 'main' | number): { border: string; bg: string; text: string } => {
    if (level === 'main') {
      return {
        border: '#1e40af',
        bg: '#dbeafe',
        text: '#1e40af'
      };
    }

    const extensionLevel = getExtensionLevel(extensions[level as number]);

    if (extensionLevel === 1) {
      return {
        border: '#f59e0b',
        bg: '#fef3c7',
        text: '#f59e0b'
      };
    } else if (extensionLevel === 2) {
      return {
        border: '#a855f7',
        bg: '#f3e8ff',
        text: '#a855f7'
      };
    } else {
      return {
        border: '#ec4899',
        bg: '#fce7f3',
        text: '#ec4899'
      };
    }
  };

  // Fonction pour ajouter une nouvelle extension
  const handleAddNewExtension = () => {
    const newExt: BuildingExtension = {
      id: `ext-${Date.now()}`,
      name: `Extension ${extensions.length + 1}`,
      type: BuildingType.MONO_PENTE,
      attachmentType: ExtensionAttachmentType.LONG_PAN,
      side: 'front',
      bayIndex: 0,
      parentId: undefined,
      dimensions: {
        length: dimensions.length,
        width: 5000,
        heightWall: 3000,
        slope: 10
      },
      parameters: parameters,
      reversedSlope: false
    };
    onAddExtension(newExt);
    setActiveTab(extensions.length); // Activer le nouvel onglet
  };

  // Helper pour obtenir les infos du parent d'une extension
  const getParentInfo = (extension: BuildingExtension) => {
    if (!extension.parentId) {
      // Parent = bâtiment principal
      return {
        length: dimensions.length,
        width: dimensions.width,
        postSpacing: parameters.postSpacing,
        name: 'Bâtiment principal'
      };
    }

    // Parent = une autre extension
    const parent = extensions.find(e => e.id === extension.parentId);
    if (parent) {
      return {
        length: parent.dimensions.length,
        width: parent.dimensions.width,
        postSpacing: parent.parameters.postSpacing,
        name: parent.name
      };
    }

    // Fallback
    return {
      length: dimensions.length,
      width: dimensions.width,
      postSpacing: parameters.postSpacing,
      name: 'Bâtiment principal'
    };
  };

  // Rendu de l'onglet actif
  const renderActiveTab = () => {
    if (activeTab === 'main') {
      // Bâtiment principal
      return (
        <BuildingOrExtensionForm
          itemType="main"
          type={buildingType}
          dimensions={dimensions}
          parameters={parameters}
          onTypeChange={onBuildingTypeChange}
          onDimensionsChange={onDimensionsChange}
          onParametersChange={onParametersChange}
        />
      );
    } else {
      // Extension
      const extension = extensions[activeTab as number];
      if (!extension) return null;

      const parentInfo = getParentInfo(extension);

      return (
        <BuildingOrExtensionForm
          itemType="extension"
          type={extension.type}
          dimensions={extension.dimensions}
          parameters={extension.parameters}
          extension={extension}
          extensions={extensions}
          parentLength={parentInfo.length}
          parentWidth={parentInfo.width}
          parentPostSpacing={parentInfo.postSpacing}
          parentName={parentInfo.name}
          onTypeChange={(type) => onUpdateExtension(extension.id, { type })}
          onDimensionsChange={(dims) => onUpdateExtension(extension.id, {
            dimensions: { ...extension.dimensions, ...dims }
          })}
          onParametersChange={(params) => onUpdateExtension(extension.id, {
            parameters: { ...extension.parameters, ...params }
          })}
          onExtensionFieldChange={(field, value) => onUpdateExtension(extension.id, { [field]: value })}
          onDelete={() => {
            onDeleteExtension(extension.id);
            setActiveTab('main'); // Retourner au bâtiment principal
          }}
        />
      );
    }
  };

  return (
    <div>
      {/* Onglets horizontaux */}
      <div style={{
        display: 'flex',
        gap: isMobile ? '4px' : '8px',
        marginBottom: isMobile ? '16px' : '20px',
        borderBottom: '2px solid #e2e8f0',
        overflowX: 'auto',
        paddingBottom: '0px',
        WebkitOverflowScrolling: 'touch'
      }}>
        {/* Onglet Bâtiment principal */}
        <button
          onClick={() => setActiveTab('main')}
          style={{
            padding: isMobile ? '8px 12px' : '12px 20px',
            border: 'none',
            borderBottom: activeTab === 'main' ? `3px solid ${getColorByLevel('main').border}` : '3px solid transparent',
            background: activeTab === 'main' ? getColorByLevel('main').bg : 'transparent',
            color: activeTab === 'main' ? getColorByLevel('main').text : '#64748b',
            cursor: 'pointer',
            fontWeight: activeTab === 'main' ? '700' : '500',
            fontSize: isMobile ? '0.8rem' : '1rem',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          {isMobile ? '🏢 Principal' : '🏢 Bâtiment principal'}
        </button>

        {/* Onglets Extensions */}
        {extensions.map((ext, index) => {
          const colors = getColorByLevel(index);
          const shortName = isMobile && ext.name.length > 10 ? `${ext.name.substring(0, 8)}...` : ext.name;
          return (
            <button
              key={ext.id}
              onClick={() => setActiveTab(index)}
              style={{
                padding: isMobile ? '8px 10px' : '12px 20px',
                border: 'none',
                borderBottom: activeTab === index ? `3px solid ${colors.border}` : '3px solid transparent',
                background: activeTab === index ? colors.bg : 'transparent',
                color: activeTab === index ? colors.text : '#64748b',
                cursor: 'pointer',
                fontWeight: activeTab === index ? '700' : '500',
                fontSize: isMobile ? '0.75rem' : '1rem',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
              title={isMobile ? ext.name : undefined}
            >
              ➕ {shortName}
            </button>
          );
        })}

        {/* Bouton Ajouter */}
        <button
          onClick={handleAddNewExtension}
          style={{
            padding: isMobile ? '8px 12px' : '12px 20px',
            border: 'none',
            borderBottom: '3px solid transparent',
            background: 'transparent',
            color: '#10b981',
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: isMobile ? '1rem' : '1.2rem',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
          title="Ajouter une extension"
        >
          +
        </button>
      </div>

      {/* Contenu */}
      <div style={{
        display: isDesktop && !viewerHidden ? 'grid' : 'block',
        gridTemplateColumns: isDesktop && !viewerHidden ? '1fr 450px' : '1fr',
        gap: '20px',
        alignItems: 'start',
        maxWidth: isDesktop && !viewerHidden ? 'none' : '1200px',
        margin: '0 auto'
      }}>
        {/* Formulaire actif */}
        <div>
          {renderActiveTab()}

          {/* Boutons de navigation (seulement sur l'onglet bâtiment principal) */}
          {activeTab === 'main' && (
            <div style={buttonGroupStyleResponsive(isMobile)}>
              <button style={buttonStyleResponsive('primary', isMobile)} onClick={onNext}>
                {isMobile ? 'Suivant →' : 'Suivant : Équipement →'}
              </button>
            </div>
          )}
        </div>

        {/* Viewer 3D sur desktop (sticky à droite) */}
        {isDesktop && !viewerHidden && (
          <div style={{ position: 'sticky', top: '20px' }}>
            <div style={{
              padding: '20px',
              background: '#1a1a1a',
              borderRadius: '12px',
              marginBottom: '0',
              position: 'relative'
            }}>
              {/* Bouton masquer */}
              <button
                onClick={() => setViewerHidden(true)}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: '#475569',
                  color: '#fff',
                  border: 'none',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  zIndex: 10
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#334155';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#475569';
                }}
                title="Masquer le viewer"
              >
                ×
              </button>

              <h3 style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: '#f1f5f9',
                marginBottom: '15px',
                marginTop: 0,
                paddingRight: '40px'
              }}>
                🎨 Aperçu 3D
              </h3>
              <BuildingPreview3D
                buildingType={buildingType}
                dimensions={dimensions}
                parameters={parameters}
                extensions={extensions}
                width={410}
                height={500}
              />
              <div style={{
                marginTop: '15px',
                padding: '12px',
                background: '#0f172a',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#94a3b8'
              }}>
                <div style={{ marginBottom: '8px', fontWeight: '600', color: '#cbd5e1' }}>
                  📏 Dimensions actuelles:
                </div>
                <div>• Longueur: {(dimensions.length / 1000).toFixed(1)}m</div>
                <div>• Largeur: {(dimensions.width / 1000).toFixed(1)}m</div>
                <div>• Hauteur: {(dimensions.heightWall / 1000).toFixed(1)}m</div>
                {buildingType === BuildingType.MONO_PENTE && (
                  <div>• Pente: {dimensions.slope}%</div>
                )}

                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1e293b' }}>
                  <div style={{ marginBottom: '8px', fontWeight: '600', color: '#cbd5e1' }}>
                    🏗️ Profils structurels:
                  </div>
                  <div>• Poteaux: {parameters.postProfile}</div>
                  <div>• Arbalétriers: {parameters.rafterProfile}</div>
                  <div>• Pannes: {parameters.purlinProfile}</div>
                  <div>• Lisses: {parameters.railProfile}</div>
                </div>

                {extensions.length > 0 && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1e293b' }}>
                    <div style={{ marginBottom: '8px', fontWeight: '600', color: '#cbd5e1' }}>
                      🎨 Légende des couleurs:
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ width: '12px', height: '12px', background: '#1e40af', borderRadius: '2px', display: 'inline-block' }}></span>
                      <span>Bâtiment principal</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '2px', display: 'inline-block' }}></span>
                      <span>Extension niveau 1</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ width: '12px', height: '12px', background: '#a855f7', borderRadius: '2px', display: 'inline-block' }}></span>
                      <span>Extension niveau 2</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '12px', height: '12px', background: '#ec4899', borderRadius: '2px', display: 'inline-block' }}></span>
                      <span>Extension niveau 3+</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bouton flottant 3D (mobile OU desktop quand viewer caché) */}
      {(!isDesktop || viewerHidden) && (
        <button
          onClick={() => {
            if (isDesktop) {
              setViewerHidden(false);
            } else {
              setShowViewer(!showViewer);
            }
          }}
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            border: 'none',
            fontSize: '1.2rem',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)';
          }}
          title="Aperçu 3D"
        >
          3D
        </button>
      )}

      {/* Modal/Overlay du viewer 3D (mobile uniquement) */}
      {!isDesktop && showViewer && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowViewer(false)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: '#1a1a1a',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              animation: 'fadeIn 0.2s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton fermer */}
            <button
              onClick={() => setShowViewer(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                zIndex: 10
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#dc2626';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ef4444';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Fermer"
            >
              ×
            </button>

            <h3 style={{
              fontSize: '1.3rem',
              fontWeight: '700',
              color: '#f1f5f9',
              marginBottom: '20px',
              marginTop: 0,
              paddingRight: '50px'
            }}>
              🎨 Aperçu 3D du Bâtiment
            </h3>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {/* Viewer 3D */}
              <div style={{ flex: '1 1 500px', minWidth: '300px' }}>
                <BuildingPreview3D
                  buildingType={buildingType}
                  dimensions={dimensions}
                  parameters={parameters}
                  extensions={extensions}
                  width={Math.min(window.innerWidth * 0.5, 600)}
                  height={Math.min(window.innerHeight * 0.6, 500)}
                />
              </div>

              {/* Informations */}
              <div style={{
                flex: '1 1 300px',
                minWidth: '250px',
                padding: '16px',
                background: '#0f172a',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: '#94a3b8',
                maxHeight: '500px',
                overflowY: 'auto'
              }}>
                <div style={{ marginBottom: '8px', fontWeight: '600', color: '#cbd5e1', fontSize: '1rem' }}>
                  📏 Dimensions actuelles:
                </div>
                <div>• Longueur: {(dimensions.length / 1000).toFixed(1)}m</div>
                <div>• Largeur: {(dimensions.width / 1000).toFixed(1)}m</div>
                <div>• Hauteur: {(dimensions.heightWall / 1000).toFixed(1)}m</div>
                {buildingType === BuildingType.MONO_PENTE && (
                  <div>• Pente: {dimensions.slope}%</div>
                )}

                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #1e293b' }}>
                  <div style={{ marginBottom: '8px', fontWeight: '600', color: '#cbd5e1', fontSize: '1rem' }}>
                    🏗️ Profils structurels:
                  </div>
                  <div>• Poteaux: {parameters.postProfile}</div>
                  <div>• Arbalétriers: {parameters.rafterProfile}</div>
                  <div>• Pannes: {parameters.purlinProfile}</div>
                  <div>• Lisses: {parameters.railProfile}</div>
                </div>

                {extensions.length > 0 && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #1e293b' }}>
                    <div style={{ marginBottom: '8px', fontWeight: '600', color: '#cbd5e1', fontSize: '1rem' }}>
                      🎨 Légende des couleurs:
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ width: '16px', height: '16px', background: '#1e40af', borderRadius: '3px', display: 'inline-block' }}></span>
                      <span>Bâtiment principal</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ width: '16px', height: '16px', background: '#f59e0b', borderRadius: '3px', display: 'inline-block' }}></span>
                      <span>Extension niveau 1</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ width: '16px', height: '16px', background: '#a855f7', borderRadius: '3px', display: 'inline-block' }}></span>
                      <span>Extension niveau 2</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '16px', height: '16px', background: '#ec4899', borderRadius: '3px', display: 'inline-block' }}></span>
                      <span>Extension niveau 3+</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
