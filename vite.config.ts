import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}

const buildId = new Date().toISOString().replace('T', ' ').slice(0, 16)

// https://vite.dev/config/
export default defineConfig({
  // Project site: https://vkhramov.github.io/wortklar/
  base: '/wortklar/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_ID__: JSON.stringify(buildId),
  },
  build: {
    // GitHub Pages can publish the /docs folder from main
    outDir: 'docs',
    emptyOutDir: true,
  },
})
