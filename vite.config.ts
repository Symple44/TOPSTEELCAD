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
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
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