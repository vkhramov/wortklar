import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Project site: https://vkhramov.github.io/wortklar/
  base: '/wortklar/',
  plugins: [react()],
  build: {
    // GitHub Pages can publish the /docs folder from main
    outDir: 'docs',
    emptyOutDir: true,
  },
})
