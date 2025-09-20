import React, { useState } from 'react';
import { Vector3 } from './utils/Vector3';
import { ProfileVisuals } from './components/ProfileVisuals';
import { Part3DViewerPro } from './components/Part3DViewerPro';
import { exportParts } from './utils/exporters';

interface Hole {
  id: string;
  diameter: number;
  position: Vector3;
  distanceFromStart: number;
}

interface Part {
  profileType: string;
  profileSize: string;
  length: number;
  holes: Hole[];
}

const PROFILES = {
  IPE: ['100', '200', '300', '400', '500'],
  HEA: ['100', '200', '300', '400'],
  HEB: ['100', '200', '300', '400'],
  UPE: ['100', '200', '300'],
};

export const PartBuilderSimple: React.FC = () => {
  const [part, setPart] = useState<Part>({
    profileType: 'IPE',
    profileSize: '200',
    length: 3000,
    holes: []
  });

  const [showAddHole, setShowAddHole] = useState(false);
  const [newHole, setNewHole] = useState({ diameter: 20, distance: 500 });

  const addHole = () => {
    const hole: Hole = {
      id: Date.now().toString(),
      diameter: newHole.diameter,
      position: new Vector3(0, 0, newHole.distance),
      distanceFromStart: newHole.distance
    };
    setPart({ ...part, holes: [...part.holes, hole] });
    setShowAddHole(false);
    setNewHole({ diameter: 20, distance: 500 });
  };

  const removeHole = (id: string) => {
    setPart({ ...part, holes: part.holes.filter(h => h.id !== id) });
  };

  const handleExport = () => {
    exportParts([{
      id: '1',
      name: `${part.profileType} ${part.profileSize}`,
      profileType: part.profileType,
      profileSize: part.profileSize,
      length: part.length,
      material: 'S235',
      quantity: 1,
      holes: part.holes.map(h => ({
        ...h,
        face: 'TOP_FLANGE',
        isThrough: true
      })),
      notches: []
    }], 'DSTV');
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      backgroundColor: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Panneau de configuration */}
      <div style={{
        width: '400px',
        backgroundColor: 'white',
        padding: '30px',
        boxShadow: '0 0 20px rgba(0,0,0,0.05)',
        overflowY: 'auto'
      }}>
        <h2 style={{ margin: '0 0 30px 0', fontSize: '24px', fontWeight: '600' }}>
          Configuration de la pièce
        </h2>

        {/* Sélection du profil */}
        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: '500' }}>
            Type de profil
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {Object.keys(PROFILES).map(type => (
              <button
                key={type}
                onClick={() => setPart({ ...part, profileType: type })}
                style={{
                  padding: '10px',
                  border: part.profileType === type ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: part.profileType === type ? '#eff6ff' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <ProfileVisuals type={type} width={40} height={40} selected={part.profileType === type} />
                <span style={{ fontSize: '12px', marginTop: '5px', fontWeight: '500' }}>{type}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dimensions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
              Section
            </label>
            <select
              value={part.profileSize}
              onChange={(e) => setPart({ ...part, profileSize: e.target.value })}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              {PROFILES[part.profileType as keyof typeof PROFILES]?.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
              Longueur (mm)
            </label>
            <input
              type="number"
              value={part.length}
              onChange={(e) => setPart({ ...part, length: parseInt(e.target.value) || 0 })}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* Trous */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500' }}>
              Trous ({part.holes.length})
            </label>
            <button
              onClick={() => setShowAddHole(true)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              + Ajouter
            </button>
          </div>

          {showAddHole && (
            <div style={{
              padding: '15px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              marginBottom: '15px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>Diamètre (mm)</label>
                  <input
                    type="number"
                    value={newHole.diameter}
                    onChange={(e) => setNewHole({ ...newHole, diameter: parseInt(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>Distance (mm)</label>
                  <input
                    type="number"
                    value={newHole.distance}
                    onChange={(e) => setNewHole({ ...newHole, distance: parseInt(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={addHole}
                  style={{
                    flex: 1,
                    padding: '6px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Valider
                </button>
                <button
                  onClick={() => setShowAddHole(false)}
                  style={{
                    flex: 1,
                    padding: '6px',
                    backgroundColor: '#e5e7eb',
                    color: '#6b7280',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Liste des trous */}
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {part.holes.map((hole, index) => (
              <div
                key={hole.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px',
                  backgroundColor: index % 2 === 0 ? '#f8fafc' : 'white',
                  borderRadius: '4px',
                  marginBottom: '2px'
                }}
              >
                <span style={{ fontSize: '13px' }}>
                  Ø{hole.diameter}mm à {hole.distanceFromStart}mm
                </span>
                <button
                  onClick={() => removeHole(hole.id)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Suppr
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Bouton export */}
        <button
          onClick={handleExport}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          Exporter DSTV
        </button>
      </div>

      {/* Vue 3D */}
      <div style={{
        flex: 1,
        padding: '30px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '500', color: '#374151' }}>
          Visualisation 3D
        </h2>
        <div style={{
          flex: 1,
          backgroundColor: 'white',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 0 20px rgba(0,0,0,0.05)'
        }}>
          <Part3DViewerPro
            profileType={part.profileType}
            profileSection={part.profileSize}
            length={part.length}
            holes={part.holes.map(h => ({
              diameter: h.diameter,
              distanceFromStart: h.distanceFromStart
            }))}
            width={window.innerWidth - 500}
            height={window.innerHeight - 150}
          />
        </div>
      </div>
    </div>
  );
};