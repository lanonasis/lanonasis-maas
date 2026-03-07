import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/ui/**/*.tsx'],
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  treeshake: true,
  // Support JSX
  loader: {
    '.tsx': 'tsx',
  },
  esbuildOptions(options) {
    options.jsx = 'automatic';
    options.jsxImportSource = 'react';
  },
  // Don't bundle dependencies - they should be in node_modules
  noExternal: [],
  external: [
    '@lanonasis/memory-client',
    '@lanonasis/oauth-client',
    '@modelcontextprotocol/sdk',
    'chalk',
    'commander',
    'dotenv',
    'inquirer',
    'ora',
    'ink',
    'react',
    'react-dom'
  ]
});
