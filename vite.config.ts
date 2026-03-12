import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for assets
  server: {
    port: 3000,
    hmr: {
      overlay: true,
    },
    // Force reload on changes
    watch: {
      usePolling: false,
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Ensure proper cache busting with content hashes
    rollupOptions: {
      output: {
        manualChunks: undefined,
        // Add timestamp to chunk names for better cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
})

