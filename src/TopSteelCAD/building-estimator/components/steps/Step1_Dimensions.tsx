/**
 * Étape 1 : Configuration des dimensions du bâtiment
 * Building Estimator - TopSteelCAD
 * VERSION REFONTE : Système d'onglets unifié
 */

import React, { useEffect } from 'react';
import { Step1DimensionsProps } from '../types';
import { BuildingType, BuildingExtension, BuildingDimensions, ExtensionAttachmentType } from '../../types';
import { BuildingPreview3D } from '../BuildingPreview3D';
import { BuildingOrExtensionForm } from '../BuildingOrExtensionForm';
import { BuildingSummary } from '../BuildingSummary';
import { ExtensionTreeView } from '../ExtensionTreeView';
import { ConfirmDialog } from '../ConfirmDialog';
import { DetachedViewer3D } from '../DetachedViewer3D';
import { getMainBuildingColor, getExtensionColor, getNextColorIndex } from '../../utils/extensionColors';
import { useDetachedWindow } from '../../hooks/useDetachedWindow';
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
  equipmentByStructure,
  onBuildingTypeChange,
  onDimensionsChange,
  onParametersChange,
  onAddExtension,
  onUpdateExtension,
  onDeleteExtension,
  onNext
}) => {
  // État pour gérer les onglets : 'main' pour bâtiment principal, 'summary' pour synthèse, index pour extensions
  const [activeTab, setActiveTab] = React.useState<'main' | 'summary' | number>('main');
  // État pour afficher/masquer le viewer 3D
  const [viewerVisible, setViewerVisible] = React.useState(false);
  // État pour détecter si on est sur desktop ou mobile
  const [isDesktop, setIsDesktop] = React.useState(window.innerWidth >= 1024);
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 640);
  // État pour le plein écran
  const [fullscreenViewer, setFullscreenViewer] = React.useState(false);
  // État pour la dialog de confirmation
  const [deleteDialog, setDeleteDialog] = React.useState<{
    isOpen: boolean;
    extensionId: string;
    extensionName: string;
    descendantsCount: number;
  }>({ isOpen: false, extensionId: '', extensionName: '', descendantsCount: 0 });

  // Hook pour la fenêtre détachée
  const detachedWindow = useDetachedWindow({
    title: '📐 Aperçu 3D - Building Estimator',
    width: 1400,
    height: 900
  });

  // Détecter le redimensionnement de la fenêtre
  React.useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mettre à jour la fenêtre détachée quand les données changent (avec debounce)
  useEffect(() => {
    if (!detachedWindow.isOpen) return;

    // Debounce pour éviter trop de re-renders
    const timeoutId = setTimeout(() => {
      detachedWindow.renderInWindow(
        <DetachedViewer3D
          buildingType={buildingType}
          dimensions={dimensions}
          parameters={parameters}
          extensions={extensions}
          openings={[]}
          solarArray={equipmentByStructure['main']?.solarArray}
          onClose={detachedWindow.closeWindow}
        />
      );
    }, 300); // Attendre 300ms après la dernière modification

    return () => clearTimeout(timeoutId);
  }, [
    detachedWindow.isOpen,
    buildingType,
    dimensions,
    parameters,
    extensions,
    equipmentByStructure
  ]);

  // Fonction pour obtenir la couleur selon le niveau (bâtiment principal ou extension)
  const getColorByLevel = (level: 'main' | number): { border: string; bg: string; text: string } => {
    if (level === 'main') {
      return getMainBuildingColor();
    }
    return getExtensionColor(extensions[level as number], extensions);
  };

  // Fonction pour ajouter une nouvelle extension
  const handleAddNewExtension = () => {
    // Déterminer le parent : la dernière extension ou le bâtiment principal
    const lastExtension = extensions.length > 0 ? extensions[extensions.length - 1] : null;
    const parentId = lastExtension ? lastExtension.id : undefined;

    // Dimensions du parent pour la nouvelle extension
    const parentDims = lastExtension ? lastExtension.dimensions : dimensions;
    const parentParams = lastExtension ? lastExtension.parameters : parameters;

    // Obtenir le prochain index de couleur
    const colorIndex = getNextColorIndex(extensions);

    const newExt: BuildingExtension = {
      id: `ext-${Date.now()}`,
      name: `Extension ${extensions.length + 1}`,
      type: BuildingType.MONO_PENTE,
      attachmentType: ExtensionAttachmentType.LONG_PAN,
      side: 'front',
      bayIndex: 0,
      parentId: parentId,
      colorIndex: colorIndex,
      dimensions: {
        length: parentDims.length,
        width: 5000,
        heightWall: 3000,
        slope: 10
      },
      parameters: parentParams,
      reversedSlope: false
    };
    onAddExtension(newExt);
    setActiveTab(extensions.length); // Activer le nouvel onglet
  };

  // Fonction pour compter les descendants d'une extension
  const countDescendants = (extensionId: string): number => {
    const children = extensions.filter(ext => ext.parentId === extensionId);
    if (children.length === 0) return 0;

    let count = children.length;
    children.forEach(child => {
      count += countDescendants(child.id);
    });
    return count;
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
    } else if (activeTab === 'summary') {
      // Synthèse - TreeView
      return (
        <ExtensionTreeView
          extensions={extensions}
          onUpdateExtension={onUpdateExtension}
          onDeleteExtension={onDeleteExtension}
          onAddExtension={onAddExtension}
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

        {/* Onglet Synthèse - Tout à droite */}
        {extensions.length > 0 && (
          <button
            onClick={() => setActiveTab('summary')}
            style={{
              padding: isMobile ? '8px 12px' : '12px 20px',
              border: 'none',
              borderBottom: activeTab === 'summary' ? '3px solid #10b981' : '3px solid transparent',
              background: activeTab === 'summary' ? '#d1fae5' : 'transparent',
              color: activeTab === 'summary' ? '#10b981' : '#64748b',
              cursor: 'pointer',
              fontWeight: activeTab === 'summary' ? '700' : '500',
              fontSize: isMobile ? '0.75rem' : '1rem',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              marginLeft: 'auto'
            }}
            title="Synthèse"
          >
            {isMobile ? '🌳' : '🌳 Synthèse'}
          </button>
        )}
      </div>

      {/* Contenu */}
      <div style={{
        display: isDesktop ? 'grid' : 'block',
        gridTemplateColumns: isDesktop ? '1fr 450px' : '1fr',
        gap: '20px',
        alignItems: 'start'
      }}>
        {/* Formulaire actif */}
        <div>
          {renderActiveTab()}

          {/* Boutons de navigation - toujours visible */}
          <div style={{
            ...buttonGroupStyleResponsive(isMobile),
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            {/* Bouton supprimer (si extension active) */}
            {activeTab !== 'main' && activeTab !== 'summary' && extensions[activeTab as number] && (
              <button
                onClick={() => {
                  const extension = extensions[activeTab as number];
                  const descendantsCount = countDescendants(extension.id);
                  setDeleteDialog({
                    isOpen: true,
                    extensionId: extension.id,
                    extensionName: extension.name,
                    descendantsCount
                  });
                }}
                style={buttonStyleResponsive('danger', isMobile)}
              >
                {isMobile ? '🗑️ Supprimer' : '🗑️ Supprimer cette extension'}
              </button>
            )}
            <button style={buttonStyleResponsive('primary', isMobile)} onClick={onNext}>
              {isMobile ? 'Suivant →' : 'Suivant : Équipement →'}
            </button>
          </div>
        </div>

        {/* Viewer 3D sur desktop (sticky à droite) */}
        {isDesktop && (
          <div style={{ position: 'sticky', top: '20px' }}>
            <div style={{
              background: '#f8fafc',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '12px 16px',
                background: '#fff',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>📐 Aperçu 3D</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={detachedWindow.openWindow}
                    style={{
                      background: 'transparent',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      color: '#10b981',
                      fontWeight: '500'
                    }}
                    title="Ouvrir dans une nouvelle fenêtre"
                  >
                    🪟
                  </button>
                  <button
                    onClick={() => setFullscreenViewer(true)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      color: '#2563eb',
                      fontWeight: '500'
                    }}
                    title="Plein écran"
                  >
                    ⛶
                  </button>
                </div>
              </div>
              <BuildingPreview3D
                buildingType={buildingType}
                dimensions={dimensions}
                parameters={parameters}
                extensions={extensions}
                solarArray={equipmentByStructure['main']?.solarArray}
                width={450}
                height={400}
              />
              <BuildingSummary
                dimensions={dimensions}
                parameters={parameters}
                buildingType={buildingType}
                extensions={extensions}
                solarArray={equipmentByStructure['main']?.solarArray}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bouton flottant 3D - Mobile uniquement */}
      {!isDesktop && (
        <button
          onClick={() => setViewerVisible(!viewerVisible)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            fontSize: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          📐
        </button>
      )}

      {/* Modal mobile 3D */}
      {!isDesktop && viewerVisible && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setViewerVisible(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '90vw',
              maxHeight: '85vh',
              overflow: 'hidden',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '16px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontWeight: '600', fontSize: '1rem' }}>📐 Aperçu 3D</span>
              <button
                onClick={() => setViewerVisible(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                ✕
              </button>
            </div>
            <BuildingPreview3D
              buildingType={buildingType}
              dimensions={dimensions}
              parameters={parameters}
              extensions={extensions}
              solarArray={equipmentByStructure['main']?.solarArray}
              width={Math.min(window.innerWidth * 0.9 - 40, 800)}
              height={Math.min(window.innerHeight * 0.85 - 80, 600)}
            />
          </div>
        </div>
      )}

      {/* Modal plein écran - Desktop et Mobile */}
      {fullscreenViewer && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setFullscreenViewer(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              width: '95vw',
              height: '95vh',
              overflow: 'hidden',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '16px 20px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>📐 Aperçu 3D - Plein écran</span>
              <button
                onClick={() => setFullscreenViewer(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.8rem',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  color: '#64748b'
                }}
              >
                ✕
              </button>
            </div>
            <BuildingPreview3D
              buildingType={buildingType}
              dimensions={dimensions}
              parameters={parameters}
              extensions={extensions}
              solarArray={equipmentByStructure['main']?.solarArray}
              width={window.innerWidth * 0.95 - 40}
              height={window.innerHeight * 0.95 - 100}
            />
          </div>
        </div>
      )}

      {/* Dialog de confirmation de suppression */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Supprimer cette extension ?"
        message={
          deleteDialog.descendantsCount > 0
            ? `Vous êtes sur le point de supprimer "${deleteDialog.extensionName}" et ses ${deleteDialog.descendantsCount} extension(s) fille(s).\n\nCette action supprimera également toutes les extensions rattachées et est irréversible.`
            : `Êtes-vous sûr de vouloir supprimer "${deleteDialog.extensionName}" ?\n\nCette action est irréversible.`
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        danger={true}
        onConfirm={() => {
          onDeleteExtension(deleteDialog.extensionId);
          setActiveTab('main');
          setDeleteDialog({ isOpen: false, extensionId: '', extensionName: '', descendantsCount: 0 });
        }}
        onCancel={() => {
          setDeleteDialog({ isOpen: false, extensionId: '', extensionName: '', descendantsCount: 0 });
        }}
      />
    </div>
  );
};
