import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/jsx-runtime.ts', 'src/jsx-dev-runtime.ts'],
  outDir: 'dist',
  format: ['esm', 'cjs'],
  fixedExtension: false,
  clean: true,
  dts: true,
})
