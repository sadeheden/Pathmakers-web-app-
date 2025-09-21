import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 30000, 
    outDir: 'build', // Make sure this matches your static site deployment
    sourcemap: false, // Disable for production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom']
        }
      }
    }
  },
  // For development
  server: {
    proxy: {
      '/api': {
        target: 'https://pathmakers-web-app-site.onrender.com',
        changeOrigin: true,
        secure: true
      }
    }
  }
});