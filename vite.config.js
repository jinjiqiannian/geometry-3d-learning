import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/geometry-3d-learning/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  }
}))
