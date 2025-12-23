// Shim for TypeScript server in VS Code to stop reporting
// "Cannot find module '@vitejs/plugin-react'" from vitest.config.ts.
// Vitest tests run fine without type info; this unblocks editor diagnostics.
declare module '@vitejs/plugin-react' {
  import type { Plugin } from 'vite';
  const react: (options?: Record<string, unknown>) => Plugin;
  export default react;
}
