import React from 'react';
import { PartBuilder } from '../PartBuilder';

/**
 * Composant de démonstration du nouveau Part Builder refactorisé
 *
 * Fonctionnalités principales:
 * - Mode Liste avec DataTable
 * - Mode Étendu avec cartes
 * - Support DSTV complet
 * - Modal de détail avec 4 vues
 * - Visualisation 3D
 */
export const PartBuilderDemo: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <PartBuilder />
    </div>
  );
};

// Exemple d'utilisation avec données pré-remplies
export const PartBuilderDemoWithData: React.FC = () => {
  // Le composant peut être étendu pour accepter des props
  // comme initialElements, onSave, etc.

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <PartBuilder />
    </div>
  );
};

export default PartBuilderDemo;