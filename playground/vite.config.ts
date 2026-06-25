import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { vmModulesPlugin } from './src/plugins/vite-plugin-vm-modules'
import { typeDefsPlugin } from './src/plugins/vite-plugin-type-defs'

export default defineConfig({
  base: '/mdast-jsx/', // GitHub Pages serves the project site under /<repo>/
  plugins: [react(), vmModulesPlugin(), typeDefsPlugin()],
  build: {
    // Top-level await requires ES2022+; target modern browsers only.
    target: 'es2022',
  },
})
