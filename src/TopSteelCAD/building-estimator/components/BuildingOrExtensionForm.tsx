/**
 * Formulaire unifié pour Bâtiment principal et Extensions
 * Building Estimator - TopSteelCAD
 */

import React from 'react';
import { BuildingType, BuildingExtension, BuildingDimensions, BuildingParameters, ExtensionAttachmentType, GuardrailType, OmbriereStructuralVariant } from '../types';
import { ExtensionPositionSelector } from './ExtensionPositionSelector';
import { CustomSpacingEditor } from './CustomSpacingEditor';
import { PostHeightEditor } from './PostHeightEditor';
import { getBuildingTypeConfig } from '../core/BuildingTypeConfigRegistry';
import {
  formSectionStyle,
  formRowStyle,
  formGroupStyle,
  labelStyle,
  inputStyle,
  selectStyle,
  buttonStyle,
  cardTitleStyle
} from '../styles/buildingEstimator.styles';

interface BuildingOrExtensionFormProps {
  // Type : bâtiment principal ou extension
  itemType: 'main' | 'extension';

  // Données communes
  type: BuildingType;
  dimensions: BuildingDimensions | any;
  parameters: BuildingParameters;

  // Données spécifiques aux extensions
  extension?: BuildingExtension;
  extensions?: BuildingExtension[]; // Liste pour le dropdown parent

  // Dimensions du parent (pour le sélecteur de position)
  parentLength?: number;
  parentWidth?: number;
  parentPostSpacing?: number;
  parentName?: string;

  // Callbacks
  onTypeChange: (type: BuildingType) => void;
  onDimensionsChange: (dims: Partial<BuildingDimensions>) => void;
  onParametersChange: (params: Partial<BuildingParameters>) => void;
  onExtensionFieldChange?: (field: string, value: any) => void;
  onDelete?: () => void;
}

export const BuildingOrExtensionForm: React.FC<BuildingOrExtensionFormProps> = ({
  itemType,
  type,
  dimensions,
  parameters,
  extension,
  extensions = [],
  parentLength,
  parentWidth,
  parentPostSpacing,
  parentName,
  onTypeChange,
  onDimensionsChange,
  onParametersChange,
  onExtensionFieldChange,
  onDelete
}) => {
  const isMain = itemType === 'main';
  const isExtension = itemType === 'extension';

  // Détection mobile
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 640);
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * Vérifie si targetExtension est un descendant (fille, petite-fille, etc.) de currentExtension
   */
  const isDescendantOf = (currentExtension: BuildingExtension, targetExtension: BuildingExtension): boolean => {
    if (!targetExtension.parentId) return false;
    if (targetExtension.parentId === currentExtension.id) return true;

    // Recherche récursive dans les parents
    const parent = extensions.find(e => e.id === targetExtension.parentId);
    if (!parent) return false;

    return isDescendantOf(currentExtension, parent);
  };

  // Récupérer la configuration du type de bâtiment
  const typeConfig = getBuildingTypeConfig(type);

  return (
    <div>
      {/* Configuration */}
      <div style={formSectionStyle}>
        <h3 style={cardTitleStyle}>⚙️ Configuration</h3>

        <div style={formRowStyle}>
          {/* Attacher à (Extensions uniquement) */}
          {isExtension && extension && (
            <div style={formGroupStyle}>
              <label style={labelStyle}>Attacher à</label>
              <select
                style={selectStyle}
                value={extension.parentId || ''}
                onChange={(e) => onExtensionFieldChange?.('parentId', e.target.value || undefined)}
              >
                <option value="">🏢 Bâtiment principal</option>
                {extensions
                  .filter(ext => ext.id !== extension.id) // Ne pas se sélectionner soi-même
                  .map((ext) => {
                    // Vérifier si ext est un descendant de l'extension courante
                    const isDescendant = isDescendantOf(extension, ext);
                    return (
                      <option
                        key={ext.id}
                        value={ext.id}
                        disabled={isDescendant}
                        style={{ color: isDescendant ? '#9ca3af' : 'inherit' }}
                      >
                        ➕ {ext.name} ({ext.type}) {isDescendant ? '(⚠️ fille)' : ''}
                      </option>
                    );
                  })
                }
              </select>
            </div>
          )}

          {/* Type de structure */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>Type{isMobile ? '' : ' de structure'}</label>
            <select
              style={{
                ...selectStyle,
                fontSize: isMobile ? '0.85rem' : '14px'
              }}
              value={type}
              onChange={(e) => onTypeChange(e.target.value as BuildingType)}
            >
              <option value={BuildingType.MONO_PENTE}>{isMobile ? '🔻 Monopente' : '🔻 Monopente'}</option>
              <option value={BuildingType.BI_PENTE}>{isMobile ? '🏠 Bipente sym.' : '🏠 Bipente symétrique'}</option>
              <option value={BuildingType.BI_PENTE_ASYM}>{isMobile ? '🏘️ Bipente asym.' : '🏘️ Bipente asymétrique'}</option>
              <option value={BuildingType.AUVENT}>{isMobile ? '⛱️ Auvent' : '⛱️ Auvent'}</option>
              <option value={BuildingType.PLANCHER}>{isMobile ? '🏢 Plancher' : '🏢 Plancher'}</option>
              <option value={BuildingType.OMBRIERE}>{isMobile ? '☀️ Ombrière PV' : '☀️ Ombrière Photovoltaïque'}</option>
            </select>
          </div>
        </div>

        {/* Variante structurelle (seulement pour types avec variants) */}
        {typeConfig.hasStructuralVariants && type === BuildingType.OMBRIERE && (
          <div style={formRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Variante{isMobile ? '' : ' structurelle'}</label>
              <select
                style={{
                  ...selectStyle,
                  fontSize: isMobile ? '0.85rem' : '14px'
                }}
                value={(dimensions as any).structuralVariant || OmbriereStructuralVariant.CENTERED_POST}
                onChange={(e) => onDimensionsChange({ structuralVariant: e.target.value } as any)}
              >
                <option value={OmbriereStructuralVariant.CENTERED_POST}>
                  {isMobile ? '🔹 Poteau centré' : '🔹 Poteaux centrés (simple, économique)'}
                </option>
                <option value={OmbriereStructuralVariant.DOUBLE_CENTERED_POST}>
                  {isMobile ? '🔹🔹 Double centré' : '🔹🔹 Double poteaux centrés (résistance, modulaire)'}
                </option>
                <option value={OmbriereStructuralVariant.Y_SHAPED}>
                  {isMobile ? '🔻 En Y' : '🔻 En Y (poteau bas, 2 traverses hautes en pente)'}
                </option>
                <option value={OmbriereStructuralVariant.OFFSET_POST}>
                  {isMobile ? '⬅️ Déporté' : '⬅️ Poteau déporté unique (porte-à-faux)'}
                </option>
              </select>
              <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                {(dimensions as any).structuralVariant === OmbriereStructuralVariant.CENTERED_POST &&
                  'Usage: Petites/moyennes ombrières (< 20m portée) - Simple et économique'}
                {(dimensions as any).structuralVariant === OmbriereStructuralVariant.DOUBLE_CENTERED_POST &&
                  'Usage: Ombrières moyennes (15-30m portée) - Résistance accrue'}
                {(dimensions as any).structuralVariant === OmbriereStructuralVariant.Y_SHAPED &&
                  'Usage: Design moderne - Poteau central bas, traverses latérales hautes en pente'}
                {(dimensions as any).structuralVariant === OmbriereStructuralVariant.OFFSET_POST &&
                  'Usage: Grandes ombrières (> 20m portée) - Espace libre maximal, poutre en console'}
              </small>
            </div>
          </div>
        )}

        <div style={formRowStyle}>
          {/* Largeur (pour extensions, c'est la largeur de l'extension) */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>
              {isMobile
                ? (isExtension ? 'Largeur (mm)' : 'Largeur (mm)')
                : (isExtension ? 'Largeur extension (mm)' : 'Largeur/Portée (mm)')}
            </label>
            <input
              type="number"
              style={inputStyle}
              value={dimensions.width || 5000}
              onChange={(e) => onDimensionsChange({ width: parseInt(e.target.value) })}
              min={3000}
              max={50000}
              step={500}
            />
          </div>
        </div>

        <div style={formRowStyle}>
          {/* Longueur (seulement pour bâtiment principal) */}
          {isMain && (
            <div style={formGroupStyle}>
              <label style={labelStyle}>Longueur (mm)</label>
              <input
                type="number"
                style={inputStyle}
                value={dimensions.length || 20000}
                onChange={(e) => onDimensionsChange({ length: parseInt(e.target.value) })}
                min={3000}
                max={100000}
                step={1000}
              />
            </div>
          )}

          {/* Hauteur au mur (selon config) */}
          {!typeConfig.hasClearHeight && type !== BuildingType.BI_PENTE_ASYM && (
            <div style={formGroupStyle}>
              <label style={labelStyle}>{isMobile ? 'H. mur (mm)' : 'Hauteur au mur (mm)'}</label>
              <input
                type="number"
                style={inputStyle}
                value={dimensions.heightWall || 3000}
                onChange={(e) => onDimensionsChange({ heightWall: parseInt(e.target.value) })}
                min={2500}
                max={20000}
                step={500}
              />
            </div>
          )}

          {/* Hauteur libre (selon config) */}
          {typeConfig.hasClearHeight && (
            <div style={formGroupStyle}>
              <label style={labelStyle}>{isMobile ? 'H. libre (mm)' : 'Hauteur libre (mm)'}</label>
              <input
                type="number"
                style={inputStyle}
                value={(dimensions as any).clearHeight || 2500}
                onChange={(e) => onDimensionsChange({ clearHeight: parseInt(e.target.value) } as any)}
                min={2000}
                max={4000}
                step={100}
              />
              <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Hauteur de passage sous structure
              </small>
            </div>
          )}

          {/* Pente (selon config) */}
          {typeConfig.hasSlope && (
            <div style={formGroupStyle}>
              <label style={labelStyle}>Pente (%)</label>
              <input
                type="number"
                style={inputStyle}
                value={dimensions.slope || 10}
                onChange={(e) => onDimensionsChange({ slope: parseInt(e.target.value) })}
                min={3}
                max={50}
                step={1}
              />
            </div>
          )}

          {/* Inclinaison panneaux (selon config) */}
          {typeConfig.hasTilt && (
            <div style={formGroupStyle}>
              <label style={labelStyle}>{isMobile ? 'Inclin. (°)' : 'Inclinaison panneaux (°)'}</label>
              <input
                type="number"
                style={inputStyle}
                value={(dimensions as any).tilt || 15}
                onChange={(e) => onDimensionsChange({ tilt: parseInt(e.target.value) } as any)}
                min={0}
                max={30}
                step={1}
              />
              <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Optimal: 15-20° en France
              </small>
            </div>
          )}
        </div>

        {/* Hauteurs spécifiques pour bipente asymétrique */}
        {type === BuildingType.BI_PENTE_ASYM && (
          <>
            <div style={formRowStyle}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Hauteur mur gauche (mm)</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={dimensions.leftWallHeight || dimensions.heightWall || 3000}
                  onChange={(e) => {
                    const newLeftHeight = parseInt(e.target.value);
                    const ridgePos = (dimensions.width * (dimensions.ridgeOffset || 50)) / 100;
                    const rightHeight = (dimensions.rightWallHeight || dimensions.heightWall || 3000);
                    const rightRise = ((dimensions.width - ridgePos) * (dimensions.rightSlope || 10)) / 100;
                    const currentRidgeHeight = rightHeight + rightRise;

                    // Recalculer leftSlope pour maintenir ridgeHeight
                    const newLeftSlope = ((currentRidgeHeight - newLeftHeight) / ridgePos) * 100;

                    onDimensionsChange({
                      leftWallHeight: newLeftHeight,
                      leftSlope: Math.max(3, Math.min(200, newLeftSlope))
                    });
                  }}
                  min={2500}
                  max={20000}
                  step={500}
                />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Hauteur mur droit (mm)</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={dimensions.rightWallHeight || dimensions.heightWall || 3000}
                  onChange={(e) => {
                    const newRightHeight = parseInt(e.target.value);
                    const ridgePos = (dimensions.width * (dimensions.ridgeOffset || 50)) / 100;
                    const leftHeight = (dimensions.leftWallHeight || dimensions.heightWall || 3000);
                    const leftRise = (ridgePos * (dimensions.leftSlope || 10)) / 100;
                    const currentRidgeHeight = leftHeight + leftRise;

                    // Recalculer rightSlope pour maintenir ridgeHeight
                    const newRightSlope = ((currentRidgeHeight - newRightHeight) / (dimensions.width - ridgePos)) * 100;

                    onDimensionsChange({
                      rightWallHeight: newRightHeight,
                      rightSlope: Math.max(3, Math.min(200, newRightSlope))
                    });
                  }}
                  min={2500}
                  max={20000}
                  step={500}
                />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Pente gauche (%)</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={dimensions.leftSlope || 10}
                  onChange={(e) => {
                    const newLeftSlope = parseInt(e.target.value);
                    const ridgePos = (dimensions.width * (dimensions.ridgeOffset || 50)) / 100;
                    const leftHeight = (dimensions.leftWallHeight || dimensions.heightWall || 3000);
                    const leftRise = (ridgePos * newLeftSlope) / 100;
                    const newRidgeHeight = leftHeight + leftRise;

                    const rightHeight = (dimensions.rightWallHeight || dimensions.heightWall || 3000);
                    const rightRise = newRidgeHeight - rightHeight;
                    const newRightSlope = (rightRise / (dimensions.width - ridgePos)) * 100;

                    onDimensionsChange({
                      leftSlope: newLeftSlope,
                      rightSlope: Math.max(3, Math.min(200, newRightSlope))
                    });
                  }}
                  min={3}
                  max={200}
                  step={1}
                />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Pente droite (%)</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={dimensions.rightSlope || 10}
                  onChange={(e) => {
                    const newRightSlope = parseInt(e.target.value);
                    const ridgePos = (dimensions.width * (dimensions.ridgeOffset || 50)) / 100;
                    const rightHeight = (dimensions.rightWallHeight || dimensions.heightWall || 3000);
                    const rightRise = ((dimensions.width - ridgePos) * newRightSlope) / 100;
                    const newRidgeHeight = rightHeight + rightRise;

                    const leftHeight = (dimensions.leftWallHeight || dimensions.heightWall || 3000);
                    const leftRise = newRidgeHeight - leftHeight;
                    const newLeftSlope = (leftRise / ridgePos) * 100;

                    onDimensionsChange({
                      rightSlope: newRightSlope,
                      leftSlope: Math.max(3, Math.min(200, newLeftSlope))
                    });
                  }}
                  min={3}
                  max={200}
                  step={1}
                />
              </div>
            </div>
            <div style={formRowStyle}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Position du faîtage (% de la largeur)</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={dimensions.ridgeOffset || 50}
                  onChange={(e) => {
                    const newOffset = parseInt(e.target.value);
                    const ridgePos = (dimensions.width * newOffset) / 100;
                    const leftRise = (ridgePos * (dimensions.leftSlope || 10)) / 100;
                    const rightRise = ((dimensions.width - ridgePos) * (dimensions.rightSlope || 10)) / 100;
                    const leftHeight = (dimensions.leftWallHeight || dimensions.heightWall || 3000);
                    const rightHeight = (dimensions.rightWallHeight || dimensions.heightWall || 3000);
                    const currentRidgeHeight = Math.max(leftHeight + leftRise, rightHeight + rightRise);

                    // Recalculer les pentes pour maintenir la hauteur au faîtage
                    const newLeftSlope = ((currentRidgeHeight - leftHeight) / ridgePos) * 100;
                    const newRightSlope = ((currentRidgeHeight - rightHeight) / (dimensions.width - ridgePos)) * 100;

                    onDimensionsChange({
                      ridgeOffset: newOffset,
                      leftSlope: Math.max(3, Math.min(200, newLeftSlope)),
                      rightSlope: Math.max(3, Math.min(200, newRightSlope))
                    });
                  }}
                  min={10}
                  max={90}
                  step={5}
                />
                <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  50% = centré, &lt;50% = déporté à gauche, &gt;50% = déporté à droite
                </small>
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Position du faîtage (mm)</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={((dimensions.width * (dimensions.ridgeOffset || 50)) / 100).toFixed(0)}
                  onChange={(e) => {
                    const newPosMm = parseInt(e.target.value);
                    const newOffset = (newPosMm / dimensions.width) * 100;
                    const ridgePos = newPosMm;
                    const leftRise = (ridgePos * (dimensions.leftSlope || 10)) / 100;
                    const rightRise = ((dimensions.width - ridgePos) * (dimensions.rightSlope || 10)) / 100;
                    const leftHeight = (dimensions.leftWallHeight || dimensions.heightWall || 3000);
                    const rightHeight = (dimensions.rightWallHeight || dimensions.heightWall || 3000);
                    const currentRidgeHeight = Math.max(leftHeight + leftRise, rightHeight + rightRise);

                    // Recalculer les pentes pour maintenir la hauteur au faîtage
                    const newLeftSlope = ((currentRidgeHeight - leftHeight) / ridgePos) * 100;
                    const newRightSlope = ((currentRidgeHeight - rightHeight) / (dimensions.width - ridgePos)) * 100;

                    onDimensionsChange({
                      ridgeOffset: Math.max(10, Math.min(90, newOffset)),
                      leftSlope: Math.max(3, Math.min(200, newLeftSlope)),
                      rightSlope: Math.max(3, Math.min(200, newRightSlope))
                    });
                  }}
                  min={(dimensions.width * 10) / 100}
                  max={(dimensions.width * 90) / 100}
                  step={100}
                />
                <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Position absolue en mm
                </small>
              </div>
            </div>

            {/* Affichage calculé de la hauteur au faîtage */}
            <div style={{
              padding: '12px 16px',
              background: '#f0fdf4',
              border: '2px solid #86efac',
              borderRadius: '8px',
              marginTop: '10px'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#166534', marginBottom: '4px' }}>
                📐 Hauteur au faîtage calculée
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#15803d' }}>
                {(() => {
                  const ridgePos = (dimensions.width * (dimensions.ridgeOffset || 50)) / 100;
                  const leftHeight = (dimensions.leftWallHeight || dimensions.heightWall || 3000);
                  const rightHeight = (dimensions.rightWallHeight || dimensions.heightWall || 3000);
                  const leftRise = (ridgePos * (dimensions.leftSlope || 10)) / 100;
                  const rightRise = ((dimensions.width - ridgePos) * (dimensions.rightSlope || 10)) / 100;
                  const ridgeHeight = Math.max(leftHeight + leftRise, rightHeight + rightRise);
                  return ridgeHeight.toFixed(0);
                })()}
                {' mm'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#65a30d', marginTop: '4px' }}>
                Gauche: {(dimensions.leftWallHeight || dimensions.heightWall || 3000).toFixed(0)}mm + {(((dimensions.width * (dimensions.ridgeOffset || 50)) / 100) * (dimensions.leftSlope || 10) / 100).toFixed(0)}mm = {((dimensions.leftWallHeight || dimensions.heightWall || 3000) + (((dimensions.width * (dimensions.ridgeOffset || 50)) / 100) * (dimensions.leftSlope || 10) / 100)).toFixed(0)}mm
                <br />
                Droit: {(dimensions.rightWallHeight || dimensions.heightWall || 3000).toFixed(0)}mm + {((dimensions.width - ((dimensions.width * (dimensions.ridgeOffset || 50)) / 100)) * (dimensions.rightSlope || 10) / 100).toFixed(0)}mm = {((dimensions.rightWallHeight || dimensions.heightWall || 3000) + ((dimensions.width - ((dimensions.width * (dimensions.ridgeOffset || 50)) / 100)) * (dimensions.rightSlope || 10) / 100)).toFixed(0)}mm
              </div>
            </div>
          </>
        )}

        {/* Poteaux intermédiaires pour plancher */}
        {type === BuildingType.PLANCHER && (
          <div style={formRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Poteaux intermédiaires par portique</label>
              <input
                type="number"
                style={inputStyle}
                value={parameters.intermediatePostsCount || 0}
                onChange={(e) => onParametersChange({ intermediatePostsCount: parseInt(e.target.value) })}
                min={0}
                max={10}
                step={1}
              />
              <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                Nombre de poteaux entre l'avant et l'arrière (0 = pas de poteaux intermédiaires)
              </small>
            </div>
          </div>
        )}

        {/* Débords de couverture */}
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 15px 0', fontSize: '0.95rem', fontWeight: '600', color: '#475569' }}>
            📏 Débords de couverture
          </h4>
          <div style={formRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Débord pignon gauche (mm)</label>
              <input
                type="number"
                style={inputStyle}
                value={dimensions.overhangGableLeft || 0}
                onChange={(e) => onDimensionsChange({ overhangGableLeft: parseInt(e.target.value) })}
                min={-500}
                max={2000}
                step={50}
              />
              <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Positif = débord, négatif = retrait
              </small>
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Débord pignon droit (mm)</label>
              <input
                type="number"
                style={inputStyle}
                value={dimensions.overhangGableRight || 0}
                onChange={(e) => onDimensionsChange({ overhangGableRight: parseInt(e.target.value) })}
                min={-500}
                max={2000}
                step={50}
              />
              <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Positif = débord, négatif = retrait
              </small>
            </div>
          </div>
          <div style={formRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Débord long-pan avant (mm)</label>
              <input
                type="number"
                style={inputStyle}
                value={dimensions.overhangLongPanFront || 0}
                onChange={(e) => onDimensionsChange({ overhangLongPanFront: parseInt(e.target.value) })}
                min={-500}
                max={2000}
                step={50}
              />
              <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Positif = débord, négatif = retrait
              </small>
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Débord long-pan arrière (mm)</label>
              <input
                type="number"
                style={inputStyle}
                value={dimensions.overhangLongPanBack || 0}
                onChange={(e) => onDimensionsChange({ overhangLongPanBack: parseInt(e.target.value) })}
                min={-500}
                max={2000}
                step={50}
              />
              <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Positif = débord, négatif = retrait
              </small>
            </div>
          </div>
        </div>

        {/* Inverser la pente (Extensions uniquement pour monopente/auvent) */}
        {isExtension && extension && (type === BuildingType.MONO_PENTE || type === BuildingType.AUVENT) && (
          <div style={formRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>
                <input
                  type="checkbox"
                  checked={extension.reversedSlope || false}
                  onChange={(e) => onExtensionFieldChange?.('reversedSlope', e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                Inverser la pente (bas côté extérieur)
              </label>
            </div>
          </div>
        )}

        {/* Suivre dimensions parent (Extensions attachées) */}
        {isExtension && extension && (
          extension.attachmentType === ExtensionAttachmentType.LONG_PAN ||
          extension.attachmentType === ExtensionAttachmentType.TRAVEE ||
          extension.attachmentType === ExtensionAttachmentType.PIGNON_GAUCHE ||
          extension.attachmentType === ExtensionAttachmentType.PIGNON_DROIT
        ) && (
          <div style={formRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>
                <input
                  type="checkbox"
                  checked={extension.followParentDimensions !== false}
                  onChange={(e) => onExtensionFieldChange?.('followParentDimensions', e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                Suivre automatiquement les dimensions du parent
              </label>
              <small style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '4px', marginLeft: '26px' }}>
                {extension.attachmentType === ExtensionAttachmentType.PIGNON_GAUCHE || extension.attachmentType === ExtensionAttachmentType.PIGNON_DROIT
                  ? "Si activé, l'extension s'adaptera automatiquement aux modifications de largeur du parent"
                  : "Si activé, l'extension s'adaptera automatiquement aux modifications de longueur/entraxe du parent"}
              </small>
            </div>
          </div>
        )}
      </div>

      {/* Sélecteur de position (Extensions uniquement) */}
      {isExtension && extension && parentLength && parentWidth && parentPostSpacing && (
        <ExtensionPositionSelector
          buildingLength={parentLength}
          buildingWidth={parentWidth}
          postSpacing={parentPostSpacing}
          selectedSide={extension.side || 'front'}
          selectedAttachmentType={extension.attachmentType || ExtensionAttachmentType.LONG_PAN}
          selectedBayIndex={extension.bayIndex}
          parentName={parentName}
          onSideChange={(side) => onExtensionFieldChange?.('side', side)}
          onAttachmentTypeChange={(type) => onExtensionFieldChange?.('attachmentType', type)}
          onBayIndexChange={(index) => onExtensionFieldChange?.('bayIndex', index)}
        />
      )}

      {/* Profils structurels */}
      <div style={formSectionStyle}>
        <h3 style={cardTitleStyle}>🏗️ Profils Structurels</h3>

        <div style={formRowStyle}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Poteaux</label>
            <select
              style={selectStyle}
              value={parameters.postProfile}
              onChange={(e) => onParametersChange({ postProfile: e.target.value })}
            >
              <option value="IPE 180">IPE 180</option>
              <option value="IPE 200">IPE 200</option>
              <option value="IPE 220">IPE 220</option>
              <option value="IPE 240">IPE 240</option>
              <option value="IPE 270">IPE 270</option>
              <option value="IPE 300">IPE 300</option>
              <option value="HEA 200">HEA 200</option>
              <option value="HEA 220">HEA 220</option>
              <option value="HEA 240">HEA 240</option>
              <option value="HEB 200">HEB 200</option>
              <option value="HEB 220">HEB 220</option>
              <option value="HEB 240">HEB 240</option>
            </select>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Arbalétriers</label>
            <select
              style={selectStyle}
              value={parameters.rafterProfile}
              onChange={(e) => onParametersChange({ rafterProfile: e.target.value })}
            >
              <option value="IPE 140">IPE 140</option>
              <option value="IPE 160">IPE 160</option>
              <option value="IPE 180">IPE 180</option>
              <option value="IPE 200">IPE 200</option>
              <option value="IPE 220">IPE 220</option>
              <option value="IPE 240">IPE 240</option>
              <option value="IPE 270">IPE 270</option>
            </select>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Pannes</label>
            <select
              style={selectStyle}
              value={parameters.purlinProfile}
              onChange={(e) => onParametersChange({ purlinProfile: e.target.value })}
            >
              <option value="IPE 100">IPE 100</option>
              <option value="IPE 120">IPE 120</option>
              <option value="IPE 140">IPE 140</option>
              <option value="IPE 160">IPE 160</option>
              <option value="IPE 180">IPE 180</option>
            </select>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Lisses</label>
            <select
              style={selectStyle}
              value={parameters.railProfile}
              onChange={(e) => onParametersChange({ railProfile: e.target.value })}
            >
              <option value="UAP 65">UAP 65</option>
              <option value="UAP 80">UAP 80</option>
              <option value="UAP 100">UAP 100</option>
              <option value="UAP 120">UAP 120</option>
              <option value="UPN 80">UPN 80</option>
              <option value="UPN 100">UPN 100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Entraxes */}
      <div style={formSectionStyle}>
        <h3 style={cardTitleStyle}>📏 Entraxes</h3>

        <div style={formRowStyle}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>{isMobile ? 'Entraxe pot. (mm)' : 'Entraxe Poteaux (mm)'}</label>
            <input
              type="number"
              style={inputStyle}
              value={parameters.postSpacing}
              onChange={(e) => onParametersChange({ postSpacing: parseInt(e.target.value) })}
              min={3000}
              max={8000}
              step={500}
              disabled={
                parameters.customSpacingMode ||
                (isExtension && extension?.followParentDimensions !== false &&
                 (extension?.attachmentType === ExtensionAttachmentType.LONG_PAN ||
                  extension?.attachmentType === ExtensionAttachmentType.TRAVEE))
              }
            />
            {parameters.customSpacingMode && (
              <small style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '4px', fontWeight: '600' }}>
                ⚠️ Mode personnalisé actif
              </small>
            )}
            {isExtension && extension?.followParentDimensions !== false &&
             (extension?.attachmentType === ExtensionAttachmentType.LONG_PAN ||
              extension?.attachmentType === ExtensionAttachmentType.TRAVEE) && (
              <small style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '4px', fontWeight: '600' }}>
                ℹ️ Hérité du parent
              </small>
            )}
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>{isMobile ? 'Entraxe pan. (mm)' : 'Entraxe Pannes (mm)'}</label>
            <input
              type="number"
              style={inputStyle}
              value={parameters.purlinSpacing}
              onChange={(e) => onParametersChange({ purlinSpacing: parseInt(e.target.value) })}
              min={1000}
              max={2500}
              step={100}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>{isMobile ? 'Entraxe lis. (mm)' : 'Entraxe Lisses (mm)'}</label>
            <input
              type="number"
              style={inputStyle}
              value={parameters.railSpacing}
              onChange={(e) => onParametersChange({ railSpacing: parseInt(e.target.value) })}
              min={800}
              max={2000}
              step={100}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Nuance Acier</label>
            <select
              style={selectStyle}
              value={parameters.steelGrade}
              onChange={(e) => onParametersChange({ steelGrade: e.target.value })}
            >
              <option value="S235">S235</option>
              <option value="S275">S275</option>
              <option value="S355">S355</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mode personnalisé pour les entraxes */}
      {/* Masquer pour les extensions suivant le parent (LONG_PAN/TRAVEE) */}
      {!(isExtension && extension?.followParentDimensions !== false &&
         (extension?.attachmentType === ExtensionAttachmentType.LONG_PAN ||
          extension?.attachmentType === ExtensionAttachmentType.TRAVEE)) && (
        <CustomSpacingEditor
          buildingLength={isMain ? dimensions.length : (parentLength || dimensions.length || 20000)}
          parameters={parameters}
          onParametersChange={onParametersChange}
        />
      )}

      {/* Ajustement des hauteurs de poteaux (toujours actif) */}
      <PostHeightEditor
        buildingLength={isMain ? dimensions.length : (parentLength || dimensions.length || 20000)}
        buildingType={type}
        dimensions={dimensions}
        parameters={parameters}
        onParametersChange={onParametersChange}
      />
    </div>
  );
};
