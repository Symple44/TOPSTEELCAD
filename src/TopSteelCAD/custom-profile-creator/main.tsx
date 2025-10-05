/**
 * Point d'entrée de l'application autonome Créateur de Profils Personnalisés
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ProfileCreatorApp } from './ProfileCreatorApp';

// Styles globaux
const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow: hidden;
  }

  h1, h2, h3, h4, h5, h6 {
    margin: 0;
  }

  p {
    margin: 0;
  }

  button {
    font-family: inherit;
  }

  input, select, textarea {
    font-family: inherit;
  }

  /* Scrollbar personnalisée */
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  ::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 5px;
  }

  ::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 5px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;

// Injecter les styles globaux
const styleSheet = document.createElement('style');
styleSheet.textContent = globalStyles;
document.head.appendChild(styleSheet);

// Render l'application
const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <ProfileCreatorApp />
  </React.StrictMode>
);

// Log de démarrage
console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ✏️  Créateur de Profils Personnalisés - TopSteelCAD    ║
║                                                           ║
║   Version: 1.0.0                                          ║
║   Chargé avec succès                                      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);
