import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { vmModulesPlugin } from './src/plugins/vite-plugin-vm-modules'
import { typeDefsPlugin } from './src/plugins/vite-plugin-type-defs'

export default defineConfig({
  base: '/mdast-jsx/', // GitHub Pages serves the project site under /<repo>/
  plugins: [react(), tailwindcss(), vmModulesPlugin(), typeDefsPlugin()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // Top-level await requires ES2022+; target modern browsers only.
    target: 'es2022',
  },
})
