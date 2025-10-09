/**
 * Éditeur de localisation géographique
 * Pour calculs de production solaire (ombrières)
 * Building Estimator - TopSteelCAD
 */

import React from 'react';
import { Location } from '../types/ombriere.types';
import {
  formSectionStyle,
  formRowStyle,
  formGroupStyle,
  labelStyle,
  inputStyle,
  selectStyle,
  cardTitleStyle
} from '../styles/buildingEstimator.styles';

interface LocationEditorProps {
  location?: Location;
  onChange: (location: Location) => void;
}

/**
 * Villes de France avec coordonnées prédéfinies
 */
const FRENCH_CITIES = {
  'paris': { name: 'Paris', latitude: 48.85, longitude: 2.35, altitude: 100 },
  'lyon': { name: 'Lyon', latitude: 45.75, longitude: 4.85, altitude: 200 },
  'marseille': { name: 'Marseille', latitude: 43.30, longitude: 5.40, altitude: 50 },
  'toulouse': { name: 'Toulouse', latitude: 43.60, longitude: 1.45, altitude: 150 },
  'nice': { name: 'Nice', latitude: 43.70, longitude: 7.25, altitude: 10 },
  'nantes': { name: 'Nantes', latitude: 47.22, longitude: -1.55, altitude: 20 },
  'strasbourg': { name: 'Strasbourg', latitude: 48.58, longitude: 7.75, altitude: 140 },
  'bordeaux': { name: 'Bordeaux', latitude: 44.84, longitude: -0.58, altitude: 10 },
  'lille': { name: 'Lille', latitude: 50.63, longitude: 3.06, altitude: 20 },
  'rennes': { name: 'Rennes', latitude: 48.11, longitude: -1.68, altitude: 40 },
  'custom': { name: 'Personnalisé', latitude: 46.0, longitude: 2.0, altitude: 200 }
};

export const LocationEditor: React.FC<LocationEditorProps> = ({
  location,
  onChange
}) => {
  const [selectedCity, setSelectedCity] = React.useState<string>('lyon');
  const [isCustom, setIsCustom] = React.useState(false);

  // Configuration par défaut
  const defaultLocation: Location = {
    latitude: 45.75,
    longitude: 4.85,
    altitude: 200
  };

  const currentLocation = location || defaultLocation;

  // Estimer l'irradiation annuelle selon latitude
  const estimateIrradiation = (lat: number): number => {
    if (lat < 40) return 1600; // Sud profond
    if (lat < 44) return 1400; // Sud
    if (lat < 47) return 1200; // Centre
    if (lat < 49) return 1100; // Nord-Centre
    return 1000; // Nord
  };

  const irradiation = estimateIrradiation(currentLocation.latitude);

  const handleCityChange = (cityKey: string) => {
    setSelectedCity(cityKey);

    if (cityKey === 'custom') {
      setIsCustom(true);
    } else {
      setIsCustom(false);
      const city = FRENCH_CITIES[cityKey as keyof typeof FRENCH_CITIES];
      onChange({
        latitude: city.latitude,
        longitude: city.longitude,
        altitude: city.altitude
      });
    }
  };

  const handleFieldChange = (field: keyof Location, value: number) => {
    onChange({
      ...currentLocation,
      [field]: value
    });
  };

  return (
    <div style={formSectionStyle}>
      <h3 style={cardTitleStyle}>📍 Localisation Géographique</h3>

      <div style={{
        padding: '12px 16px',
        background: '#fef3c7',
        border: '2px solid #fbbf24',
        borderRadius: '8px',
        marginBottom: '16px'
      }}>
        <div style={{ fontSize: '0.85rem', color: '#92400e', marginBottom: '4px' }}>
          ☀️ Irradiation solaire estimée: <strong>{irradiation} kWh/m²/an</strong>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#b45309' }}>
          Utilisée pour estimer la production photovoltaïque
        </div>
      </div>

      <div style={formRowStyle}>
        <div style={formGroupStyle}>
          <label style={labelStyle}>Ville de référence</label>
          <select
            style={selectStyle}
            value={selectedCity}
            onChange={(e) => handleCityChange(e.target.value)}
          >
            <option value="paris">Paris (48.85°N, 2.35°E)</option>
            <option value="lyon">Lyon (45.75°N, 4.85°E)</option>
            <option value="marseille">Marseille (43.30°N, 5.40°E)</option>
            <option value="toulouse">Toulouse (43.60°N, 1.45°E)</option>
            <option value="nice">Nice (43.70°N, 7.25°E)</option>
            <option value="nantes">Nantes (47.22°N, -1.55°W)</option>
            <option value="strasbourg">Strasbourg (48.58°N, 7.75°E)</option>
            <option value="bordeaux">Bordeaux (44.84°N, -0.58°W)</option>
            <option value="lille">Lille (50.63°N, 3.06°E)</option>
            <option value="rennes">Rennes (48.11°N, -1.68°W)</option>
            <option value="custom">📍 Coordonnées personnalisées</option>
          </select>
        </div>
      </div>

      {isCustom && (
        <>
          <div style={formRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Latitude (°)</label>
              <input
                type="number"
                style={inputStyle}
                value={currentLocation.latitude}
                onChange={(e) => handleFieldChange('latitude', parseFloat(e.target.value))}
                min={-90}
                max={90}
                step={0.01}
              />
              <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Nord positif (France: 42-51°N)
              </small>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Longitude (°)</label>
              <input
                type="number"
                style={inputStyle}
                value={currentLocation.longitude}
                onChange={(e) => handleFieldChange('longitude', parseFloat(e.target.value))}
                min={-180}
                max={180}
                step={0.01}
              />
              <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Est positif (France: -5° à 8°E)
              </small>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Altitude (m)</label>
              <input
                type="number"
                style={inputStyle}
                value={currentLocation.altitude}
                onChange={(e) => handleFieldChange('altitude', parseInt(e.target.value))}
                min={0}
                max={5000}
                step={10}
              />
              <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Niveau de la mer = 0m
              </small>
            </div>
          </div>
        </>
      )}

      <div style={{
        padding: '12px 16px',
        background: '#f0fdf4',
        border: '1px solid #86efac',
        borderRadius: '8px',
        marginTop: '12px'
      }}>
        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#166534', marginBottom: '6px' }}>
          📊 Localisation actuelle
        </div>
        <div style={{ fontSize: '0.8rem', color: '#15803d', lineHeight: '1.5' }}>
          <div><strong>Latitude:</strong> {currentLocation.latitude.toFixed(2)}°</div>
          <div><strong>Longitude:</strong> {currentLocation.longitude.toFixed(2)}°</div>
          <div><strong>Altitude:</strong> {currentLocation.altitude}m</div>
          <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #86efac' }}>
            <strong>Zone climatique:</strong>{' '}
            {currentLocation.latitude < 44 ? 'Sud (fort ensoleillement)' :
             currentLocation.latitude < 47 ? 'Centre (bon ensoleillement)' :
             currentLocation.latitude < 49 ? 'Nord-Centre (ensoleillement modéré)' :
             'Nord (ensoleillement faible)'}
          </div>
        </div>
      </div>
    </div>
  );
};
