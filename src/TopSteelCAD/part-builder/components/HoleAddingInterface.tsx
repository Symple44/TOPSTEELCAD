import React, { useState } from 'react';
import { HoleDSTV, DSTVFace, PartElement } from '../types/partBuilder.types';

// Types pour les patterns de trous
export enum HolePatternType {
  SINGLE = 'single',
  LINEAR = 'linear',
  GRID = 'grid',
  CIRCULAR = 'circular'
}

export enum HoleType {
  THROUGH = 'through',      // Traversant
  BLIND = 'blind',          // Borgne
  THREADED = 'threaded',    // Fileté
  COUNTERSUNK = 'countersunk', // Fraisé
  COUNTERBORE = 'counterbore'  // Lamé
}

interface HolePattern {
  type: HolePatternType;
  count?: number;           // Pour linéaire
  spacing?: number;         // Espacement entre trous
  rows?: number;            // Pour grille
  columns?: number;         // Pour grille
  rowSpacing?: number;      // Espacement lignes
  columnSpacing?: number;   // Espacement colonnes
  radius?: number;          // Pour circulaire
  angle?: number;           // Angle pour circulaire
  referencePoint: 'center' | 'topLeft' | 'bottomLeft'; // Point de référence
}

interface HoleAddingInterfaceProps {
  element: PartElement;
  holes: HoleDSTV[];
  onAddHole: (holes: HoleDSTV[]) => void;
  onEditHole: (id: string, hole: HoleDSTV) => void;
  onDeleteHole: (id: string) => void;
  onClose?: () => void;
}

// Fonction pour obtenir le prochain label de trou
const getNextHoleLabel = (existingHoles: HoleDSTV[]): string => {
  const labels = existingHoles.map(h => h.label || '').filter(Boolean);
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  for (let i = 0; i < letters.length; i++) {
    if (!labels.includes(letters[i])) {
      return letters[i];
    }
  }

  // Si toutes les lettres simples sont utilisées, utiliser AA, AB, etc.
  for (let i = 0; i < letters.length; i++) {
    for (let j = 0; j < letters.length; j++) {
      const label = letters[i] + letters[j];
      if (!labels.includes(label)) {
        return label;
      }
    }
  }

  return `H${existingHoles.length + 1}`;
};

// Fonction pour déterminer les faces disponibles selon le type de profil
const getAvailableFaces = (profileType: string): DSTVFace[] => {
  // Types I, H (IPE, HEA, HEB, HEM)
  if (['IPE', 'HEA', 'HEB', 'HEM'].includes(profileType)) {
    return [
      DSTVFace.TOP,     // Semelle supérieure
      DSTVFace.BOTTOM,  // Semelle inférieure
      DSTVFace.FRONT,   // Âme (face avant)
      DSTVFace.BACK     // Âme (face arrière)
    ];
  }

  // Types U (UPN, UAP, UPE)
  if (['UPN', 'UAP', 'UPE'].includes(profileType)) {
    return [
      DSTVFace.TOP,     // Aile supérieure
      DSTVFace.BOTTOM,  // Aile inférieure
      DSTVFace.FRONT,   // Âme
      DSTVFace.BACK     // Dos
    ];
  }

  // Type L (cornières)
  if (profileType === 'L') {
    return [
      DSTVFace.LEFT,    // Aile verticale
      DSTVFace.RIGHT,   // Aile horizontale
      DSTVFace.FRONT,   // Face avant
      DSTVFace.BACK     // Face arrière
    ];
  }

  // Tubes rectangulaires et carrés
  if (['TUBE_RECT', 'TUBE_CARRE', 'RHS', 'SHS'].includes(profileType)) {
    return [
      DSTVFace.TOP,
      DSTVFace.BOTTOM,
      DSTVFace.LEFT,
      DSTVFace.RIGHT
    ];
  }

  // Tubes ronds
  if (['TUBE_ROND', 'CHS'].includes(profileType)) {
    return [DSTVFace.RADIAL]; // Position radiale avec angle
  }

  // Par défaut
  return [DSTVFace.TOP, DSTVFace.BOTTOM, DSTVFace.FRONT, DSTVFace.BACK];
};

export const HoleAddingInterface: React.FC<HoleAddingInterfaceProps> = ({
  element,
  holes,
  onAddHole,
  onEditHole: _onEditHole,
  onDeleteHole,
  onClose
}) => {
  // États pour le nouveau trou
  const [selectedFace, setSelectedFace] = useState<DSTVFace>(DSTVFace.TOP);
  const [patternType, setPatternType] = useState<HolePatternType>(HolePatternType.SINGLE);
  const [holeType, setHoleType] = useState<HoleType>(HoleType.THROUGH);
  const [diameter, setDiameter] = useState<number>(20);
  const [depth, setDepth] = useState<number>(10);
  const [positionX, setPositionX] = useState<number>(100);
  const [positionY, setPositionY] = useState<number>(50);
  const [pattern, setPattern] = useState<HolePattern>({
    type: HolePatternType.SINGLE,
    referencePoint: 'center'
  });

  // États pour la sélection et l'édition
  const [selectedHoleId, setSelectedHoleId] = useState<string | null>(null);
  // const [editingHoleId, setEditingHoleId] = useState<string | null>(null);
  const [hoveredHoleId, setHoveredHoleId] = useState<string | null>(null);

  const availableFaces = getAvailableFaces(element.profileType);

  // Styles
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    overflow: 'hidden'
  };

  const headerStyle: React.CSSProperties = {
    padding: '16px 20px',
    backgroundColor: '#2c3e50',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const mainContentStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    gap: '20px',
    overflowY: 'auto'
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  // Fonction pour générer les trous selon le pattern
  const generateHoles = (): HoleDSTV[] => {
    const baseLabel = getNextHoleLabel(holes);
    const generatedHoles: HoleDSTV[] = [];

    if (pattern.type === HolePatternType.SINGLE) {
      generatedHoles.push({
        id: `hole-${Date.now()}`,
        label: baseLabel,
        diameter,
        coordinates: { face: selectedFace, x: positionX, y: positionY },
        isThrough: holeType === HoleType.THROUGH,
        depth: holeType !== HoleType.THROUGH ? depth : undefined,
        type: holeType
      });
    } else if (pattern.type === HolePatternType.LINEAR) {
      const count = pattern.count || 2;
      const spacing = pattern.spacing || 50;

      for (let i = 0; i < count; i++) {
        const offsetX = selectedFace === DSTVFace.TOP || selectedFace === DSTVFace.BOTTOM
          ? positionX + (i * spacing)
          : positionX;
        const offsetY = selectedFace === DSTVFace.FRONT || selectedFace === DSTVFace.BACK
          ? positionY + (i * spacing)
          : positionY;

        generatedHoles.push({
          id: `hole-${Date.now()}-${i}`,
          label: count > 1 ? `${baseLabel}${i + 1}` : baseLabel,
          diameter,
          coordinates: { face: selectedFace, x: offsetX, y: offsetY },
          isThrough: holeType === HoleType.THROUGH,
          depth: holeType !== HoleType.THROUGH ? depth : undefined,
          type: holeType
        });
      }
    } else if (pattern.type === HolePatternType.GRID) {
      const rows = pattern.rows || 2;
      const cols = pattern.columns || 2;
      const rowSpacing = pattern.rowSpacing || 50;
      const colSpacing = pattern.columnSpacing || 50;

      let holeIndex = 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const offsetX = positionX + (col * colSpacing);
          const offsetY = positionY + (row * rowSpacing);

          generatedHoles.push({
            id: `hole-${Date.now()}-${holeIndex}`,
            label: `${baseLabel}${holeIndex + 1}`,
            diameter,
            coordinates: { face: selectedFace, x: offsetX, y: offsetY },
            isThrough: holeType === HoleType.THROUGH,
            depth: holeType !== HoleType.THROUGH ? depth : undefined,
            type: holeType
          });
          holeIndex++;
        }
      }
    }

    return generatedHoles;
  };

  // Fonction pour ajouter les trous
  const handleAddHoles = () => {
    const newHoles = generateHoles();
    onAddHole(newHoles);

    // Réinitialiser certains champs après ajout
    setPositionX(100);
    setPositionY(50);
  };

  // Fonction pour obtenir l'icône du profil
  const getProfileIcon = (profileType: string): React.ReactElement => {
    const style = { width: '60px', height: '60px', fill: 'none', stroke: '#2c3e50', strokeWidth: 2 };

    // Profils I/H
    if (['IPE', 'HEA', 'HEB', 'HEM'].includes(profileType)) {
      return (
        <svg viewBox="0 0 100 100" style={style}>
          <rect x="20" y="20" width="60" height="10" /> {/* Semelle sup */}
          <rect x="45" y="30" width="10" height="40" /> {/* Âme */}
          <rect x="20" y="70" width="60" height="10" /> {/* Semelle inf */}
        </svg>
      );
    }

    // Profils U
    if (['UPN', 'UAP', 'UPE'].includes(profileType)) {
      return (
        <svg viewBox="0 0 100 100" style={style}>
          <path d="M 20 20 L 20 80 L 30 80 L 30 30 L 70 30 L 70 80 L 80 80 L 80 20 Z" />
        </svg>
      );
    }

    // Profils L
    if (profileType === 'L') {
      return (
        <svg viewBox="0 0 100 100" style={style}>
          <path d="M 20 20 L 20 80 L 80 80 L 80 70 L 30 70 L 30 20 Z" />
        </svg>
      );
    }

    // Tubes rectangulaires
    if (['TUBE_RECT', 'RHS'].includes(profileType)) {
      return (
        <svg viewBox="0 0 100 100" style={style}>
          <rect x="20" y="30" width="60" height="40" fill="none" />
        </svg>
      );
    }

    // Tubes carrés
    if (['TUBE_CARRE', 'SHS'].includes(profileType)) {
      return (
        <svg viewBox="0 0 100 100" style={style}>
          <rect x="25" y="25" width="50" height="50" fill="none" />
        </svg>
      );
    }

    // Tubes ronds
    if (['TUBE_ROND', 'CHS'].includes(profileType)) {
      return (
        <svg viewBox="0 0 100 100" style={style}>
          <circle cx="50" cy="50" r="30" fill="none" />
        </svg>
      );
    }

    return <div>?</div>;
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h3 style={{ margin: 0, fontSize: '18px' }}>
          Configuration des Trous - {element.profileType} {element.profileSubType}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Contenu principal */}
      <div style={mainContentStyle}>
        {/* Section 1: Sélection de la face et visualisation */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Sélection de la Face</div>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            {/* Représentation du profil */}
            <div style={{
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {getProfileIcon(element.profileType)}
            </div>

            {/* Sélecteur de faces */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              flex: 1
            }}>
              {availableFaces.map(face => (
                <button
                  key={face}
                  onClick={() => setSelectedFace(face)}
                  style={{
                    padding: '12px',
                    border: selectedFace === face ? '2px solid #007bff' : '1px solid #dee2e6',
                    borderRadius: '6px',
                    backgroundColor: selectedFace === face ? '#e7f3ff' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '14px',
                    fontWeight: selectedFace === face ? 'bold' : 'normal'
                  }}
                >
                  {face === DSTVFace.TOP && '⬆️ Dessus'}
                  {face === DSTVFace.BOTTOM && '⬇️ Dessous'}
                  {face === DSTVFace.FRONT && '➡️ Avant (Âme)'}
                  {face === DSTVFace.BACK && '⬅️ Arrière'}
                  {face === DSTVFace.LEFT && '⬅️ Gauche'}
                  {face === DSTVFace.RIGHT && '➡️ Droite'}
                  {face === DSTVFace.RADIAL && '⭕ Radial'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Type de pattern */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Type de Trou</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {Object.values(HolePatternType).map(type => (
              <button
                key={type}
                onClick={() => {
                  setPatternType(type);
                  setPattern({ ...pattern, type });
                }}
                style={{
                  padding: '10px',
                  border: patternType === type ? '2px solid #007bff' : '1px solid #dee2e6',
                  borderRadius: '6px',
                  backgroundColor: patternType === type ? '#e7f3ff' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                {/* Icône visuelle du pattern */}
                <div style={{ width: '40px', height: '40px' }}>
                  {type === HolePatternType.SINGLE && (
                    <svg viewBox="0 0 40 40" style={{ width: '100%', height: '100%' }}>
                      <circle cx="20" cy="20" r="5" fill="#2c3e50" />
                    </svg>
                  )}
                  {type === HolePatternType.LINEAR && (
                    <svg viewBox="0 0 40 40" style={{ width: '100%', height: '100%' }}>
                      <circle cx="10" cy="20" r="3" fill="#2c3e50" />
                      <circle cx="20" cy="20" r="3" fill="#2c3e50" />
                      <circle cx="30" cy="20" r="3" fill="#2c3e50" />
                    </svg>
                  )}
                  {type === HolePatternType.GRID && (
                    <svg viewBox="0 0 40 40" style={{ width: '100%', height: '100%' }}>
                      <circle cx="12" cy="12" r="3" fill="#2c3e50" />
                      <circle cx="28" cy="12" r="3" fill="#2c3e50" />
                      <circle cx="12" cy="28" r="3" fill="#2c3e50" />
                      <circle cx="28" cy="28" r="3" fill="#2c3e50" />
                    </svg>
                  )}
                  {type === HolePatternType.CIRCULAR && (
                    <svg viewBox="0 0 40 40" style={{ width: '100%', height: '100%' }}>
                      <circle cx="20" cy="10" r="3" fill="#2c3e50" />
                      <circle cx="30" cy="20" r="3" fill="#2c3e50" />
                      <circle cx="20" cy="30" r="3" fill="#2c3e50" />
                      <circle cx="10" cy="20" r="3" fill="#2c3e50" />
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: '12px' }}>
                  {type === HolePatternType.SINGLE && 'Unique'}
                  {type === HolePatternType.LINEAR && 'Linéaire'}
                  {type === HolePatternType.GRID && 'Grille'}
                  {type === HolePatternType.CIRCULAR && 'Circulaire'}
                </span>
              </button>
            ))}
          </div>

          {/* Options du pattern */}
          {patternType === HolePatternType.LINEAR && (
            <div style={{ marginTop: '15px', display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: '#6c757d' }}>Nombre de trous</label>
                <input
                  type="number"
                  value={pattern.count || 2}
                  onChange={(e) => setPattern({ ...pattern, count: parseInt(e.target.value) || 2 })}
                  min="2"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    marginTop: '4px'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: '#6c757d' }}>Espacement (mm)</label>
                <input
                  type="number"
                  value={pattern.spacing || 50}
                  onChange={(e) => setPattern({ ...pattern, spacing: parseFloat(e.target.value) || 50 })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    marginTop: '4px'
                  }}
                />
              </div>
            </div>
          )}

          {patternType === HolePatternType.GRID && (
            <div style={{ marginTop: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#6c757d' }}>Lignes</label>
                <input
                  type="number"
                  value={pattern.rows || 2}
                  onChange={(e) => setPattern({ ...pattern, rows: parseInt(e.target.value) || 2 })}
                  min="2"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    marginTop: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6c757d' }}>Colonnes</label>
                <input
                  type="number"
                  value={pattern.columns || 2}
                  onChange={(e) => setPattern({ ...pattern, columns: parseInt(e.target.value) || 2 })}
                  min="2"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    marginTop: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6c757d' }}>Espacement lignes (mm)</label>
                <input
                  type="number"
                  value={pattern.rowSpacing || 50}
                  onChange={(e) => setPattern({ ...pattern, rowSpacing: parseFloat(e.target.value) || 50 })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    marginTop: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6c757d' }}>Espacement colonnes (mm)</label>
                <input
                  type="number"
                  value={pattern.columnSpacing || 50}
                  onChange={(e) => setPattern({ ...pattern, columnSpacing: parseFloat(e.target.value) || 50 })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    marginTop: '4px'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Paramètres du trou */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Paramètres</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            {/* Position X */}
            <div>
              <label style={{ fontSize: '12px', color: '#6c757d' }}>Position X (mm)</label>
              <input
                type="number"
                value={positionX}
                onChange={(e) => setPositionX(parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  marginTop: '4px'
                }}
              />
            </div>

            {/* Position Y */}
            <div>
              <label style={{ fontSize: '12px', color: '#6c757d' }}>Position Y (mm)</label>
              <input
                type="number"
                value={positionY}
                onChange={(e) => setPositionY(parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  marginTop: '4px'
                }}
              />
            </div>

            {/* Diamètre */}
            <div>
              <label style={{ fontSize: '12px', color: '#6c757d' }}>Diamètre (mm)</label>
              <input
                type="number"
                value={diameter}
                onChange={(e) => setDiameter(parseFloat(e.target.value) || 20)}
                min="1"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  marginTop: '4px'
                }}
              />
            </div>

            {/* Type de trou */}
            <div>
              <label style={{ fontSize: '12px', color: '#6c757d' }}>Type</label>
              <select
                value={holeType}
                onChange={(e) => setHoleType(e.target.value as HoleType)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  marginTop: '4px'
                }}
              >
                <option value={HoleType.THROUGH}>Traversant</option>
                <option value={HoleType.BLIND}>Borgne</option>
                <option value={HoleType.THREADED}>Fileté</option>
                <option value={HoleType.COUNTERSUNK}>Fraisé</option>
                <option value={HoleType.COUNTERBORE}>Lamé</option>
              </select>
            </div>

            {/* Profondeur (si non traversant) */}
            {holeType !== HoleType.THROUGH && (
              <div>
                <label style={{ fontSize: '12px', color: '#6c757d' }}>Profondeur (mm)</label>
                <input
                  type="number"
                  value={depth}
                  onChange={(e) => setDepth(parseFloat(e.target.value) || 10)}
                  min="1"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    marginTop: '4px'
                  }}
                />
              </div>
            )}

            {/* Point de référence */}
            <div>
              <label style={{ fontSize: '12px', color: '#6c757d' }}>Point de référence</label>
              <select
                value={pattern.referencePoint}
                onChange={(e) => setPattern({ ...pattern, referencePoint: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  marginTop: '4px'
                }}
              >
                <option value="center">Centre</option>
                <option value="topLeft">Coin supérieur gauche</option>
                <option value="bottomLeft">Coin inférieur gauche</option>
              </select>
            </div>
          </div>

          {/* Bouton Ajouter */}
          <button
            onClick={handleAddHoles}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            ➕ Ajouter le(s) trou(s)
          </button>
        </div>

        {/* Section 4: Vue latérale du profil */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Vue Latérale - Position des Trous</div>

          <div style={{
            height: '120px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Ligne de base du profil */}
            <div style={{
              position: 'absolute',
              left: '20px',
              right: '20px',
              top: '50%',
              height: '2px',
              backgroundColor: '#6c757d',
              transform: 'translateY(-50%)'
            }} />

            {/* Point zéro */}
            <div style={{
              position: 'absolute',
              left: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '12px',
              color: '#6c757d'
            }}>
              0
            </div>

            {/* Longueur totale */}
            <div style={{
              position: 'absolute',
              right: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '12px',
              color: '#6c757d'
            }}>
              {element.length} mm
            </div>

            {/* Affichage des trous existants */}
            {holes.map(hole => {
              const position = (hole.coordinates.x / element.length) * 100;
              const isSelected = hole.id === selectedHoleId;
              const isHovered = hole.id === hoveredHoleId;

              return (
                <div
                  key={hole.id}
                  onClick={() => setSelectedHoleId(hole.id)}
                  onMouseEnter={() => setHoveredHoleId(hole.id)}
                  onMouseLeave={() => setHoveredHoleId(null)}
                  style={{
                    position: 'absolute',
                    left: `${20 + (position * 0.8)}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: isSelected ? '#007bff' : isHovered ? '#6c757d' : '#dee2e6',
                    border: '2px solid ' + (isSelected ? '#0056b3' : '#6c757d'),
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: isSelected ? 'white' : '#495057',
                    fontWeight: 'bold',
                    transition: 'all 0.2s'
                  }}
                  title={`${hole.label} - Position: ${hole.coordinates.x}mm, Ø${hole.diameter}mm`}
                >
                  {hole.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 5: Tableau récapitulatif des trous */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Trous Configurés ({holes.length})</div>

          {holes.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              color: '#6c757d',
              fontSize: '14px'
            }}>
              Aucun trou configuré. Utilisez le formulaire ci-dessus pour ajouter des trous.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Label</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Face</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Position X</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Position Y</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Diamètre</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Type</th>
                    <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {holes.map(hole => (
                    <tr
                      key={hole.id}
                      style={{
                        backgroundColor: selectedHoleId === hole.id ? '#e7f3ff' : 'transparent',
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedHoleId(hole.id)}
                    >
                      <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>
                        <strong>{hole.label}</strong>
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>{hole.coordinates.face}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>{hole.coordinates.x} mm</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>{hole.coordinates.y} mm</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>Ø{hole.diameter} mm</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>
                        {hole.isThrough ? 'Traversant' : `Borgne (${hole.depth}mm)`}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6', textAlign: 'center' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Dupliquer le trou
                            const newHole = {
                              ...hole,
                              id: `hole-${Date.now()}`,
                              label: getNextHoleLabel(holes),
                              coordinates: {
                                ...hole.coordinates,
                                x: hole.coordinates.x + 50 // Décalage de 50mm
                              }
                            };
                            onAddHole([newHole]);
                          }}
                          style={{
                            padding: '4px 8px',
                            marginRight: '4px',
                            backgroundColor: '#17a2b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                          title="Dupliquer"
                        >
                          📋
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingHoleId(hole.id);
                            // TODO: Implémenter l'édition
                          }}
                          style={{
                            padding: '4px 8px',
                            marginRight: '4px',
                            backgroundColor: '#ffc107',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Supprimer le trou ${hole.label} ?`)) {
                              onDeleteHole(hole.id);
                            }
                          }}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HoleAddingInterface;