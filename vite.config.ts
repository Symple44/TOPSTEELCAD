import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isLibMode = mode === 'lib';
  
  return {
    plugins: [
      react(),
      ...(isLibMode ? [
        dts({
          include: ['src/**/*'],
          exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/examples/**/*'],
          outputDir: 'dist',
          copyDtsFiles: true
        })
      ] : [])
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@/TopSteelCAD': resolve(__dirname, 'src/TopSteelCAD'),
        '@/types': resolve(__dirname, 'src/types')
      }
    },
    build: isLibMode ? {
      lib: {
        entry: resolve(__dirname, 'src/TopSteelCAD/index.ts'),
        name: 'TopSteelCAD',
        formats: ['es', 'umd'],
        fileName: (format) => `topsteelcad.${format}.js`
      },
      rollupOptions: {
        external: ['react', 'react-dom', 'three'],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            three: 'THREE'
          }
        }
      }
    } : {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        },
        output: {
          manualChunks: {
            // Three.js et dépendances 3D
            'vendor-three': ['three'],
            'vendor-react': ['react', 'react-dom'],
            
            // Core engine
            'core': [
              './src/TopSteelCAD/core/ViewerEngine',
              './src/TopSteelCAD/core/SceneManager',
              './src/TopSteelCAD/core/RenderingPipeline',
              './src/TopSteelCAD/core/EventBus'
            ],
            
            // 3D Library - Générateurs
            'geometry-generators': [
              './src/TopSteelCAD/3DLibrary/geometry-generators/GeometryGeneratorFactory',
              './src/TopSteelCAD/3DLibrary/geometry-generators/generators/IProfileGenerator',
              './src/TopSteelCAD/3DLibrary/geometry-generators/generators/UProfileGenerator',
              './src/TopSteelCAD/3DLibrary/geometry-generators/generators/LProfileGenerator',
              './src/TopSteelCAD/3DLibrary/geometry-generators/generators/TubeGenerator'
            ],
            
            // Base de données de profils
            'profile-database': [
              './src/TopSteelCAD/3DLibrary/database/ProfileDatabase',
              './src/TopSteelCAD/3DLibrary/database/UnifiedMaterialsDatabase'
            ],
            
            // Outils
            'tools': [
              './src/TopSteelCAD/tools/MeasurementTool',
              './src/TopSteelCAD/tools/IsolateTool',
              './src/TopSteelCAD/tools/ExplodeTool',
              './src/TopSteelCAD/tools/SectionTool',
              './src/TopSteelCAD/tools/VisibilityTool'
            ]
          },
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : '';
            if (facadeModuleId.includes('profile')) {
              return 'assets/profiles/[name]-[hash].js';
            }
            return 'assets/[name]-[hash].js';
          }
        }
      },
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace']
        }
      }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test-setup.ts'
    }
  };
});