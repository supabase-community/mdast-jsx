import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/mdast-jsx/', // GitHub Pages serves the project site under /<repo>/
  plugins: [react()],
})
