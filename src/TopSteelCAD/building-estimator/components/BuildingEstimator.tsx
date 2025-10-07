/**
 * Composant principal Building Estimator
 * Building Estimator - TopSteelCAD
 */

import React from 'react';
import { useBuildingEstimator } from '../hooks/useBuildingEstimator';
import { BuildingStep } from './types';
import { MonoPenteBuilding } from '../types';

// Steps
import { Step1_Dimensions } from './steps/Step1_Dimensions';
import { Step2_Openings } from './steps/Step2_Openings';
import { Step3_Finishes } from './steps/Step3_Finishes';
import { Step4_Summary } from './steps/Step4_Summary';

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
  initialBuilding?: MonoPenteBuilding;

  /** Callback lors de la génération du bâtiment */
  onBuildingGenerated?: (building: MonoPenteBuilding) => void;

  /** Callback lors de l'export */
  onExport?: (building: MonoPenteBuilding, format: 'csv' | 'json' | 'ifc' | 'html') => void;
}

/**
 * Configuration des étapes
 */
const STEPS = [
  { step: BuildingStep.DIMENSIONS, label: 'Dimensions', icon: '📐' },
  { step: BuildingStep.OPENINGS, label: 'Ouvertures', icon: '🚪' },
  { step: BuildingStep.FINISHES, label: 'Finitions', icon: '🎨' },
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
    setFinishes,
    generateBuilding,
    exportBuilding,
    resetForm
  } = useBuildingEstimator(initialBuilding);

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
    <div style={stepperStyle}>
      {STEPS.map((step, index) => {
        const isActive = state.currentStep === step.step;
        const isCompleted = state.currentStep > step.step;
        const canClick = isCompleted;

        return (
          <div
            key={step.step}
            style={stepStyle(isActive, isCompleted)}
            onClick={() => canClick && goToStep(step.step)}
          >
            <div style={stepNumberStyle(isActive, isCompleted)}>
              {isCompleted ? '✓' : step.icon}
            </div>
            <div style={stepLabelStyle(isActive)}>{step.label}</div>

            {/* Ligne de connexion (sauf pour le dernier) */}
            {index < STEPS.length - 1 && (
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
            onBuildingTypeChange={setBuildingType}
            onDimensionsChange={setDimensions}
            onParametersChange={setParameters}
            onAddExtension={addExtension}
            onUpdateExtension={updateExtension}
            onDeleteExtension={deleteExtension}
            onNext={nextStep}
          />
        );

      case BuildingStep.OPENINGS:
        return (
          <Step2_Openings
            openings={state.openings}
            buildingDimensions={state.dimensions}
            onAddOpening={addOpening}
            onUpdateOpening={updateOpening}
            onDeleteOpening={deleteOpening}
            onNext={nextStep}
            onPrevious={previousStep}
          />
        );

      case BuildingStep.FINISHES:
        return (
          <Step3_Finishes
            finishes={state.finishes}
            onFinishesChange={setFinishes}
            onNext={nextStep}
            onPrevious={previousStep}
          />
        );

      case BuildingStep.SUMMARY:
        return (
          <Step4_Summary
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
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>🏗️ Building Estimator</h1>
        <p style={subtitleStyle}>
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

      {/* Footer info */}
      {state.hasUnsavedChanges && (
        <div
          style={{
            marginTop: '30px',
            padding: '12px 20px',
            background: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '6px',
            fontSize: '14px',
            color: '#92400e',
            textAlign: 'center'
          }}
        >
          ⚠️ Modifications non sauvegardées
        </div>
      )}
    </div>
  );
};

export default BuildingEstimator;
