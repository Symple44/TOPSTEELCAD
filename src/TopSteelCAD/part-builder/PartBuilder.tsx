import React from 'react';
import { DisplayMode } from './types/partBuilder.types';
import PartDataTable from './components/PartDataTable';
import PartDetailModal from './components/PartDetailModal';
import { ProfessionalViewer } from '../ProfessionalViewer';
import { convertPartElementToPivotElement } from './converters/partToPivot';
import { usePartBuilder } from './hooks/usePartBuilder';
import {
  containerStyle,
  headerStyle,
  toolbarStyle,
  toolbarGroupStyle,
  toolbarGroupAutoStyle,
  getContentStyle,
  footerStyle,
  footerStatsStyle,
  footerVersionStyle,
  getButtonVariant,
  getToggleButtonStyle,
  smallButtonStyle,
  getCardStyle,
  cardGridStyle,
  cardTitleStyle,
  cardDetailsStyle,
  cardButtonGroupStyle,
  modalOverlayStyle,
  modalContentStyle,
  modalHeaderStyle,
  modalTitleStyle,
  closeButtonStyle,
  selectStyle,
  hiddenInputStyle,
  titleStyle,
  subtitleStyle,
  ICONS
} from './styles/partBuilder.styles';


/**
 * Composant Part Builder Professional
 * Interface de création et gestion d'éléments métalliques
 */
export const PartBuilder: React.FC = () => {
  // Utilisation du hook personnalisé pour la logique métier
  const {
    state,
    dispatch,
    showDetailModal,
    setShowDetailModal,
    show3DViewer,
    setShow3DViewer,
    selectedElement3D,
    viewerTheme,
    setViewerTheme,
    selectedElement,
    fileInputRef,
    isLoading,
    error,
    handleAddElement,
    handleUpdateElement,
    handleDeleteElement,
    handleDuplicateElement,
    handleShowDetail,
    handleShow3D,
    handleSort,
    handleAddHole,
    handleEditHole,
    handleDeleteHole,
    handleExport,
    handleImportCSV
  } = usePartBuilder();


  // Affichage du message d'erreur si présent
  React.useEffect(() => {
    if (error) {
      console.error('Erreur Part Builder:', error);
      // TODO: Afficher une notification ou un toast
    }
  }, [error]);

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>
          {ICONS.building} Part Builder Professional - Système Modulaire
        </h1>
        <p style={subtitleStyle}>
          Création et gestion d'éléments métalliques avec support DSTV complet
        </p>
      </div>

      {/* Toolbar */}
      <div style={toolbarStyle}>
        {/* Boutons d'action */}
        <button onClick={handleAddElement} style={getButtonVariant('success')}>
          {ICONS.add} Nouvel élément
        </button>

        {/* Modes d'affichage */}
        <div style={toolbarGroupAutoStyle}>
          <button
            onClick={() => dispatch({ type: 'SET_DISPLAY_MODE', payload: DisplayMode.LIST })}
            style={getToggleButtonStyle(state.displayMode === DisplayMode.LIST)}
          >
            {ICONS.list} Mode Liste
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_DISPLAY_MODE', payload: DisplayMode.EXTENDED })}
            style={getToggleButtonStyle(state.displayMode === DisplayMode.EXTENDED)}
          >
            {ICONS.grid} Mode Étendu
          </button>
        </div>

        {/* Export/Import */}
        <div style={toolbarGroupStyle}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={getButtonVariant('secondary')}
            disabled={isLoading}
          >
            {ICONS.import} {isLoading ? 'Importation...' : 'Importer CSV'}
          </button>
          <select
            name="export-format"
            aria-label="Format d'export"
            onChange={(e) => {
              const value = e.target.value as 'DSTV' | 'CSV' | 'JSON' | 'IFC' | 'STEP';
              if (value) {
                handleExport(value);
                e.target.value = ''; // Reset selection
              }
            }}
            style={selectStyle}
            defaultValue=""
            disabled={isLoading || state.elements.length === 0}
          >
            <option value="" disabled>{ICONS.export} Exporter...</option>
            <option value="CSV">CSV (Excel)</option>
            <option value="JSON">JSON</option>
            <option value="DSTV">DSTV (NC)</option>
            <option value="IFC">IFC (BIM)</option>
            <option value="STEP">STEP (CAO)</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div style={getContentStyle(state.displayMode.toString())}>
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
          <div style={cardGridStyle}>
            {state.elements.map(element => (
              <div
                key={element.id}
                style={getCardStyle(state.selectedElementId === element.id)}
                onClick={() => dispatch({ type: 'SELECT_ELEMENT', payload: element.id })}
              >
                <h3 style={cardTitleStyle}>
                  {element.reference} - {element.designation}
                </h3>
                <div style={cardDetailsStyle}>
                  <div>Profil: {element.profileType} {element.profileSubType}</div>
                  <div>Longueur: {element.length}mm</div>
                  <div>Quantité: {element.quantity}</div>
                  <div>Matériau: {element.material}</div>
                  <div>Trous: {element.holes.length}</div>
                </div>
                <div style={cardButtonGroupStyle}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShowDetail(element.id);
                    }}
                    style={smallButtonStyle}
                  >
                    Détails
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShow3D(element.id);
                    }}
                    style={getButtonVariant('info')}
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
      <div style={footerStyle}>
        <div style={footerStatsStyle}>
          <strong>{state.elements.length}</strong> éléments |
          <strong> {state.elements.reduce((sum, el) => sum + el.quantity, 0)}</strong> pièces totales
        </div>
        <div style={footerVersionStyle}>
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
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={modalTitleStyle}>
                Visualisation 3D - {selectedElement3D.reference}
              </h2>
              <button
                onClick={() => setShow3DViewer(false)}
                style={closeButtonStyle}
                aria-label="Fermer"
              >
                {ICONS.close}
              </button>
            </div>
            <ProfessionalViewer
              elements={[convertPartElementToPivotElement(selectedElement3D)]}
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
        name="csv-import"
        aria-label="Importer un fichier CSV"
        tabIndex={-1}
        onChange={handleImportCSV}
        style={hiddenInputStyle}
      />
    </div>
  );
};

export default PartBuilder;