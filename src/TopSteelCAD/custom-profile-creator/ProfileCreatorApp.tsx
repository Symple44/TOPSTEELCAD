/**
 * Application autonome de création de profils personnalisés
 * Interface complète avec éditeur 2D et gestionnaire de bibliothèque
 */

import React, { useState } from 'react';
import { ProfileGenerator2D } from '../part-builder/components/ProfileGenerator2D';
import { CustomProfileManager } from '../part-builder/components/CustomProfileManager';
import { CustomProfile } from '../3DLibrary/types/custom-profile.types';
import { getCustomProfileStorage } from '../part-builder/services/CustomProfileStorage';
import { convertCustomProfileToGeometry } from '../viewer/CustomGeometryConverter';
import * as THREE from 'three';

type ViewMode = 'creator' | 'library' | 'preview';

export const ProfileCreatorApp: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('creator');
  const [currentProfile, setCurrentProfile] = useState<CustomProfile | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);

  const storage = getCustomProfileStorage();

  const handleProfileCreated = async (profile: CustomProfile) => {
    try {
      await storage.save(profile);
      setCurrentProfile(profile);
      alert(`✅ Profil "${profile.name}" créé et sauvegardé avec succès!`);

      // Proposer de voir la bibliothèque
      if (confirm('Voulez-vous voir la bibliothèque de profils?')) {
        setViewMode('library');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('❌ Erreur lors de la sauvegarde du profil');
    }
  };

  const handleProfileSelected = (profile: CustomProfile) => {
    setCurrentProfile(profile);
    setViewMode('preview');
  };

  const handleNewProfile = () => {
    setCurrentProfile(null);
    setViewMode('creator');
  };

  if (showWelcome) {
    return (
      <div style={welcomeContainerStyle}>
        <div style={welcomeCardStyle}>
          <h1 style={welcomeTitleStyle}>✏️ Créateur de Profils Personnalisés</h1>
          <p style={welcomeSubtitleStyle}>
            Créez vos propres profils métalliques avec un éditeur 2D intuitif
          </p>

          <div style={featuresGridStyle}>
            <div style={featureCardStyle}>
              <div style={featureIconStyle}>📐</div>
              <h3>Éditeur 2D</h3>
              <p>Dessinez vos profils avec des outils professionnels</p>
            </div>

            <div style={featureCardStyle}>
              <div style={featureIconStyle}>🧲</div>
              <h3>Grille magnétique</h3>
              <p>Accrochage précis aux points de grille</p>
            </div>

            <div style={featureCardStyle}>
              <div style={featureIconStyle}>📊</div>
              <h3>Calculs automatiques</h3>
              <p>Aire, périmètre, centroïde, poids...</p>
            </div>

            <div style={featureCardStyle}>
              <div style={featureIconStyle}>💾</div>
              <h3>Bibliothèque</h3>
              <p>Sauvegardez et réutilisez vos profils</p>
            </div>

            <div style={featureCardStyle}>
              <div style={featureIconStyle}>📤</div>
              <h3>Export/Import</h3>
              <p>Format JSON pour partager vos profils</p>
            </div>

            <div style={featureCardStyle}>
              <div style={featureIconStyle}>🎨</div>
              <h3>Visualisation 3D</h3>
              <p>Prévisualisez vos profils en 3D</p>
            </div>
          </div>

          <div style={welcomeActionsStyle}>
            <button
              style={primaryButtonStyle}
              onClick={() => {
                setShowWelcome(false);
                setViewMode('creator');
              }}
            >
              🚀 Créer un nouveau profil
            </button>
            <button
              style={secondaryButtonStyle}
              onClick={() => {
                setShowWelcome(false);
                setViewMode('library');
              }}
            >
              📚 Voir ma bibliothèque
            </button>
          </div>

          <div style={welcomeFooterStyle}>
            <p>
              💡 <strong>Astuce:</strong> Utilisez la molette pour zoomer, le clic milieu pour déplacer la vue
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={headerLeftStyle}>
          <h1 style={headerTitleStyle}>✏️ Créateur de Profils Personnalisés</h1>
          {currentProfile && (
            <div style={currentProfileBadgeStyle}>
              <strong>{currentProfile.name}</strong> - {currentProfile.designation}
            </div>
          )}
        </div>

        <div style={headerActionsStyle}>
          <button
            style={{
              ...navButtonStyle,
              ...(viewMode === 'creator' ? activeNavButtonStyle : {})
            }}
            onClick={() => setViewMode('creator')}
          >
            ✏️ Éditeur
          </button>
          <button
            style={{
              ...navButtonStyle,
              ...(viewMode === 'library' ? activeNavButtonStyle : {})
            }}
            onClick={() => setViewMode('library')}
          >
            📚 Bibliothèque
          </button>
          {currentProfile && (
            <button
              style={{
                ...navButtonStyle,
                ...(viewMode === 'preview' ? activeNavButtonStyle : {})
              }}
              onClick={() => setViewMode('preview')}
            >
              👁️ Aperçu 3D
            </button>
          )}
          <button style={newButtonStyle} onClick={handleNewProfile}>
            ➕ Nouveau
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {viewMode === 'creator' && (
          <ProfileGenerator2D
            onProfileCreated={handleProfileCreated}
            onClose={() => setViewMode('library')}
          />
        )}

        {viewMode === 'library' && (
          <CustomProfileManager
            onSelectProfile={handleProfileSelected}
            onClose={() => setViewMode('creator')}
          />
        )}

        {viewMode === 'preview' && currentProfile && (
          <ProfilePreview3D
            profile={currentProfile}
            onClose={() => setViewMode('library')}
          />
        )}
      </div>
    </div>
  );
};

// Composant de prévisualisation 3D
const ProfilePreview3D: React.FC<{
  profile: CustomProfile;
  onClose: () => void;
}> = ({ profile, onClose }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 10000);
    camera.position.set(500, 400, 500);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 200, 100);
    scene.add(directionalLight);

    // Grid
    const gridHelper = new THREE.GridHelper(1000, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Axes
    const axesHelper = new THREE.AxesHelper(200);
    scene.add(axesHelper);

    // Create profile geometry
    try {
      const geometry = convertCustomProfileToGeometry(profile, 1000);
      const material = new THREE.MeshStandardMaterial({
        color: 0x3498db,
        metalness: 0.7,
        roughness: 0.3
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      // Wireframe
      const wireframe = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 1 })
      );
      scene.add(wireframe);
    } catch (error) {
      console.error('Error creating 3D preview:', error);
    }

    // Animation
    const animate = () => {
      requestAnimationFrame(animate);

      // Rotation automatique
      scene.rotation.y += 0.005;

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      renderer.dispose();
    };
  }, [profile]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />

      {/* Overlay info */}
      <div style={previewOverlayStyle}>
        <h2>{profile.name}</h2>
        <p><strong>Désignation:</strong> {profile.designation}</p>
        <p><strong>Aire:</strong> {profile.properties.area.toFixed(2)} cm²</p>
        {profile.weight && (
          <p><strong>Poids:</strong> {profile.weight.toFixed(2)} kg/m</p>
        )}
        <button style={closePreviewButtonStyle} onClick={onClose}>
          ← Retour à la bibliothèque
        </button>
      </div>
    </div>
  );
};

// Styles
const welcomeContainerStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: '20px'
};

const welcomeCardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '20px',
  padding: '60px',
  maxWidth: '1000px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  textAlign: 'center'
};

const welcomeTitleStyle: React.CSSProperties = {
  fontSize: '48px',
  marginBottom: '10px',
  color: '#2c3e50',
  fontWeight: 'bold'
};

const welcomeSubtitleStyle: React.CSSProperties = {
  fontSize: '20px',
  color: '#7f8c8d',
  marginBottom: '50px'
};

const featuresGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '30px',
  marginBottom: '50px'
};

const featureCardStyle: React.CSSProperties = {
  padding: '20px',
  textAlign: 'center'
};

const featureIconStyle: React.CSSProperties = {
  fontSize: '48px',
  marginBottom: '15px'
};

const welcomeActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '20px',
  justifyContent: 'center',
  marginBottom: '30px'
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '18px 40px',
  fontSize: '18px',
  backgroundColor: '#3498db',
  color: 'white',
  border: 'none',
  borderRadius: '50px',
  cursor: 'pointer',
  fontWeight: 'bold',
  boxShadow: '0 4px 15px rgba(52,152,219,0.4)',
  transition: 'all 0.3s'
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '18px 40px',
  fontSize: '18px',
  backgroundColor: '#95a5a6',
  color: 'white',
  border: 'none',
  borderRadius: '50px',
  cursor: 'pointer',
  fontWeight: 'bold',
  transition: 'all 0.3s'
};

const welcomeFooterStyle: React.CSSProperties = {
  marginTop: '30px',
  padding: '20px',
  backgroundColor: '#ecf0f1',
  borderRadius: '10px',
  color: '#7f8c8d'
};

const containerStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#ecf0f1',
  overflow: 'hidden'
};

const headerStyle: React.CSSProperties = {
  backgroundColor: '#2c3e50',
  color: 'white',
  padding: '20px 30px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
};

const headerLeftStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '20px'
};

const headerTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '24px',
  fontWeight: 'bold'
};

const currentProfileBadgeStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.2)',
  padding: '8px 16px',
  borderRadius: '20px',
  fontSize: '14px'
};

const headerActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px'
};

const navButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: 'rgba(255,255,255,0.1)',
  color: 'white',
  border: '2px solid transparent',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500',
  transition: 'all 0.3s'
};

const activeNavButtonStyle: React.CSSProperties = {
  backgroundColor: '#3498db',
  borderColor: '#3498db'
};

const newButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: '#27ae60',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 'bold'
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'hidden'
};

const previewOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: '20px',
  left: '20px',
  backgroundColor: 'rgba(44, 62, 80, 0.95)',
  color: 'white',
  padding: '25px',
  borderRadius: '12px',
  minWidth: '300px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
};

const closePreviewButtonStyle: React.CSSProperties = {
  marginTop: '20px',
  padding: '10px 20px',
  backgroundColor: '#3498db',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  width: '100%',
  fontWeight: 'bold'
};

export default ProfileCreatorApp;
