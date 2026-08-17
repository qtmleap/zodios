import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts', 'src/utils.types.ts', 'src/zodios.types.ts'],
  outDir: 'lib',
  format: ['esm'],
  fixedExtension: false,
  minify: true,
  treeshake: true,
  tsconfig: 'tsconfig.build.json',
  sourcemap: false,
})
