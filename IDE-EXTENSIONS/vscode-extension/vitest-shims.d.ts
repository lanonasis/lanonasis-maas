// Editor-only shims to make TS server happy when opening vitest.config.ts
// Avoids false-positive TS2307 in VSCode while not affecting runtime.
declare module '@vitejs/plugin-react';
