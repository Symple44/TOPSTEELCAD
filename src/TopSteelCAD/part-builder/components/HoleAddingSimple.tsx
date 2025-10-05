/**
 * Interface simplifiée et améliorée pour l'ajout de trous
 * Version avec tous les contrôles visibles et accessibles
 */

import React, { useState, useRef, useEffect } from 'react';
import { HoleDSTV, DSTVFace, PartElement } from '../types/partBuilder.types';
import { getFaceInfo, validateHolePosition } from '../utils/coordinateTransform';

interface HoleAddingSimpleProps {
  element: PartElement;
  holes: HoleDSTV[];
  onAddHole: (holes: HoleDSTV[]) => void;
  onEditHole: (id: string, hole: HoleDSTV) => void;
  onDeleteHole: (id: string) => void;
  onClose?: () => void;
}

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

const getAvailableFaces = (profileType: string): DSTVFace[] => {
  if (['IPE', 'HEA', 'HEB', 'HEM'].includes(profileType)) {
    return [DSTVFace.TOP, DSTVFace.BOTTOM, DSTVFace.FRONT, DSTVFace.BACK];
  }
  if (['UPN', 'UAP', 'UPE'].includes(profileType)) {
    return [DSTVFace.TOP, DSTVFace.BOTTOM, DSTVFace.FRONT, DSTVFace.BACK];
  }
  return [DSTVFace.TOP, DSTVFace.BOTTOM, DSTVFace.FRONT, DSTVFace.BACK];
};

export const HoleAddingSimple: React.FC<HoleAddingSimpleProps> = ({
  element,
  holes,
  onAddHole,
  onEditHole,
  onDeleteHole,
  onClose
}) => {
  // Type d'ajout
  type AddMode = 'single' | 'linear' | 'grid';

  // États principaux
  const [addMode, setAddMode] = useState<AddMode>('single');
  const [selectedFace, setSelectedFace] = useState<DSTVFace>(DSTVFace.TOP);
  const [positionX, setPositionX] = useState<number>(0);
  const [positionY, setPositionY] = useState<number>(0);
  const [diameter, setDiameter] = useState<number>(20);
  const [isThrough, setIsThrough] = useState<boolean>(true);
  const [depth, setDepth] = useState<number>(20);

  // Pour série linéaire
  const [linearDirection, setLinearDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [linearSpacing, setLinearSpacing] = useState<number>(100);
  const [linearCount, setLinearCount] = useState<number>(2);

  // Pour grille
  const [gridSpacingX, setGridSpacingX] = useState<number>(100);
  const [gridSpacingY, setGridSpacingY] = useState<number>(100);
  const [gridCountX, setGridCountX] = useState<number>(2);
  const [gridCountY, setGridCountY] = useState<number>(2);

  const [previewHoles, setPreviewHoles] = useState<HoleDSTV[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [editingHole, setEditingHole] = useState<HoleDSTV | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [gridSize, setGridSize] = useState<number>(10);
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const availableFaces = getAvailableFaces(element.profileType);
  const faceInfo = getFaceInfo(selectedFace, element);

  // Mettre à jour la position par défaut quand la face change
  useEffect(() => {
    setPositionX(faceInfo.width / 2);
    setPositionY(faceInfo.height / 2);
  }, [selectedFace, faceInfo.width, faceInfo.height]);

  // Calculer les trous de prévisualisation selon le mode
  const getPreviewHoles = (): Array<{ x: number; y: number }> => {
    const preview: Array<{ x: number; y: number }> = [];

    if (addMode === 'single') {
      preview.push({ x: positionX, y: positionY });
    } else if (addMode === 'linear') {
      for (let i = 0; i < linearCount; i++) {
        preview.push({
          x: linearDirection === 'horizontal' ? positionX + (i * linearSpacing) : positionX,
          y: linearDirection === 'vertical' ? positionY + (i * linearSpacing) : positionY
        });
      }
    } else if (addMode === 'grid') {
      for (let j = 0; j < gridCountY; j++) {
        for (let i = 0; i < gridCountX; i++) {
          preview.push({
            x: positionX + (i * gridSpacingX),
            y: positionY + (j * gridSpacingY)
          });
        }
      }
    }

    return preview;
  };

  // Dessiner le canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    const scaleX = (width - 2 * padding) / faceInfo.width;
    const scaleY = (height - 2 * padding) / faceInfo.height;
    const baseScale = Math.min(scaleX, scaleY);
    const scale = baseScale * zoom;

    const centerX = width / 2 + panOffset.x;
    const centerY = height / 2 + panOffset.y;

    // Dessiner le profil
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      centerX - (faceInfo.width * scale) / 2,
      centerY - (faceInfo.height * scale) / 2,
      faceInfo.width * scale,
      faceInfo.height * scale
    );

    // Grille fine
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;

    // Grille fine (tous les 10mm)
    for (let x = 0; x <= faceInfo.width; x += gridSize) {
      const screenX = centerX - (faceInfo.width * scale) / 2 + x * scale;
      ctx.beginPath();
      ctx.moveTo(screenX, centerY - (faceInfo.height * scale) / 2);
      ctx.lineTo(screenX, centerY + (faceInfo.height * scale) / 2);
      ctx.stroke();
    }

    for (let y = 0; y <= faceInfo.height; y += gridSize) {
      const screenY = centerY - (faceInfo.height * scale) / 2 + y * scale;
      ctx.beginPath();
      ctx.moveTo(centerX - (faceInfo.width * scale) / 2, screenY);
      ctx.lineTo(centerX + (faceInfo.width * scale) / 2, screenY);
      ctx.stroke();
    }

    // Grille épaisse (tous les 100mm)
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 2;

    for (let x = 0; x <= faceInfo.width; x += 100) {
      const screenX = centerX - (faceInfo.width * scale) / 2 + x * scale;
      ctx.beginPath();
      ctx.moveTo(screenX, centerY - (faceInfo.height * scale) / 2);
      ctx.lineTo(screenX, centerY + (faceInfo.height * scale) / 2);
      ctx.stroke();
    }

    for (let y = 0; y <= faceInfo.height; y += 100) {
      const screenY = centerY - (faceInfo.height * scale) / 2 + y * scale;
      ctx.beginPath();
      ctx.moveTo(centerX - (faceInfo.width * scale) / 2, screenY);
      ctx.lineTo(centerX + (faceInfo.width * scale) / 2, screenY);
      ctx.stroke();
    }

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

        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hole.label, x, y);
      });

    // Dessiner la prévisualisation des trous selon le mode
    const previewPositions = getPreviewHoles();
    previewPositions.forEach((pos, index) => {
      const x = centerX - (faceInfo.width * scale) / 2 + pos.x * scale;
      const y = centerY - (faceInfo.height * scale) / 2 + pos.y * scale;
      const r = (diameter / 2) * scale;

      // Vérifier si le trou est dans les limites
      const isValid = pos.x >= 0 && pos.x <= faceInfo.width &&
                      pos.y >= 0 && pos.y <= faceInfo.height;

      ctx.fillStyle = isValid ? 'rgba(46, 204, 113, 0.3)' : 'rgba(231, 76, 60, 0.3)';
      ctx.strokeStyle = isValid ? '#2ecc71' : '#e74c3c';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      // Numéro du trou en prévisualisation
      if (previewPositions.length > 1) {
        ctx.fillStyle = isValid ? '#27ae60' : '#c0392b';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${index + 1}`, x, y);
      }
    });

    // Dessiner le crosshair du curseur si présent
    if (cursorPos) {
      const cursorScreenX = centerX - (faceInfo.width * scale) / 2 + cursorPos.x * scale;
      const cursorScreenY = centerY - (faceInfo.height * scale) / 2 + cursorPos.y * scale;

      // Crosshair bleu
      ctx.strokeStyle = '#3498db';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Ligne verticale
      ctx.beginPath();
      ctx.moveTo(cursorScreenX, centerY - (faceInfo.height * scale) / 2);
      ctx.lineTo(cursorScreenX, centerY + (faceInfo.height * scale) / 2);
      ctx.stroke();

      // Ligne horizontale
      ctx.beginPath();
      ctx.moveTo(centerX - (faceInfo.width * scale) / 2, cursorScreenY);
      ctx.lineTo(centerX + (faceInfo.width * scale) / 2, cursorScreenY);
      ctx.stroke();

      ctx.setLineDash([]);

      // Afficher les coordonnées
      ctx.fillStyle = '#3498db';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillRect(cursorScreenX + 10, cursorScreenY + 10, 100, 30);
      ctx.fillStyle = 'white';
      ctx.fillText(`X: ${cursorPos.x.toFixed(1)}`, cursorScreenX + 15, cursorScreenY + 15);
      ctx.fillText(`Y: ${cursorPos.y.toFixed(1)}`, cursorScreenX + 15, cursorScreenY + 27);
    }

    // Annotations
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
  }, [element, selectedFace, holes, positionX, positionY, diameter, faceInfo, cursorPos, gridSize, zoom, panOffset, addMode, linearDirection, linearSpacing, linearCount, gridSpacingX, gridSpacingY, gridCountX, gridCountY]);

  // Mouvement du curseur sur le canvas
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Gérer le pan
    if (isPanning && panStart) {
      setPanOffset({
        x: panOffset.x + (mouseX - panStart.x),
        y: panOffset.y + (mouseY - panStart.y)
      });
      setPanStart({ x: mouseX, y: mouseY });
      return;
    }

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    const scaleX = (width - 2 * padding) / faceInfo.width;
    const scaleY = (height - 2 * padding) / faceInfo.height;
    const baseScale = Math.min(scaleX, scaleY);
    const scale = baseScale * zoom;

    const centerX = width / 2 + panOffset.x;
    const centerY = height / 2 + panOffset.y;

    let x = ((mouseX - centerX) / scale) + faceInfo.width / 2;
    let y = ((mouseY - centerY) / scale) + faceInfo.height / 2;

    // Snap to grid si activé
    if (snapToGrid) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }

    // Limiter aux bords
    x = Math.max(0, Math.min(faceInfo.width, x));
    y = Math.max(0, Math.min(faceInfo.height, y));

    setCursorPos({ x, y });
  };

  // Quitter le canvas
  const handleCanvasMouseLeave = () => {
    setCursorPos(null);
    setIsPanning(false);
    setPanStart(null);
  };

  // Mouse down sur le canvas
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2 || e.shiftKey) {
      // Clic droit ou Shift+Clic pour pan
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    }
  };

  // Mouse up sur le canvas
  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setPanStart(null);
  };

  // Clic sur le canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) return; // Ignorer si on est en train de pan

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    const scaleX = (width - 2 * padding) / faceInfo.width;
    const scaleY = (height - 2 * padding) / faceInfo.height;
    const baseScale = Math.min(scaleX, scaleY);
    const scale = baseScale * zoom;

    const centerX = width / 2 + panOffset.x;
    const centerY = height / 2 + panOffset.y;

    console.log('🖱️ Canvas click:', {
      clickScreen: { x: clickX, y: clickY },
      canvasSize: { w: width, h: height },
      faceInfo: { width: faceInfo.width, height: faceInfo.height },
      scale,
      zoom,
      panOffset,
      center: { x: centerX, y: centerY }
    });

    let x = ((clickX - centerX) / scale) + faceInfo.width / 2;
    let y = ((clickY - centerY) / scale) + faceInfo.height / 2;

    console.log('📏 Calculated before snap:', { x, y });

    // Snap to grid si activé
    if (snapToGrid) {
      const xBeforeSnap = x;
      const yBeforeSnap = y;
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
      console.log('🧲 After snap:', { from: { x: xBeforeSnap, y: yBeforeSnap }, to: { x, y }, gridSize });
    }

    // Limiter aux bords
    const xBeforeClamp = x;
    const yBeforeClamp = y;
    x = Math.max(0, Math.min(faceInfo.width, x));
    y = Math.max(0, Math.min(faceInfo.height, y));

    console.log('✂️ After clamp:', { from: { x: xBeforeClamp, y: yBeforeClamp }, to: { x, y } });
    console.log('✅ Final DSTV coordinates:', { x, y, face: selectedFace });

    setPositionX(x);
    setPositionY(y);
  };

  // Zoom avec molette
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prevZoom => Math.max(0.5, Math.min(5, prevZoom * delta)));
  };

  // Créer les trous selon le mode
  const handleAddHoles = () => {
    console.log('➕ HoleAddingSimple.handleAddHoles called');
    console.log('📍 Current positions:', { positionX, positionY, diameter, selectedFace, addMode });
    console.log('🎯 Face info:', faceInfo);

    const newHoles: HoleDSTV[] = [];

    if (addMode === 'single') {
      // Trou unique
      if (editingHole) {
        const updatedHole: HoleDSTV = {
          id: editingHole.id,
          label: editingHole.label,
          diameter,
          coordinates: { face: selectedFace, x: positionX, y: positionY },
          isThrough,
          depth: isThrough ? undefined : depth,
          type: isThrough ? 'through' : 'blind'
        };
        const validation = validateHolePosition(updatedHole, element);
        if (!validation.valid) {
          setValidationErrors([validation.error || 'Erreur de validation']);
          return;
        }
        onEditHole(editingHole.id, updatedHole);
        setEditingHole(null);
        setValidationErrors([]);
        return;
      } else {
        newHoles.push({
          id: `hole-${Date.now()}`,
          label: getNextHoleLabel([...holes, ...previewHoles]),
          diameter,
          coordinates: { face: selectedFace, x: positionX, y: positionY },
          isThrough,
          depth: isThrough ? undefined : depth,
          type: isThrough ? 'through' : 'blind'
        });
      }
    } else if (addMode === 'linear') {
      // Série linéaire
      for (let i = 0; i < linearCount; i++) {
        newHoles.push({
          id: `hole-${Date.now()}-${i}`,
          label: getNextHoleLabel([...holes, ...previewHoles, ...newHoles]),
          diameter,
          coordinates: {
            face: selectedFace,
            x: linearDirection === 'horizontal' ? positionX + (i * linearSpacing) : positionX,
            y: linearDirection === 'vertical' ? positionY + (i * linearSpacing) : positionY
          },
          isThrough,
          depth: isThrough ? undefined : depth,
          type: isThrough ? 'through' : 'blind'
        });
      }
    } else if (addMode === 'grid') {
      // Grille
      for (let j = 0; j < gridCountY; j++) {
        for (let i = 0; i < gridCountX; i++) {
          newHoles.push({
            id: `hole-${Date.now()}-${j}-${i}`,
            label: getNextHoleLabel([...holes, ...previewHoles, ...newHoles]),
            diameter,
            coordinates: {
              face: selectedFace,
              x: positionX + (i * gridSpacingX),
              y: positionY + (j * gridSpacingY)
            },
            isThrough,
            depth: isThrough ? undefined : depth,
            type: isThrough ? 'through' : 'blind'
          });
        }
      }
    }

    console.log('🔨 Created holes:', newHoles);

    // Validation
    for (const hole of newHoles) {
      const validation = validateHolePosition(hole, element);
      if (!validation.valid) {
        console.error('❌ Validation failed:', validation.error, hole);
        setValidationErrors([validation.error || 'Erreur de validation']);
        return;
      }
    }

    console.log('✅ Holes validated, calling onAddHole');
    onAddHole(newHoles);
    setValidationErrors([]);
  };

  // Éditer un trou existant
  const handleEditExistingHole = (hole: HoleDSTV) => {
    setEditingHole(hole);
    setAddMode('single'); // Forcer le mode trou unique pour édition
    setSelectedFace(hole.coordinates.face);
    setPositionX(hole.coordinates.x);
    setPositionY(hole.coordinates.y);
    setDiameter(hole.diameter);
    setIsThrough(hole.isThrough);
    setDepth(hole.depth || 20);
  };

  // Obtenir le texte du bouton d'ajout
  const getAddButtonText = () => {
    if (editingHole) return '✏️ Modifier le trou';
    if (addMode === 'single') return '➕ Ajouter 1 trou';
    if (addMode === 'linear') return `➕ Ajouter ${linearCount} trous (${linearDirection === 'horizontal' ? 'horizontale' : 'verticale'})`;
    if (addMode === 'grid') return `➕ Ajouter ${gridCountX}×${gridCountY} trous (${gridCountX * gridCountY} total)`;
    return '➕ Ajouter';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        backgroundColor: '#2c3e50',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '18px' }}>
          🔧 Perçage - {element.profileType} {element.profileSubType} ({element.length}mm)
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
      <div style={{ flex: 1, display: 'flex', gap: '20px', padding: '20px', overflow: 'hidden' }}>
        {/* Canvas */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <canvas
            ref={canvasRef}
            width={800}
            height={400}
            style={{
              border: '2px solid #dee2e6',
              borderRadius: '8px',
              cursor: isPanning ? 'grabbing' : 'crosshair',
              backgroundColor: 'white'
            }}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
            onMouseDown={handleCanvasMouseDown}
            onMouseUp={handleCanvasMouseUp}
            onWheel={handleWheel}
            onContextMenu={(e) => e.preventDefault()}
          />

          {/* Contrôles de grille et zoom */}
          <div style={{
            display: 'flex',
            gap: '15px',
            alignItems: 'center',
            backgroundColor: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="snapToGrid"
                checked={snapToGrid}
                onChange={(e) => setSnapToGrid(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="snapToGrid" style={{ fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                🧲 Snap
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: '#7f8c8d' }}>Grille:</label>
              <select
                value={gridSize}
                onChange={(e) => setGridSize(parseInt(e.target.value))}
                style={{
                  padding: '6px 10px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <option value="1">1mm</option>
                <option value="5">5mm</option>
                <option value="10">10mm</option>
                <option value="25">25mm</option>
                <option value="50">50mm</option>
              </select>
            </div>

            <div style={{ width: '1px', height: '20px', backgroundColor: '#dee2e6' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: '#7f8c8d' }}>🔍 Zoom:</label>
              <button
                onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
                style={{
                  padding: '4px 10px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                -
              </button>
              <span style={{ fontSize: '13px', fontFamily: 'monospace', minWidth: '50px', textAlign: 'center' }}>
                {(zoom * 100).toFixed(0)}%
              </span>
              <button
                onClick={() => setZoom(prev => Math.min(5, prev + 0.25))}
                style={{
                  padding: '4px 10px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                +
              </button>
              <button
                onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }}
                style={{
                  padding: '4px 10px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Reset
              </button>
            </div>

            {cursorPos && (
              <div style={{
                marginLeft: 'auto',
                fontSize: '13px',
                color: '#3498db',
                fontWeight: 'bold',
                fontFamily: 'monospace'
              }}>
                📍 X={cursorPos.x.toFixed(1)}mm Y={cursorPos.y.toFixed(1)}mm
              </div>
            )}
          </div>

          {/* Sélection du mode */}
          <div style={{
            backgroundColor: 'white',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {/* Onglets de mode */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '2px solid #dee2e6' }}>
              <button
                onClick={() => setAddMode('single')}
                disabled={!!editingHole}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderBottom: addMode === 'single' ? '3px solid #27ae60' : '3px solid transparent',
                  backgroundColor: addMode === 'single' ? '#e8f5e9' : 'transparent',
                  color: addMode === 'single' ? '#27ae60' : '#7f8c8d',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: editingHole ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                🔘 Trou unique
              </button>
              <button
                onClick={() => setAddMode('linear')}
                disabled={!!editingHole}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderBottom: addMode === 'linear' ? '3px solid #3498db' : '3px solid transparent',
                  backgroundColor: addMode === 'linear' ? '#e3f2fd' : 'transparent',
                  color: addMode === 'linear' ? '#3498db' : '#7f8c8d',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: editingHole ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                ➡️ Série linéaire
              </button>
              <button
                onClick={() => setAddMode('grid')}
                disabled={!!editingHole}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderBottom: addMode === 'grid' ? '3px solid #9b59b6' : '3px solid transparent',
                  backgroundColor: addMode === 'grid' ? '#f3e5f5' : 'transparent',
                  color: addMode === 'grid' ? '#9b59b6' : '#7f8c8d',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: editingHole ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                🔲 Grille
              </button>
            </div>

            {/* Contrôles communs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#7f8c8d', marginBottom: '4px' }}>
                  Position X (mm)
                </label>
                <input
                  type="number"
                  value={positionX.toFixed(1)}
                  onChange={(e) => setPositionX(parseFloat(e.target.value) || 0)}
                  step="0.1"
                  style={{ width: '100%', padding: '8px', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#7f8c8d', marginBottom: '4px' }}>
                  Position Y (mm)
                </label>
                <input
                  type="number"
                  value={positionY.toFixed(1)}
                  onChange={(e) => setPositionY(parseFloat(e.target.value) || 0)}
                  step="0.1"
                  style={{ width: '100%', padding: '8px', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#7f8c8d', marginBottom: '4px' }}>
                  Diamètre (mm)
                </label>
                <input
                  type="number"
                  value={diameter}
                  onChange={(e) => setDiameter(parseFloat(e.target.value) || 20)}
                  min="1"
                  style={{ width: '100%', padding: '8px', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#7f8c8d', marginBottom: '4px' }}>
                  Type
                </label>
                <select
                  value={isThrough ? 'through' : 'blind'}
                  onChange={(e) => setIsThrough(e.target.value === 'through')}
                  style={{ width: '100%', padding: '8px', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="through">Traversant</option>
                  <option value="blind">Borgne</option>
                </select>
              </div>
            </div>

            {/* Contrôles spécifiques au mode */}
            {addMode === 'linear' && (
              <div style={{
                padding: '12px',
                backgroundColor: '#e3f2fd',
                borderRadius: '6px',
                border: '1px solid #90caf9'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#1976d2', marginBottom: '4px', fontWeight: 'bold' }}>
                      Direction
                    </label>
                    <select
                      value={linearDirection}
                      onChange={(e) => setLinearDirection(e.target.value as 'horizontal' | 'vertical')}
                      style={{ width: '100%', padding: '8px', border: '1px solid #90caf9', borderRadius: '4px', fontSize: '14px' }}
                    >
                      <option value="horizontal">Horizontale (X)</option>
                      <option value="vertical">Verticale (Y)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#1976d2', marginBottom: '4px', fontWeight: 'bold' }}>
                      Entraxe (mm)
                    </label>
                    <input
                      type="number"
                      value={linearSpacing}
                      onChange={(e) => setLinearSpacing(parseFloat(e.target.value) || 100)}
                      min="10"
                      style={{ width: '100%', padding: '8px', border: '1px solid #90caf9', borderRadius: '4px', fontSize: '14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#1976d2', marginBottom: '4px', fontWeight: 'bold' }}>
                      Nombre de trous
                    </label>
                    <input
                      type="number"
                      value={linearCount}
                      onChange={(e) => setLinearCount(parseInt(e.target.value) || 2)}
                      min="2"
                      max="20"
                      style={{ width: '100%', padding: '8px', border: '1px solid #90caf9', borderRadius: '4px', fontSize: '14px' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {addMode === 'grid' && (
              <div style={{
                padding: '12px',
                backgroundColor: '#f3e5f5',
                borderRadius: '6px',
                border: '1px solid #ce93d8'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#7b1fa2', marginBottom: '4px', fontWeight: 'bold' }}>
                      Entraxe X (mm)
                    </label>
                    <input
                      type="number"
                      value={gridSpacingX}
                      onChange={(e) => setGridSpacingX(parseFloat(e.target.value) || 100)}
                      min="10"
                      style={{ width: '100%', padding: '8px', border: '1px solid #ce93d8', borderRadius: '4px', fontSize: '14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#7b1fa2', marginBottom: '4px', fontWeight: 'bold' }}>
                      Entraxe Y (mm)
                    </label>
                    <input
                      type="number"
                      value={gridSpacingY}
                      onChange={(e) => setGridSpacingY(parseFloat(e.target.value) || 100)}
                      min="10"
                      style={{ width: '100%', padding: '8px', border: '1px solid #ce93d8', borderRadius: '4px', fontSize: '14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#7b1fa2', marginBottom: '4px', fontWeight: 'bold' }}>
                      Nombre en X
                    </label>
                    <input
                      type="number"
                      value={gridCountX}
                      onChange={(e) => setGridCountX(parseInt(e.target.value) || 2)}
                      min="2"
                      max="20"
                      style={{ width: '100%', padding: '8px', border: '1px solid #ce93d8', borderRadius: '4px', fontSize: '14px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#7b1fa2', marginBottom: '4px', fontWeight: 'bold' }}>
                      Nombre en Y
                    </label>
                    <input
                      type="number"
                      value={gridCountY}
                      onChange={(e) => setGridCountY(parseInt(e.target.value) || 2)}
                      min="2"
                      max="20"
                      style={{ width: '100%', padding: '8px', border: '1px solid #ce93d8', borderRadius: '4px', fontSize: '14px' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {!isThrough && (
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#7f8c8d', marginBottom: '4px' }}>
                  Profondeur (mm)
                </label>
                <input
                  type="number"
                  value={depth}
                  onChange={(e) => setDepth(parseFloat(e.target.value) || 20)}
                  min="1"
                  style={{ width: '200px', padding: '8px', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '14px' }}
                />
              </div>
            )}
          </div>

          {/* Info prévisualisation */}
          {!editingHole && (
            <div style={{
              padding: '12px',
              backgroundColor: addMode === 'single' ? '#e8f5e9' : addMode === 'linear' ? '#e3f2fd' : '#f3e5f5',
              borderLeft: `4px solid ${addMode === 'single' ? '#27ae60' : addMode === 'linear' ? '#3498db' : '#9b59b6'}`,
              borderRadius: '4px'
            }}>
              <div style={{ fontSize: '12px', color: '#2c3e50', fontWeight: 'bold', marginBottom: '4px' }}>
                💡 Prévisualisation
              </div>
              <div style={{ fontSize: '13px', color: '#7f8c8d' }}>
                {addMode === 'single' && (
                  <>1 trou sera ajouté à la position ({positionX.toFixed(1)}, {positionY.toFixed(1)})</>
                )}
                {addMode === 'linear' && (
                  <>{linearCount} trous seront ajoutés en ligne {linearDirection === 'horizontal' ? 'horizontale' : 'verticale'} avec un entraxe de {linearSpacing}mm</>
                )}
                {addMode === 'grid' && (
                  <>{gridCountX * gridCountY} trous seront ajoutés en grille {gridCountX}×{gridCountY} (entraxe X:{gridSpacingX}mm, Y:{gridSpacingY}mm)</>
                )}
              </div>
              {getPreviewHoles().some(pos => pos.x < 0 || pos.x > faceInfo.width || pos.y < 0 || pos.y > faceInfo.height) && (
                <div style={{ fontSize: '12px', color: '#e74c3c', marginTop: '8px', fontWeight: 'bold' }}>
                  ⚠️ Attention : Certains trous seront hors limites (affichés en rouge)
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleAddHoles}
              style={{
                flex: 1,
                padding: '16px',
                backgroundColor: editingHole ? '#f39c12' : (addMode === 'single' ? '#27ae60' : addMode === 'linear' ? '#3498db' : '#9b59b6'),
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '15px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            >
              {getAddButtonText()}
            </button>

            {editingHole && (
              <button
                onClick={() => {
                  setEditingHole(null);
                  setPositionX(faceInfo.width / 2);
                  setPositionY(faceInfo.height / 2);
                }}
                style={{
                  padding: '16px 24px',
                  backgroundColor: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ✖️ Annuler
              </button>
            )}
          </div>

          {validationErrors.length > 0 && (
            <div style={{
              padding: '12px',
              backgroundColor: '#ffe6e6',
              borderLeft: '4px solid #e74c3c',
              borderRadius: '4px'
            }}>
              {validationErrors.map((error, index) => (
                <div key={index} style={{ fontSize: '13px', color: '#c0392b' }}>
                  ⚠️ {error}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar droite */}
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {/* Sélection de face */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#2c3e50' }}>
              📐 Face
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {availableFaces.map(face => (
                <button
                  key={face}
                  onClick={() => setSelectedFace(face)}
                  style={{
                    padding: '10px',
                    border: selectedFace === face ? '2px solid #3498db' : '1px solid #dee2e6',
                    borderRadius: '6px',
                    backgroundColor: selectedFace === face ? '#e7f3ff' : 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: selectedFace === face ? 'bold' : 'normal'
                  }}
                >
                  {face === DSTVFace.TOP && 'Dessus'}
                  {face === DSTVFace.BOTTOM && 'Dessous'}
                  {face === DSTVFace.FRONT && 'Avant'}
                  {face === DSTVFace.BACK && 'Arrière'}
                </button>
              ))}
            </div>
          </div>

          {/* Liste des trous */}
          <div style={{
            flex: 1,
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflowY: 'auto'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#2c3e50' }}>
              📋 Trous ({holes.length})
            </div>
            {holes.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#7f8c8d', textAlign: 'center', padding: '20px' }}>
                Aucun trou
              </div>
            ) : (
              holes.map(hole => (
                <div
                  key={hole.id}
                  style={{
                    padding: '10px',
                    marginBottom: '8px',
                    backgroundColor: editingHole?.id === hole.id ? '#fff3cd' : '#f8f9fa',
                    borderRadius: '6px',
                    border: '1px solid #dee2e6'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px' }}>
                      <strong>{hole.label}</strong> - Ø{hole.diameter}mm
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        onClick={() => handleEditExistingHole(hole)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#3498db',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onDeleteHole(hole.id)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#e74c3c',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#7f8c8d', marginTop: '4px' }}>
                    Face: {hole.coordinates.face} | X:{hole.coordinates.x.toFixed(0)}mm Y:{hole.coordinates.y.toFixed(0)}mm
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HoleAddingSimple;
