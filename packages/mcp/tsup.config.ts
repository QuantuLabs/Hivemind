import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  dts: true,
  clean: true,
  // Bundle @quantulabs/hivemind-core into the output
  // so npm users don't need to install it separately
  noExternal: ['@quantulabs/hivemind-core'],
})
