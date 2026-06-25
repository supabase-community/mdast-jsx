import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { vmModulesPlugin } from './src/plugins/vite-plugin-vm-modules'
import { typeDefsPlugin } from './src/plugins/vite-plugin-type-defs'

export default defineConfig({
  base: '/mdast-jsx/', // GitHub Pages serves the project site under /<repo>/
  plugins: [react(), vmModulesPlugin(), typeDefsPlugin()],
})
