import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  treeshake: true,
  // Don't bundle dependencies - they should be in node_modules
  noExternal: [],
  external: [
    '@lanonasis/memory-client',
    '@modelcontextprotocol/sdk',
    'chalk',
    'commander',
    'dotenv',
    'inquirer',
    'ora'
  ]
});
