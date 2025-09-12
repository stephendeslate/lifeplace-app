// lifeplace-app/frontend/admin-crm/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react()
  ],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    }
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
        // Strategic code splitting
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@mui/lab', '@mui/x-date-pickers'],
          'vendor-query': ['@tanstack/react-query', '@tanstack/react-query-devtools'],
          'vendor-form': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-editor': ['@tiptap/core', '@tiptap/react', '@tiptap/starter-kit', 'mui-tiptap'],
          'vendor-utils': ['axios', 'date-fns', 'date-fns-tz', 'dompurify'],
          'vendor-charts': ['recharts'],
          // Shared components
          'shared-messaging': ['../shared/contexts/MessagingContext', '../shared/contexts/WebSocketContext'],
          'shared-hooks': ['../shared/hooks/useRealTimeUpdates', '../shared/hooks/useMemoryManagement'],
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
      },
      // Optimize external dependencies
      external: () => {
        // Don't externalize shared components - we want them bundled
        return false
      }
    },
    // Performance optimizations
    chunkSizeWarningLimit: 1000,
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
      'axios'
    ],
    exclude: ['@vite/client', '@vite/env']
  },
  server: {
    port: 5173,
    host: true,
    hmr: {
      overlay: false // Reduce HMR overlay noise
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  // Performance monitoring
  define: {
    __VITE_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  }
})
