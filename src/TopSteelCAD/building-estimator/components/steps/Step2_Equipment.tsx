/**
 * Étape 2 : Configuration de l'équipement (ossature secondaire)
 * Building Estimator - TopSteelCAD
 *
 * Cette étape regroupe :
 * - Ouvertures (portes, fenêtres)
 * - Garde-corps
 * - Acrotères
 */

import React, { useState } from 'react';
import { Step2EquipmentProps } from '../types';
import { StructureTabs, Structure } from '../StructureTabs';
import { OpeningEditor } from '../OpeningEditor';
import { GuardrailEditor } from '../GuardrailEditor';
import { AcrotereEditor } from '../AcrotereEditor';
import { SolarArrayEditor } from '../SolarArrayEditor';
import { LocationEditor } from '../LocationEditor';
import { BuildingPreview3D } from '../BuildingPreview3D';
import { BuildingOpening, OpeningType, OpeningPosition, ExtensionAttachmentType, BuildingType } from '../../types';
import { getBuildingTypeConfig } from '../../core/BuildingTypeConfigRegistry';
import {
  buttonGroupStyle,
  buttonStyle,
  buttonGroupStyleResponsive,
  buttonStyleResponsive,
  formSectionStyle
} from '../../styles/buildingEstimator.styles';

export const Step2_Equipment: React.FC<Step2EquipmentProps> = ({
  openings,
  equipmentByStructure,
  extensions,
  buildingDimensions,
  buildingParameters,
  buildingType,
  location,
  onAddOpening,
  onUpdateOpening,
  onDeleteOpening,
  onSetGuardrail,
  onSetAcrotere,
  onSetSolarArray,
  onSetLocation,
  onNext,
  onPrevious
}) => {
  const [activeStructureId, setActiveStructureId] = useState<string>('main');
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [viewerVisible, setViewerVisible] = useState(false);

  // Récupérer la configuration du type de bâtiment
  const typeConfig = getBuildingTypeConfig(buildingType);

  // Détecter le redimensionnement de la fenêtre
  React.useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Construire la liste des structures (bâtiment principal + extensions)
  const structures: Structure[] = [
    {
      id: 'main',
      name: 'Bâtiment principal',
      type: 'main'
    },
    ...extensions.map(ext => ({
      id: ext.id,
      name: ext.name,
      type: 'extension' as const,
      parentId: ext.parentId
    }))
  ];

  // Filtrer les ouvertures pour la structure active
  const currentStructureOpenings: BuildingOpening[] = openings
    .filter(o => (o.structureId || 'main') === activeStructureId)
    .map(o => ({
      ...o,
      type: o.type as unknown as OpeningType,
      position: OpeningPosition.LONG_PAN_FRONT, // Valeur par défaut, à adapter
      offsetY: o.position.z || 0,
      dimensions: {
        width: o.dimensions.width,
        height: o.dimensions.height
      },
      framing: {
        verticalPosts: true,
        lintel: true,
        sill: false
      }
    }));

  // Calculer le nombre de travées (approximatif)
  const maxBays = Math.ceil(buildingDimensions.length / 5000);

  // Handlers pour les ouvertures
  const handleAddOpening = (opening: BuildingOpening) => {
    onAddOpening({
      id: opening.id,
      type: opening.type as any,
      wall: 'front' as any,
      position: {
        x: opening.offsetX || 0,
        z: opening.offsetY
      },
      dimensions: opening.dimensions,
      reference: opening.name
    });
  };

  const handleUpdateOpening = (opening: BuildingOpening) => {
    onUpdateOpening(opening.id, {
      position: {
        x: opening.offsetX || 0,
        z: opening.offsetY
      },
      dimensions: opening.dimensions
    });
  };

  const handleDeleteOpening = (openingId: string) => {
    onDeleteOpening(openingId);
  };

  // Fusionner les paramètres avec les équipements du bâtiment principal pour le viewer 3D
  const parametersWithEquipment = React.useMemo(() => ({
    ...buildingParameters,
    guardrail: equipmentByStructure['main']?.guardrail,
    acrotere: equipmentByStructure['main']?.acrotere
  }), [buildingParameters, equipmentByStructure]);

  // Récupérer solarArray de la structure active
  const currentSolarArray = equipmentByStructure[activeStructureId]?.solarArray;

  // Convertir les ouvertures du format Opening vers BuildingOpening pour le viewer 3D
  const convertedOpenings = React.useMemo(() => {
    return openings.map(o => {
      // Mapper le wall vers position
      let position = OpeningPosition.LONG_PAN_FRONT;
      if (o.wall === 'front') position = OpeningPosition.LONG_PAN_FRONT;
      else if (o.wall === 'back') position = OpeningPosition.LONG_PAN_BACK;
      else if (o.wall === 'left') position = OpeningPosition.GABLE_LEFT;
      else if (o.wall === 'right') position = OpeningPosition.GABLE_RIGHT;

      return {
        id: o.id,
        name: o.reference || o.id,
        type: o.type as unknown as OpeningType,
        position: position,
        structureId: (o as any).structureId || 'main',
        offsetX: o.position.x,
        offsetY: o.position.z, // z est la hauteur dans l'ancien format
        dimensions: {
          width: o.dimensions.width,
          height: o.dimensions.height
        },
        framing: {
          verticalPosts: true,
          lintel: true,
          sill: false
        }
      };
    });
  }, [openings]);

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ margin: '0 0 10px 0' }}>🛠️ Équipement (Ossature secondaire)</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
          Configurez les ouvertures, garde-corps et acrotères pour chaque structure
        </p>
      </div>

      {/* Contenu avec layout 2 colonnes */}
      <div style={{
        display: isDesktop ? 'grid' : 'block',
        gridTemplateColumns: isDesktop ? '1fr 450px' : '1fr',
        gap: '20px',
        alignItems: 'start'
      }}>
        {/* Formulaire (gauche) */}
        <div>
          <StructureTabs
            structures={structures}
            activeStructureId={activeStructureId}
            onStructureChange={setActiveStructureId}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                padding: '15px 20px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}>
                <strong>Structure active :</strong>{' '}
                <span style={{ color: '#2563eb' }}>
                  {structures.find(s => s.id === activeStructureId)?.name || 'Bâtiment principal'}
                </span>
              </div>

              {/* Localisation (selon config) */}
              {typeConfig.components.hasLocation && activeStructureId === 'main' && (
                <LocationEditor
                  location={location}
                  onChange={onSetLocation}
                />
              )}

              {/* Panneaux solaires (selon config) */}
              {typeConfig.components.hasSolarArray && activeStructureId === 'main' && (
                <SolarArrayEditor
                  structureId={activeStructureId}
                  config={equipmentByStructure[activeStructureId]?.solarArray}
                  onChange={(config) => onSetSolarArray(activeStructureId, config)}
                  buildingLength={buildingDimensions.length}
                  buildingWidth={buildingDimensions.width}
                  openings={openings
                    .filter(o => ((o as any).structureId || 'main') === activeStructureId)
                    .map(o => ({
                      id: o.id,
                      position: { x: o.position.x, z: o.position.z },
                      dimensions: o.dimensions
                    }))}
                />
              )}

              {/* Ouvertures (selon config) */}
              {typeConfig.components.hasOpenings && (
                <div style={formSectionStyle}>
                  <h3 style={{ marginTop: 0 }}>🚪 Ouvertures</h3>
                  <OpeningEditor
                    structureId={activeStructureId}
                    onAdd={handleAddOpening}
                    onUpdate={handleUpdateOpening}
                    onDelete={handleDeleteOpening}
                    openings={currentStructureOpenings}
                    maxBays={maxBays}
                  />
                </div>
              )}

              {/* Garde-corps (selon config) */}
              {typeConfig.components.hasGuardrail && (
                <GuardrailEditor
                  structureId={activeStructureId}
                  config={equipmentByStructure[activeStructureId]?.guardrail}
                  onChange={(config) => onSetGuardrail(activeStructureId, config)}
                />
              )}

              {/* Acrotères (selon config) */}
              {typeConfig.components.hasAcrotere && (
                <AcrotereEditor
                  structureId={activeStructureId}
                  config={equipmentByStructure[activeStructureId]?.acrotere}
                  onChange={(config) => onSetAcrotere(activeStructureId, config)}
                />
              )}
            </div>
          </StructureTabs>

          {/* Navigation */}
          <div style={{ ...buttonGroupStyleResponsive(isMobile), marginTop: isMobile ? '20px' : '30px' }}>
            <button style={buttonStyleResponsive('secondary', isMobile)} onClick={onPrevious}>
              ← Retour
            </button>
            <button style={buttonStyleResponsive('primary', isMobile)} onClick={onNext}>
              {isMobile ? 'Suivant →' : 'Suivant : Enveloppe →'}
            </button>
          </div>
        </div>

        {/* Viewer 3D (droite, sticky) - Desktop uniquement */}
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
              </div>
              <BuildingPreview3D
                buildingType={buildingType}
                dimensions={buildingDimensions}
                parameters={parametersWithEquipment}
                extensions={extensions}
                openings={convertedOpenings}
                solarArray={currentSolarArray}
                width={450}
                height={500}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bouton flottant 3D - Mobile uniquement */}
      {!isDesktop && (
        <>
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

          {/* Modal 3D - Mobile */}
          {viewerVisible && (
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
                  maxWidth: '500px',
                  maxHeight: '80vh',
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
                  dimensions={buildingDimensions}
                  parameters={parametersWithEquipment}
                  extensions={extensions}
                  openings={convertedOpenings}
                  solarArray={currentSolarArray}
                  width={Math.min(window.innerWidth - 80, 440)}
                  height={400}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
