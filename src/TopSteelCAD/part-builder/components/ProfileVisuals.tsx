import React from 'react';

interface ProfileVisualsProps {
  type: string;
  width?: number;
  height?: number;
  selected?: boolean;
}

// Composants SVG pour chaque type de profil
export const ProfileVisuals: React.FC<ProfileVisualsProps> = ({
  type,
  width = 60,
  height = 60,
  selected = false
}) => {
  const strokeColor = selected ? '#3b82f6' : '#64748b';
  const fillColor = selected ? '#dbeafe' : '#f1f5f9';
  const strokeWidth = selected ? 2 : 1;

  switch (type) {
    case 'IPE':
      return (
        <svg width={width} height={height} viewBox="0 0 60 60">
          <g transform="translate(30, 30)">
            {/* Ailes */}
            <rect x="-20" y="-25" width="40" height="6" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
            <rect x="-20" y="19" width="40" height="6" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Âme */}
            <rect x="-3" y="-19" width="6" height="38" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Congés */}
            <circle cx="-3" cy="-19" r="2" fill={fillColor} />
            <circle cx="3" cy="-19" r="2" fill={fillColor} />
            <circle cx="-3" cy="19" r="2" fill={fillColor} />
            <circle cx="3" cy="19" r="2" fill={fillColor} />
          </g>
        </svg>
      );

    case 'HEA':
    case 'HEB':
      return (
        <svg width={width} height={height} viewBox="0 0 60 60">
          <g transform="translate(30, 30)">
            {/* Ailes plus larges */}
            <rect x="-25" y="-25" width="50" height="8" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
            <rect x="-25" y="17" width="50" height="8" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Âme */}
            <rect x="-4" y="-17" width="8" height="34" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          </g>
        </svg>
      );

    case 'UPE':
    case 'UAP':
      return (
        <svg width={width} height={height} viewBox="0 0 60 60">
          <g transform="translate(30, 30)">
            {/* Ailes */}
            <rect x="-20" y="-25" width="15" height="6" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
            <rect x="-20" y="19" width="15" height="6" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Âme */}
            <rect x="-20" y="-25" width="6" height="50" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          </g>
        </svg>
      );

    case 'L':
      return (
        <svg width={width} height={height} viewBox="0 0 60 60">
          <g transform="translate(30, 30)">
            <path
              d="M -20 -20 L -20 20 L 20 20 L 20 14 L -14 14 L -14 -20 Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
          </g>
        </svg>
      );

    case 'RHS':
      return (
        <svg width={width} height={height} viewBox="0 0 60 60">
          <g transform="translate(30, 30)">
            <rect
              x="-20" y="-15" width="40" height="30"
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth * 3}
            />
            <rect
              x="-16" y="-11" width="32" height="22"
              fill={fillColor}
              stroke="none"
            />
          </g>
        </svg>
      );

    case 'CHS':
      return (
        <svg width={width} height={height} viewBox="0 0 60 60">
          <g transform="translate(30, 30)">
            <circle
              cx="0" cy="0" r="20"
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth * 3}
            />
            <circle
              cx="0" cy="0" r="16"
              fill={fillColor}
              stroke="none"
            />
          </g>
        </svg>
      );

    case 'T':
      return (
        <svg width={width} height={height} viewBox="0 0 60 60">
          <g transform="translate(30, 30)">
            {/* Aile supérieure */}
            <rect x="-25" y="-25" width="50" height="8" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Âme */}
            <rect x="-4" y="-17" width="8" height="42" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          </g>
        </svg>
      );

    case 'PLATE':
      return (
        <svg width={width} height={height} viewBox="0 0 60 60">
          <g transform="translate(30, 30)">
            <rect
              x="-25" y="-5" width="50" height="10"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
          </g>
        </svg>
      );

    default:
      return (
        <svg width={width} height={height} viewBox="0 0 60 60">
          <rect x="10" y="10" width="40" height="40" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
        </svg>
      );
  }
};

// Vue en coupe avec position des trous
export const ProfileCrossSection: React.FC<{
  profileType: string;
  width?: number;
  height?: number;
  holes?: Array<{ x: number; y: number; diameter: number; face: string }>;
  selectedFace?: string;
}> = ({ profileType, width = 200, height = 200, holes = [], selectedFace }) => {
  const renderHoles = () => {
    return holes.map((hole, index) => (
      <circle
        key={index}
        cx={hole.x}
        cy={hole.y}
        r={hole.diameter / 2}
        fill="white"
        stroke="#3b82f6"
        strokeWidth="2"
      />
    ));
  };

  const getFaceHighlight = (face: string) => {
    if (face !== selectedFace) return null;

    switch (face) {
      case 'TOP_FLANGE':
        return <rect x="50" y="20" width="100" height="15" fill="#3b82f6" opacity="0.3" />;
      case 'BOTTOM_FLANGE':
        return <rect x="50" y="165" width="100" height="15" fill="#3b82f6" opacity="0.3" />;
      case 'WEB':
        return <rect x="93" y="35" width="14" height="130" fill="#3b82f6" opacity="0.3" />;
      default:
        return null;
    }
  };

  if (profileType === 'IPE' || profileType === 'HEA' || profileType === 'HEB') {
    return (
      <svg width={width} height={height} viewBox="0 0 200 200">
        <g>
          {/* Face sélectionnée en surbrillance */}
          {getFaceHighlight(selectedFace || '')}

          {/* Profil I */}
          <rect x="50" y="20" width="100" height="15" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
          <rect x="50" y="165" width="100" height="15" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
          <rect x="93" y="35" width="14" height="130" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />

          {/* Lignes de cote */}
          <line x1="10" y1="20" x2="10" y2="180" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="2,2" />
          <line x1="190" y1="20" x2="190" y2="180" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="2,2" />
          <line x1="50" y1="10" x2="150" y2="10" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="2,2" />

          {/* Trous */}
          {renderHoles()}

          {/* Labels des faces */}
          <text x="100" y="30" textAnchor="middle" fontSize="10" fill="#64748b">Aile sup.</text>
          <text x="100" y="175" textAnchor="middle" fontSize="10" fill="#64748b">Aile inf.</text>
          <text x="100" y="105" textAnchor="middle" fontSize="10" fill="#64748b">Âme</text>
        </g>
      </svg>
    );
  }

  // Autres types de profils...
  return (
    <svg width={width} height={height} viewBox="0 0 200 200">
      <rect x="50" y="50" width="100" height="100" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
      {renderHoles()}
    </svg>
  );
};

// Visualisation de patterns de trous
export const HolePatternVisual: React.FC<{
  pattern: string;
  count?: number;
  rows?: number;
  columns?: number;
}> = ({ pattern, count = 1, rows = 1, columns = 1 }) => {
  const renderPattern = () => {
    switch (pattern) {
      case 'SINGLE':
        return <circle cx="50" cy="50" r="8" fill="#3b82f6" />;

      case 'LINE':
        return Array.from({ length: count }).map((_, i) => (
          <circle key={i} cx={20 + i * 20} cy="50" r="5" fill="#3b82f6" />
        ));

      case 'GRID':
        const holes = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < columns; c++) {
            holes.push(
              <circle
                key={`${r}-${c}`}
                cx={25 + c * 20}
                cy={25 + r * 20}
                r="4"
                fill="#3b82f6"
              />
            );
          }
        }
        return holes;

      case 'CIRCULAR':
        return Array.from({ length: count }).map((_, i) => {
          const angle = (i * 360) / count;
          const x = 50 + 25 * Math.cos(angle * Math.PI / 180);
          const y = 50 + 25 * Math.sin(angle * Math.PI / 180);
          return <circle key={i} cx={x} cy={y} r="5" fill="#3b82f6" />;
        });

      default:
        return null;
    }
  };

  return (
    <svg width="100" height="100" viewBox="0 0 100 100" style={{ backgroundColor: '#f8fafc', borderRadius: '8px' }}>
      <rect x="5" y="5" width="90" height="90" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,3" />
      {renderPattern()}
    </svg>
  );
};

// Visualisation 3D simplifiée de la pièce
export const PartIsometric: React.FC<{
  profileType: string;
  length: number;
  holes?: Array<{ position: number; face: string }>;
  notches?: Array<{ position: number; type: string }>;
}> = ({ profileType, length, holes = [], notches = [] }) => {
  const scale = Math.min(300 / length, 1);

  return (
    <svg width="400" height="300" viewBox="0 0 400 300" style={{ backgroundColor: '#f8fafc' }}>
      {/* Vue isométrique simplifiée */}
      <g transform="translate(200, 150)">
        {/* Face avant */}
        <path
          d={`M -100 0 L -100 -50 L 100 -50 L 100 0 Z`}
          fill="#cbd5e1"
          stroke="#64748b"
          strokeWidth="1"
        />
        {/* Face supérieure */}
        <path
          d={`M -100 -50 L -50 -75 L 150 -75 L 100 -50 Z`}
          fill="#e2e8f0"
          stroke="#64748b"
          strokeWidth="1"
        />
        {/* Face droite */}
        <path
          d={`M 100 -50 L 150 -75 L 150 -25 L 100 0 Z`}
          fill="#94a3b8"
          stroke="#64748b"
          strokeWidth="1"
        />

        {/* Indicateurs de trous */}
        {holes.map((hole, i) => (
          <circle
            key={i}
            cx={-100 + (hole.position * 200 / length)}
            cy="-25"
            r="3"
            fill="white"
            stroke="#3b82f6"
            strokeWidth="2"
          />
        ))}

        {/* Indicateurs d'encoches */}
        {notches.map((notch, i) => (
          <rect
            key={i}
            x={-100 + (notch.position * 200 / length) - 5}
            y="-10"
            width="10"
            height="10"
            fill="white"
            stroke="#f59e0b"
            strokeWidth="2"
          />
        ))}
      </g>

      {/* Légende */}
      <g transform="translate(20, 250)">
        <circle cx="0" cy="0" r="3" fill="white" stroke="#3b82f6" strokeWidth="2" />
        <text x="10" y="4" fontSize="12" fill="#64748b">Trous</text>

        <rect x="60" y="-5" width="10" height="10" fill="white" stroke="#f59e0b" strokeWidth="2" />
        <text x="75" y="4" fontSize="12" fill="#64748b">Encoches</text>
      </g>
    </svg>
  );
};