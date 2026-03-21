import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  treeshake: true,
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
