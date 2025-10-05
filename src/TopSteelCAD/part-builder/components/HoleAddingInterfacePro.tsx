/**
 * Interface professionnelle d'ajout de trous
 * Version améliorée avec sélection visuelle, templates et validation automatique
 */

import React, { useState, useRef, useEffect } from 'react';
import { HoleDSTV, DSTVFace, PartElement } from '../types/partBuilder.types';
import { getFaceInfo, validateHolePosition } from '../utils/coordinateTransform';

// Types pour les templates de perçage
export interface HoleTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  holes: Array<{
    x: number; // Position relative (0-1)
    y: number; // Position relative (0-1)
    diameter: number;
  }>;
}

// Templates prédéfinis
const HOLE_TEMPLATES: HoleTemplate[] = [
  {
    id: 'single',
    name: 'Trou unique',
    description: 'Un seul trou',
    icon: '⚫',
    holes: [{ x: 0.5, y: 0.5, diameter: 20 }]
  },
  {
    id: 'dual-horizontal',
    name: 'Deux trous horizontaux',
    description: 'Deux trous alignés horizontalement',
    icon: '⚫⚫',
    holes: [
      { x: 0.3, y: 0.5, diameter: 20 },
      { x: 0.7, y: 0.5, diameter: 20 }
    ]
  },
  {
    id: 'quad',
    name: 'Quatre trous (carré)',
    description: 'Quatre trous en carré',
    icon: '⚫⚫\n⚫⚫',
    holes: [
      { x: 0.3, y: 0.3, diameter: 16 },
      { x: 0.7, y: 0.3, diameter: 16 },
      { x: 0.3, y: 0.7, diameter: 16 },
      { x: 0.7, y: 0.7, diameter: 16 }
    ]
  },
  {
    id: 'linear-3',
    name: 'Trois trous alignés',
    description: 'Trois trous espacés régulièrement',
    icon: '⚫⚫⚫',
    holes: [
      { x: 0.25, y: 0.5, diameter: 18 },
      { x: 0.5, y: 0.5, diameter: 18 },
      { x: 0.75, y: 0.5, diameter: 18 }
    ]
  },
  {
    id: 'assembly',
    name: 'Assemblage standard',
    description: 'Pattern d\'assemblage classique',
    icon: '⚫⚫\n  ⚫',
    holes: [
      { x: 0.2, y: 0.3, diameter: 20 },
      { x: 0.8, y: 0.3, diameter: 20 },
      { x: 0.5, y: 0.7, diameter: 20 }
    ]
  }
];

interface HoleAddingInterfaceProProps {
  element: PartElement;
  holes: HoleDSTV[];
  onAddHole: (holes: HoleDSTV[]) => void;
  onEditHole: (id: string, hole: HoleDSTV) => void;
  onDeleteHole: (id: string) => void;
  onClose?: () => void;
}

// Fonction pour générer le prochain label
const getNextHoleLabel = (existingHoles: HoleDSTV[]): string => {
  const labels = existingHoles.map(h => h.label || '').filter(Boolean);
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  for (let i = 0; i < letters.length; i++) {
    if (!labels.includes(letters[i])) {
      return letters[i];
    }
  }

  return `H${existingHoles.length + 1}`;
};

// Fonction pour obtenir les faces disponibles selon le profil
const getAvailableFaces = (profileType: string): DSTVFace[] => {
  if (['IPE', 'HEA', 'HEB', 'HEM'].includes(profileType)) {
    return [DSTVFace.TOP, DSTVFace.BOTTOM, DSTVFace.FRONT, DSTVFace.BACK];
  }
  if (['UPN', 'UAP', 'UPE'].includes(profileType)) {
    return [DSTVFace.TOP, DSTVFace.BOTTOM, DSTVFace.FRONT, DSTVFace.BACK];
  }
  if (profileType === 'L') {
    return [DSTVFace.LEFT, DSTVFace.RIGHT, DSTVFace.FRONT, DSTVFace.BACK];
  }
  if (['RHS', 'SHS'].includes(profileType)) {
    return [DSTVFace.TOP, DSTVFace.BOTTOM, DSTVFace.LEFT, DSTVFace.RIGHT];
  }
  if (['TUBE_ROND', 'CHS'].includes(profileType)) {
    return [DSTVFace.RADIAL];
  }
  return [DSTVFace.TOP, DSTVFace.BOTTOM, DSTVFace.FRONT, DSTVFace.BACK];
};

export const HoleAddingInterfacePro: React.FC<HoleAddingInterfaceProProps> = ({
  element,
  holes,
  onAddHole,
  onEditHole: _onEditHole,
  onDeleteHole,
  onClose
}) => {
  // États
  const [selectedFace, setSelectedFace] = useState<DSTVFace>(DSTVFace.TOP);
  const [selectedTemplate, setSelectedTemplate] = useState<HoleTemplate | null>(null);
  const [diameter, setDiameter] = useState<number>(20);
  const [isThrough, setIsThrough] = useState<boolean>(true);
  const [depth, setDepth] = useState<number>(20);
  const [previewHoles, setPreviewHoles] = useState<HoleDSTV[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);

  // États pour saisie manuelle des positions
  const [manualPositionX, setManualPositionX] = useState<number>(0);
  const [manualPositionY, setManualPositionY] = useState<number>(0);
  const [spacing, setSpacing] = useState<number>(100); // Entraxe pour patterns
  const [mode, setMode] = useState<'click' | 'manual' | 'template'>('click');
  const [editingHoleId, setEditingHoleId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const availableFaces = getAvailableFaces(element.profileType);
  const faceInfo = getFaceInfo(selectedFace, element);

  // Dessiner la vue en coupe
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Nettoyer le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dimensions du canvas
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    // Calculer l'échelle
    const scaleX = (width - 2 * padding) / faceInfo.width;
    const scaleY = (height - 2 * padding) / faceInfo.height;
    const scale = Math.min(scaleX, scaleY);

    // Centre
    const centerX = width / 2;
    const centerY = height / 2;

    // Dessiner le profil (rectangle simplifié)
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      centerX - (faceInfo.width * scale) / 2,
      centerY - (faceInfo.height * scale) / 2,
      faceInfo.width * scale,
      faceInfo.height * scale
    );

    // Grille d'aide
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // Lignes verticales tous les 100mm
    for (let x = 0; x <= faceInfo.width; x += 100) {
      const screenX = centerX - (faceInfo.width * scale) / 2 + x * scale;
      ctx.beginPath();
      ctx.moveTo(screenX, centerY - (faceInfo.height * scale) / 2);
      ctx.lineTo(screenX, centerY + (faceInfo.height * scale) / 2);
      ctx.stroke();
    }

    // Lignes horizontales
    for (let y = 0; y <= faceInfo.height; y += 50) {
      const screenY = centerY - (faceInfo.height * scale) / 2 + y * scale;
      ctx.beginPath();
      ctx.moveTo(centerX - (faceInfo.width * scale) / 2, screenY);
      ctx.lineTo(centerX + (faceInfo.width * scale) / 2, screenY);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // Dessiner les trous existants
    holes
      .filter(h => h.coordinates.face === selectedFace)
      .forEach(hole => {
        const x = centerX - (faceInfo.width * scale) / 2 + hole.coordinates.x * scale;
        const y = centerY - (faceInfo.height * scale) / 2 + hole.coordinates.y * scale;
        const r = (hole.diameter / 2) * scale;

        ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Label
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hole.label, x, y);
      });

    // Dessiner les trous en prévisualisation
    previewHoles.forEach((hole, index) => {
      const x = centerX - (faceInfo.width * scale) / 2 + hole.coordinates.x * scale;
      const y = centerY - (faceInfo.height * scale) / 2 + hole.coordinates.y * scale;
      const r = (hole.diameter / 2) * scale;

      // Vérifier la validation
      const validation = validateHolePosition(hole, element);
      const isValid = validation.valid;

      ctx.fillStyle = isValid ? 'rgba(46, 204, 113, 0.3)' : 'rgba(231, 76, 60, 0.3)';
      ctx.strokeStyle = isValid ? '#2ecc71' : '#e74c3c';
      ctx.lineWidth = 2;
      ctx.setLineDash(isValid ? [] : [5, 5]);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = isValid ? '#27ae60' : '#c0392b';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${index + 1}`, x, y);
    });

    // Dessiner la position du clic
    if (clickPosition) {
      const x = centerX - (faceInfo.width * scale) / 2 + clickPosition.x * scale;
      const y = centerY - (faceInfo.height * scale) / 2 + clickPosition.y * scale;

      ctx.strokeStyle = '#3498db';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.stroke();

      // Croix
      ctx.beginPath();
      ctx.moveTo(x - 10, y);
      ctx.lineTo(x + 10, y);
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x, y + 10);
      ctx.stroke();
    }

    // Annotations des dimensions
    ctx.fillStyle = '#7f8c8d';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${faceInfo.width}mm`,
      centerX,
      centerY + (faceInfo.height * scale) / 2 + 25
    );
    ctx.save();
    ctx.translate(centerX - (faceInfo.width * scale) / 2 - 25, centerY);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${faceInfo.height}mm`, 0, 0);
    ctx.restore();
  }, [element, selectedFace, holes, previewHoles, clickPosition, faceInfo]);

  // Gestion du clic sur le canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convertir en coordonnées du profil
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    const scaleX = (width - 2 * padding) / faceInfo.width;
    const scaleY = (height - 2 * padding) / faceInfo.height;
    const scale = Math.min(scaleX, scaleY);

    const centerX = width / 2;
    const centerY = height / 2;

    const x = ((clickX - centerX) / scale) + faceInfo.width / 2;
    const y = ((clickY - centerY) / scale) + faceInfo.height / 2;

    setClickPosition({ x, y });

    // Créer un trou de prévisualisation
    const newHole: HoleDSTV = {
      id: `preview-${Date.now()}`,
      label: getNextHoleLabel([...holes, ...previewHoles]),
      diameter,
      coordinates: { face: selectedFace, x, y },
      isThrough,
      depth: isThrough ? undefined : depth,
      type: isThrough ? 'through' : 'blind'
    };

    setPreviewHoles([newHole]);

    // Valider
    const validation = validateHolePosition(newHole, element);
    if (!validation.valid) {
      setValidationErrors([validation.error || 'Erreur de validation']);
    } else {
      setValidationErrors([]);
    }
  };

  // Créer un trou à partir de la saisie manuelle
  const handleManualHole = () => {
    const newHole: HoleDSTV = {
      id: `preview-${Date.now()}`,
      label: getNextHoleLabel([...holes, ...previewHoles]),
      diameter,
      coordinates: { face: selectedFace, x: manualPositionX, y: manualPositionY },
      isThrough,
      depth: isThrough ? undefined : depth,
      type: isThrough ? 'through' : 'blind'
    };

    setPreviewHoles([newHole]);
    setClickPosition({ x: manualPositionX, y: manualPositionY });

    // Valider
    const validation = validateHolePosition(newHole, element);
    if (!validation.valid) {
      setValidationErrors([validation.error || 'Erreur de validation']);
    } else {
      setValidationErrors([]);
    }
  };

  // Appliquer un template
  const applyTemplate = (template: HoleTemplate) => {
    setSelectedTemplate(template);

    // Créer les trous du template
    const newHoles: HoleDSTV[] = [];

    template.holes.forEach((holeData, index) => {
      // Ajuster les positions relatives en fonction de l'entraxe
      const xPos = template.id === 'single'
        ? holeData.x * faceInfo.width
        : (index === 0 ? faceInfo.width / 2 : faceInfo.width / 2 + spacing * (index % 2 === 0 ? -1 : 1));

      const yPos = template.id === 'single'
        ? holeData.y * faceInfo.height
        : (Math.floor(index / 2) * spacing + faceInfo.height / 2);

      const newHole: HoleDSTV = {
        id: `preview-${Date.now()}-${index}`,
        label: getNextHoleLabel([...holes, ...previewHoles, ...newHoles]),
        diameter: holeData.diameter,
        coordinates: {
          face: selectedFace,
          x: xPos,
          y: yPos
        },
        isThrough,
        depth: isThrough ? undefined : depth,
        type: isThrough ? 'through' : 'blind'
      };

      newHoles.push(newHole);
    });

    setPreviewHoles(newHoles);

    // Valider tous les trous
    const errors: string[] = [];
    newHoles.forEach((hole, index) => {
      const validation = validateHolePosition(hole, element);
      if (!validation.valid) {
        errors.push(`Trou ${index + 1}: ${validation.error}`);
      }
    });
    setValidationErrors(errors);
  };

  // Ajouter les trous
  const handleAddHoles = () => {
    if (previewHoles.length === 0) {
      alert('Aucun trou à ajouter. Cliquez sur le profil ou utilisez un template.');
      return;
    }

    if (validationErrors.length > 0) {
      const confirm = window.confirm(
        `Il y a des erreurs de validation:\n${validationErrors.join('\n')}\n\nVoulez-vous continuer quand même?`
      );
      if (!confirm) return;
    }

    // Générer les IDs finaux
    const finalHoles = previewHoles.map((hole, index) => ({
      ...hole,
      id: `hole-${Date.now()}-${index}`,
      label: getNextHoleLabel([...holes, ...previewHoles.slice(0, index)])
    }));

    onAddHole(finalHoles);
    setPreviewHoles([]);
    setClickPosition(null);
    setValidationErrors([]);
    setSelectedTemplate(null);
  };

  // Styles
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#f8f9fa'
  };

  const headerStyle: React.CSSProperties = {
    padding: '16px 20px',
    backgroundColor: '#2c3e50',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const mainStyle: React.CSSProperties = {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '300px 1fr 300px',
    gap: '20px',
    padding: '20px',
    overflow: 'hidden'
  };

  const sidebarStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    overflowY: 'auto'
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  const cardTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const canvasContainerStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  const canvasStyle: React.CSSProperties = {
    border: '2px solid #e0e0e0',
    borderRadius: '4px',
    cursor: 'crosshair',
    backgroundColor: '#ffffff'
  };

  const footerStyle: React.CSSProperties = {
    padding: '16px 20px',
    backgroundColor: '#ecf0f1',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #bdc3c7'
  };

  const buttonStyle = (variant: 'primary' | 'success' | 'danger' | 'secondary'): React.CSSProperties => {
    const colors = {
      primary: { bg: '#3498db', hover: '#2980b9' },
      success: { bg: '#27ae60', hover: '#229954' },
      danger: { bg: '#e74c3c', hover: '#c0392b' },
      secondary: { bg: '#95a5a6', hover: '#7f8c8d' }
    };

    return {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '6px',
      backgroundColor: colors[variant].bg,
      color: 'white',
      fontSize: '14px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'all 0.3s'
    };
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h3 style={{ margin: 0, fontSize: '18px' }}>
          🔧 Configuration des Trous - {element.profileType} {element.profileSubType}
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

      {/* Main content */}
      <div style={mainStyle}>
        {/* Sidebar gauche - Sélection de face et templates */}
        <div style={sidebarStyle}>
          {/* Sélection de la face */}
          <div style={cardStyle}>
            <div style={cardTitleStyle}>📐 Sélection de la Face</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {availableFaces.map(face => (
                <button
                  key={face}
                  onClick={() => {
                    setSelectedFace(face);
                    setPreviewHoles([]);
                    setClickPosition(null);
                  }}
                  style={{
                    padding: '12px',
                    border: selectedFace === face ? '2px solid #3498db' : '1px solid #dee2e6',
                    borderRadius: '6px',
                    backgroundColor: selectedFace === face ? '#e7f3ff' : 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: selectedFace === face ? 'bold' : 'normal',
                    textAlign: 'left'
                  }}
                >
                  {face === DSTVFace.TOP && '⬆️ Dessus'}
                  {face === DSTVFace.BOTTOM && '⬇️ Dessous'}
                  {face === DSTVFace.FRONT && '➡️ Avant'}
                  {face === DSTVFace.BACK && '⬅️ Arrière'}
                  {face === DSTVFace.LEFT && '⬅️ Gauche'}
                  {face === DSTVFace.RIGHT && '➡️ Droite'}
                  {face === DSTVFace.RADIAL && '⭕ Radial'}
                </button>
              ))}
            </div>
          </div>

          {/* Templates */}
          <div style={cardStyle}>
            <div style={cardTitleStyle}>📋 Templates de Perçage</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {HOLE_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  style={{
                    padding: '10px',
                    border: selectedTemplate?.id === template.id ? '2px solid #27ae60' : '1px solid #dee2e6',
                    borderRadius: '6px',
                    backgroundColor: selectedTemplate?.id === template.id ? '#d5f4e6' : 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{template.icon}</div>
                  <div style={{ fontWeight: 'bold' }}>{template.name}</div>
                  <div style={{ color: '#7f8c8d', fontSize: '11px' }}>{template.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Centre - Vue en coupe interactive */}
        <div style={canvasContainerStyle}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h4 style={{ margin: 0, color: '#2c3e50' }}>
              Vue en Coupe - Face {selectedFace.toUpperCase()}
            </h4>
            <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
              📍 Cliquez pour placer un trou
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={800}
            height={500}
            style={canvasStyle}
            onClick={handleCanvasClick}
          />

          {/* Coordonnées du clic */}
          {clickPosition && (
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              backgroundColor: '#e7f3ff',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#2c3e50'
            }}>
              📍 Position: X = {clickPosition.x.toFixed(1)}mm, Y = {clickPosition.y.toFixed(1)}mm
            </div>
          )}

          {/* Erreurs de validation */}
          {validationErrors.length > 0 && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              backgroundColor: '#ffe6e6',
              borderLeft: '4px solid #e74c3c',
              borderRadius: '4px'
            }}>
              <div style={{ fontWeight: 'bold', color: '#c0392b', marginBottom: '8px' }}>
                ⚠️ Erreurs de validation:
              </div>
              {validationErrors.map((error, index) => (
                <div key={index} style={{ fontSize: '12px', color: '#c0392b', marginBottom: '4px' }}>
                  • {error}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar droite - Paramètres */}
        <div style={sidebarStyle}>
          {/* Paramètres du trou */}
          <div style={cardStyle}>
            <div style={cardTitleStyle}>⚙️ Paramètres</div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>
                Diamètre (mm)
              </label>
              <input
                type="number"
                value={diameter}
                onChange={(e) => setDiameter(parseFloat(e.target.value) || 20)}
                min="1"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isThrough}
                  onChange={(e) => setIsThrough(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ fontSize: '13px' }}>Trou traversant</span>
              </label>
            </div>

            {!isThrough && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>
                  Profondeur (mm)
                </label>
                <input
                  type="number"
                  value={depth}
                  onChange={(e) => setDepth(parseFloat(e.target.value) || 20)}
                  min="1"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px'
                  }}
                />
              </div>
            )}
          </div>

          {/* Saisie manuelle de position */}
          <div style={cardStyle}>
            <div style={cardTitleStyle}>📍 Position Manuelle</div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>
                Position X (mm)
              </label>
              <input
                type="number"
                value={manualPositionX}
                onChange={(e) => setManualPositionX(parseFloat(e.target.value) || 0)}
                min="0"
                max={faceInfo.width}
                step="0.1"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px'
                }}
                placeholder={`0 - ${faceInfo.width}`}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>
                Position Y (mm)
              </label>
              <input
                type="number"
                value={manualPositionY}
                onChange={(e) => setManualPositionY(parseFloat(e.target.value) || 0)}
                min="0"
                max={faceInfo.height}
                step="0.1"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px'
                }}
                placeholder={`0 - ${faceInfo.height}`}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>
                Entraxe (mm)
              </label>
              <input
                type="number"
                value={spacing}
                onChange={(e) => setSpacing(parseFloat(e.target.value) || 100)}
                min="10"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px'
                }}
                placeholder="Pour patterns"
              />
            </div>

            <button
              onClick={handleManualHole}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              📍 Créer à cette position
            </button>
          </div>

          {/* Informations sur la face */}
          <div style={cardStyle}>
            <div style={cardTitleStyle}>ℹ️ Info Face</div>
            <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Face:</strong> {selectedFace}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Largeur:</strong> {faceInfo.width}mm
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Hauteur:</strong> {faceInfo.height}mm
              </div>
              <div>
                <strong>Longueur totale:</strong> {element.length}mm
              </div>
            </div>
          </div>

          {/* Prévisualisation */}
          <div style={cardStyle}>
            <div style={cardTitleStyle}>👁️ Prévisualisation</div>
            <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
              {previewHoles.length === 0 ? (
                <div>Aucun trou en prévisualisation</div>
              ) : (
                <div>
                  <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
                    {previewHoles.length} trou(x) à ajouter:
                  </div>
                  {previewHoles.map((hole, index) => (
                    <div key={index} style={{ marginBottom: '4px', paddingLeft: '12px' }}>
                      • Ø{hole.diameter}mm à ({hole.coordinates.x.toFixed(0)}mm, {hole.coordinates.y.toFixed(0)}mm)
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={footerStyle}>
        <div style={{ fontSize: '13px', color: '#7f8c8d' }}>
          💡 <strong>Astuce:</strong> Cliquez sur la vue pour placer un trou ou utilisez un template
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              setPreviewHoles([]);
              setClickPosition(null);
              setValidationErrors([]);
              setSelectedTemplate(null);
            }}
            style={buttonStyle('secondary')}
          >
            Effacer
          </button>
          <button
            onClick={handleAddHoles}
            style={buttonStyle('success')}
            disabled={previewHoles.length === 0}
          >
            ➕ Ajouter {previewHoles.length > 0 ? `(${previewHoles.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HoleAddingInterfacePro;
