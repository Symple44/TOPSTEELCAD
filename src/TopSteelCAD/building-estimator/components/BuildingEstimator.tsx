/**
 * Composant principal Building Estimator
 * Building Estimator - TopSteelCAD
 */

import React from 'react';
import { useBuildingEstimator } from '../hooks/useBuildingEstimator';
import { useResponsive } from '../hooks/useResponsive';
import { BuildingStep } from './types';
import { Building, MonoPenteBuilding } from '../types';

// Steps
import { Step1_Dimensions } from './steps/Step1_Dimensions';
import { Step2_Equipment } from './steps/Step2_Equipment';
import { Step3_Envelope } from './steps/Step3_Envelope';
import { Step4_Finishing } from './steps/Step4_Finishing';
import { Step5_Summary } from './steps/Step5_Summary';

// Styles
import {
  containerStyle,
  headerStyle,
  titleStyle,
  subtitleStyle,
  stepperStyle,
  stepStyle,
  stepNumberStyle,
  stepLabelStyle
} from '../styles/buildingEstimator.styles';

/**
 * Props du composant
 */
export interface BuildingEstimatorProps {
  /** Bâtiment existant à éditer (optionnel) */
  initialBuilding?: Building;

  /** Callback lors de la génération du bâtiment */
  onBuildingGenerated?: (building: Building) => void;

  /** Callback lors de l'export */
  onExport?: (building: Building, format: 'csv' | 'json' | 'ifc' | 'html') => void;
}

/**
 * Configuration des étapes
 */
const STEPS = [
  { step: BuildingStep.DIMENSIONS, label: 'Dimensions', icon: '📐' },
  { step: BuildingStep.EQUIPMENT, label: 'Équipement', icon: '🛠️' },
  { step: BuildingStep.ENVELOPE, label: 'Enveloppe', icon: '🏗️' },
  { step: BuildingStep.FINISHING, label: 'Finitions', icon: '✨' },
  { step: BuildingStep.SUMMARY, label: 'Résumé', icon: '📋' }
];

/**
 * Composant principal
 */
export const BuildingEstimator: React.FC<BuildingEstimatorProps> = ({
  initialBuilding,
  onBuildingGenerated,
  onExport
}) => {
  const {
    state,
    nextStep,
    previousStep,
    goToStep,
    setName,
    setBuildingType,
    setDimensions,
    setParameters,
    addOpening,
    updateOpening,
    deleteOpening,
    addExtension,
    updateExtension,
    deleteExtension,
    setGuardrail,
    setAcrotere,
    setSolarArray,
    setLocation,
    setClading,
    setRoofing,
    setPainting,
    setAccessories,
    setOptions,
    setFinishes,
    generateBuilding,
    exportBuilding,
    resetForm
  } = useBuildingEstimator(initialBuilding);

  // Hook responsive
  const { isMobile } = useResponsive();

  /**
   * Gestion de l'export avec callback
   */
  const handleExport = (format: 'csv' | 'json' | 'ifc' | 'html') => {
    exportBuilding(format);

    if (onExport && state.building) {
      onExport(state.building, format);
    }
  };

  /**
   * Gestion de la génération avec callback
   */
  React.useEffect(() => {
    if (state.building && onBuildingGenerated) {
      onBuildingGenerated(state.building);
    }
  }, [state.building, onBuildingGenerated]);

  /**
   * Rendu du stepper
   */
  const renderStepper = () => (
    <div style={stepperStyle(isMobile)}>
      {STEPS.map((step, index) => {
        const isActive = state.currentStep === step.step;
        const isCompleted = state.currentStep > step.step;
        const canClick = isCompleted;

        return (
          <div
            key={step.step}
            style={stepStyle(isActive, isCompleted, isMobile)}
            onClick={() => canClick && goToStep(step.step)}
          >
            <div style={stepNumberStyle(isActive, isCompleted, isMobile)}>
              {isCompleted ? '✓' : step.icon}
            </div>
            <div style={stepLabelStyle(isActive, isMobile)}>{step.label}</div>

            {/* Ligne de connexion (sauf pour le dernier et sauf en mobile) */}
            {!isMobile && index < STEPS.length - 1 && (
              <div
                style={{
                  position: 'absolute',
                  top: '20px',
                  left: '50%',
                  width: '100%',
                  height: '2px',
                  background: isCompleted ? '#2563eb' : '#e2e8f0',
                  zIndex: -1
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  /**
   * Rendu du contenu de l'étape actuelle
   */
  const renderStepContent = () => {
    switch (state.currentStep) {
      case BuildingStep.DIMENSIONS:
        return (
          <Step1_Dimensions
            buildingType={state.buildingType}
            dimensions={state.dimensions}
            parameters={state.parameters}
            extensions={state.extensions}
            errors={state.errors}
            equipmentByStructure={state.equipmentByStructure}
            onBuildingTypeChange={setBuildingType}
            onDimensionsChange={setDimensions}
            onParametersChange={setParameters}
            onAddExtension={addExtension}
            onUpdateExtension={updateExtension}
            onDeleteExtension={deleteExtension}
            onNext={nextStep}
          />
        );

      case BuildingStep.EQUIPMENT:
        return (
          <Step2_Equipment
            openings={state.openings}
            equipmentByStructure={state.equipmentByStructure}
            extensions={state.extensions}
            buildingDimensions={state.dimensions}
            buildingParameters={state.parameters}
            buildingType={state.buildingType}
            location={state.location}
            onAddOpening={addOpening}
            onUpdateOpening={updateOpening}
            onDeleteOpening={deleteOpening}
            onSetGuardrail={setGuardrail}
            onSetAcrotere={setAcrotere}
            onSetSolarArray={setSolarArray}
            onSetLocation={setLocation}
            onNext={nextStep}
            onPrevious={previousStep}
          />
        );

      case BuildingStep.ENVELOPE:
        return (
          <Step3_Envelope
            envelopeByStructure={state.envelopeByStructure}
            extensions={state.extensions}
            buildingDimensions={state.dimensions}
            buildingParameters={state.parameters}
            buildingType={state.buildingType}
            openings={state.openings}
            equipmentByStructure={state.equipmentByStructure}
            onSetClading={setClading}
            onSetRoofing={setRoofing}
            onNext={nextStep}
            onPrevious={previousStep}
          />
        );

      case BuildingStep.FINISHING:
        return (
          <Step4_Finishing
            finishingByStructure={state.finishingByStructure}
            extensions={state.extensions}
            buildingDimensions={state.dimensions}
            buildingParameters={state.parameters}
            buildingType={state.buildingType}
            openings={state.openings}
            equipmentByStructure={state.equipmentByStructure}
            onSetPainting={setPainting}
            onSetAccessories={setAccessories}
            onSetOptions={setOptions}
            onNext={nextStep}
            onPrevious={previousStep}
          />
        );

      case BuildingStep.SUMMARY:
        return (
          <Step5_Summary
            building={state.building}
            nomenclature={state.nomenclature}
            onExport={handleExport}
            onPrevious={previousStep}
            onReset={resetForm}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div style={containerStyle(isMobile)}>
      {/* Header */}
      <div style={headerStyle(isMobile)}>
        <h1 style={titleStyle(isMobile)}>🏗️ Building Estimator</h1>
        <p style={subtitleStyle(isMobile)}>
          Configurez votre bâtiment métallique et générez automatiquement la nomenclature
        </p>
      </div>

      {/* Stepper */}
      {renderStepper()}

      {/* Contenu de l'étape */}
      <div style={{ marginTop: '20px' }}>
        {state.isGenerating ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              fontSize: '16px',
              color: '#64748b'
            }}
          >
            ⏳ Génération du bâtiment en cours...
          </div>
        ) : (
          renderStepContent()
        )}
      </div>

      {/* Footer info - Supprimé car sauvegarde automatique */}
    </div>
  );
};

export default BuildingEstimator;
