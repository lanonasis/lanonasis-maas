import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Set base path for proper asset resolution
  base: '/', // Since we're deploying to dashboard.lanonasis.com root
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Enforce single React across monorepo
      react: path.resolve(__dirname, '../../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../../node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, '../../../node_modules/react/jsx-runtime.js'),
      'react/jsx-dev-runtime': path.resolve(__dirname, '../../../node_modules/react/jsx-dev-runtime.js'),
      'react-router-dom': path.resolve(__dirname, '../../../node_modules/react-router-dom'),
      'react-router': path.resolve(__dirname, '../../../node_modules/react-router'),
    },
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
}));
