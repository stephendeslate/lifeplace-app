// lifeplace-app/frontend/client-portal/vite.config.ts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
    // Force all React imports to use the same instance from client-portal's node_modules
    dedupe: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Strategic code splitting for client portal
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@mui/lab', '@mui/x-date-pickers'],
          'vendor-query': ['@tanstack/react-query', '@tanstack/react-query-devtools'],
          'vendor-form': ['react-hook-form', 'zod'],
          'vendor-stripe': ['@stripe/react-stripe-js', '@stripe/stripe-js'],
          'vendor-utils': ['axios', 'date-fns', 'date-fns-tz', 'lodash', 'dompurify'],
          'vendor-charts': ['recharts'],
          // Remove problematic messaging context chunking to fix React context instance conflicts
        },
        // Optimize chunk naming
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
            : 'chunk'
          return `js/${facadeModuleId}-[hash].js`
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || []
          const extType = info[info.length - 1] || ''
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || '')) {
            return `images/[name]-[hash][extname]`
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
            return `fonts/[name]-[hash][extname]`
          }
          return `${extType}/[name]-[hash][extname]`
        }
      }
    },
    // Performance optimizations
    chunkSizeWarningLimit: 800, // Smaller warning limit for client-facing app
    reportCompressedSize: false,
    // Build optimizations
    cssMinify: true,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@mui/icons-material',
      '@tanstack/react-query',
      '@stripe/react-stripe-js',
      '@stripe/stripe-js',
      'axios'
    ],
    exclude: ['@vite/client', '@vite/env']
  },
  server: {
    port: 5174,
    host: true,
    hmr: {
      overlay: false // Reduce HMR overlay noise
    }
  },
  preview: {
    port: 4173,
    host: '0.0.0.0',
  },
  // Performance monitoring
  define: {
    __VITE_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  }
})