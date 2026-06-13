import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/build')) return 'three'
          if (id.includes('node_modules/@react-three/fiber')) return 'r3f-fiber'
          if (id.includes('node_modules/@react-three/drei')) return 'r3f-drei'
        }
      }
    }
  }
}))
