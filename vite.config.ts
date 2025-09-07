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
      chunkSizeWarningLimit: 800, // Augmenté légèrement pour éviter les warnings inutiles
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        },
        output: {
          manualChunks: (id) => {
            // Vendor libraries
            if (id.includes('node_modules')) {
              if (id.includes('three')) {
                return 'vendor-three';
              }
              if (id.includes('react')) {
                return 'vendor-react';
              }
              if (id.includes('three-bvh-csg')) {
                return 'vendor-csg';
              }
              return 'vendor-other';
            }

            // DSTV Plugin and Cut System (heavy components)
            if (id.includes('plugins/dstv') || id.includes('processors/cut')) {
              return 'dstv-system';
            }

            // Feature processors
            if (id.includes('core/features/processors') && !id.includes('processors/cut')) {
              return 'feature-processors';
            }

            // WebWorkers
            if (id.includes('workers') || id.includes('WebWorker')) {
              return 'webworkers';
            }

            // 3D Library components
            if (id.includes('3DLibrary/geometry-generators')) {
              return 'geometry-generators';
            }
            if (id.includes('3DLibrary/database')) {
              return 'profile-database';
            }

            // UI components
            if (id.includes('/ui/') || id.includes('components/')) {
              return 'ui-components';
            }

            // Tools
            if (id.includes('/tools/')) {
              return 'tools';
            }

            // Themes and plugins (non-DSTV)
            if (id.includes('/themes/') || (id.includes('/plugins/') && !id.includes('dstv'))) {
              return 'themes-plugins';
            }

            // Core engine
            if (id.includes('core/') && 
                (id.includes('ViewerEngine') || id.includes('SceneManager') || 
                 id.includes('RenderingPipeline') || id.includes('EventBus'))) {
              return 'core';
            }

            // Default chunk for main entry point and uncategorized modules
            return 'main';
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
          drop_console: false, // Garder console.log pour le debug mais optimiser
          drop_debugger: true,
          pure_funcs: ['console.debug', 'console.trace'], // Supprimer seulement debug/trace
          passes: 2, // Double passe pour meilleure compression
          toplevel: true,
          unsafe: true,
          unsafe_arrows: true,
          unsafe_methods: true,
          unsafe_proto: true
        },
        mangle: {
          safari10: true,
          properties: {
            regex: /^_/ // Mangle les propriétés privées commençant par _
          }
        },
        format: {
          comments: false // Supprimer les commentaires
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