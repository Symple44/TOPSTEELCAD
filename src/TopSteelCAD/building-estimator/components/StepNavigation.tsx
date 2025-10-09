/**
 * Navigation entre les étapes de configuration
 * Building Estimator - TopSteelCAD
 */

import React from 'react';
import { BuildingConfigStep } from '../types';
import { buttonStyle } from '../styles/buildingEstimator.styles';

export interface StepInfo {
  step: BuildingConfigStep;
  label: string;
  icon: string;
  description: string;
}

export interface StepNavigationProps {
  currentStep: BuildingConfigStep;
  onStepChange: (step: BuildingConfigStep) => void;
  completedSteps?: BuildingConfigStep[];  // Étapes déjà complétées
}

const STEPS: StepInfo[] = [
  {
    step: BuildingConfigStep.DIMENSIONS,
    label: 'Dimensions',
    icon: '📐',
    description: 'Structure et dimensions'
  },
  {
    step: BuildingConfigStep.EQUIPMENT,
    label: 'Équipements',
    icon: '🛠️',
    description: 'Ouvertures, garde-corps, acrotères'
  },
  {
    step: BuildingConfigStep.ENVELOPE,
    label: 'Enveloppe',
    icon: '🏗️',
    description: 'Bardage et couverture'
  },
  {
    step: BuildingConfigStep.FINISHING,
    label: 'Finitions',
    icon: '✨',
    description: 'Finitions et options'
  }
];

export const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStep,
  onStepChange,
  completedSteps = []
}) => {
  const currentIndex = STEPS.findIndex(s => s.step === currentStep);

  const isStepCompleted = (step: BuildingConfigStep) => {
    return completedSteps.includes(step);
  };

  const isStepAccessible = (stepIndex: number) => {
    // L'étape courante et les précédentes sont toujours accessibles
    if (stepIndex <= currentIndex) return true;

    // Les étapes suivantes ne sont accessibles que si la précédente est complétée
    for (let i = 0; i < stepIndex; i++) {
      if (!isStepCompleted(STEPS[i].step)) return false;
    }
    return true;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      marginBottom: '32px'
    }}>
      {/* Indicateur de progression visuel */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative'
      }}>
        {/* Ligne de progression */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '40px',
          right: '40px',
          height: '3px',
          background: '#e2e8f0',
          zIndex: 0
        }}>
          <div style={{
            height: '100%',
            background: '#3b82f6',
            width: `${(currentIndex / (STEPS.length - 1)) * 100}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Étapes */}
        {STEPS.map((stepInfo, index) => {
          const isActive = stepInfo.step === currentStep;
          const isCompleted = isStepCompleted(stepInfo.step);
          const isAccessible = isStepAccessible(index);

          return (
            <div
              key={stepInfo.step}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                zIndex: 1,
                cursor: isAccessible ? 'pointer' : 'not-allowed',
                opacity: isAccessible ? 1 : 0.5
              }}
              onClick={() => isAccessible && onStepChange(stepInfo.step)}
            >
              {/* Cercle de l'étape */}
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: isActive ? '#3b82f6' : isCompleted ? '#10b981' : '#fff',
                border: `3px solid ${isActive ? '#3b82f6' : isCompleted ? '#10b981' : '#cbd5e1'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                transition: 'all 0.2s',
                boxShadow: isActive ? '0 0 0 4px rgba(59, 130, 246, 0.1)' : 'none'
              }}>
                {isCompleted ? '✓' : stepInfo.icon}
              </div>

              {/* Label */}
              <div style={{
                marginTop: '8px',
                fontSize: '0.85rem',
                fontWeight: isActive ? '600' : '500',
                color: isActive ? '#1e40af' : isCompleted ? '#059669' : '#64748b',
                textAlign: 'center'
              }}>
                {stepInfo.label}
              </div>

              {/* Description */}
              <div style={{
                marginTop: '2px',
                fontSize: '0.7rem',
                color: '#94a3b8',
                textAlign: 'center'
              }}>
                {stepInfo.description}
              </div>
            </div>
          );
        })}
      </div>

      {/* Boutons de navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <button
          onClick={() => {
            if (currentIndex > 0) {
              onStepChange(STEPS[currentIndex - 1].step);
            }
          }}
          disabled={currentIndex === 0}
          style={{
            ...buttonStyle('secondary'),
            opacity: currentIndex === 0 ? 0.5 : 1,
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          ← Étape précédente
        </button>

        <button
          onClick={() => {
            if (currentIndex < STEPS.length - 1 && isStepAccessible(currentIndex + 1)) {
              onStepChange(STEPS[currentIndex + 1].step);
            }
          }}
          disabled={currentIndex === STEPS.length - 1 || !isStepAccessible(currentIndex + 1)}
          style={{
            ...buttonStyle('primary'),
            opacity: (currentIndex === STEPS.length - 1 || !isStepAccessible(currentIndex + 1)) ? 0.5 : 1,
            cursor: (currentIndex === STEPS.length - 1 || !isStepAccessible(currentIndex + 1)) ? 'not-allowed' : 'pointer'
          }}
        >
          Étape suivante →
        </button>
      </div>
    </div>
  );
};
