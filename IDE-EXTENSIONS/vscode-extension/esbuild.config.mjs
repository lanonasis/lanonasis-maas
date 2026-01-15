import * as esbuild from 'esbuild';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * esbuild Problem Matcher Plugin
 * Formats errors for VS Code problem matcher integration
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',
  setup(build) {
    build.onStart(() => {
      console.log('[esbuild] Build started...');
    });
    build.onEnd((result) => {
      if (result.errors.length > 0) {
        result.errors.forEach(({ text, location }) => {
          console.error(`✘ [ERROR] ${text}`);
          if (location) {
            console.error(`    ${location.file}:${location.line}:${location.column}:`);
          }
        });
      } else {
        console.log('[esbuild] Build completed successfully');
      }
    });
  },
};

/**
 * Build the VS Code extension
 * Bundles all TypeScript into a single extension.js file
 */
async function buildExtension() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    target: 'node18',
    outfile: 'out/extension.js',
    external: [
      'vscode', // VS Code API is provided by the host
    ],
    // Resolve path aliases from tsconfig
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/services': path.resolve(__dirname, 'src/services'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
      '@/shared': path.resolve(__dirname, 'src/shared'),
    },
    logLevel: 'info',
    plugins: [esbuildProblemMatcherPlugin],
    // Handle Node.js built-ins
    define: {
      'process.env.NODE_ENV': production ? '"production"' : '"development"',
    },
  });

  if (watch) {
    console.log('[esbuild] Watching for changes...');
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

// Run the build
buildExtension().catch((e) => {
  console.error('[esbuild] Build failed:', e);
  process.exit(1);
});
