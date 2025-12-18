# Running the REPL CLI

## 🚀 Quick Start Commands

### Option 1: Direct Command (Recommended for Development)

From the repl-cli package directory:

```bash
cd apps/lanonasis-maas/packages/repl-cli
bun run build
node dist/index.js start
```

Or using the npm script:

```bash
cd apps/lanonasis-maas/packages/repl-cli
bun run build
bun run start
```

### Option 2: Using Main CLI (from Monorepo Root)

From the monorepo root directory:

```bash
cd /path/to/lan-onasis-monorepo
onasis repl
```

Or with options:

```bash
onasis repl --api https://api.lanonasis.com --token your_token
onasis repl --mcp
onasis repl --model gpt-4
```

### Option 3: Global Installation

If installed globally via npm:

```bash
npm install -g @lanonasis/repl-cli
onasis-repl start
# or
lrepl start
```

## 🔧 Why Tests Pass But Runtime Fails

**The Issue**: The main CLI (`onasis repl`) tries to locate the repl-cli package relative to `process.cwd()`. If you're running from within the repl-cli directory, it creates a wrong path.

**The Solution**: 
1. **Run from monorepo root** when using `onasis repl`
2. **Use direct command** when in the repl-cli directory: `node dist/index.js start`
3. The path resolution has been improved to try multiple locations

## 📋 Pre-Run Checklist

1. ✅ **Build the package**:
   ```bash
   cd apps/lanonasis-maas/packages/repl-cli
   bun run build
   ```

2. ✅ **Verify dist folder exists**:
   ```bash
   ls -la dist/
   # Should show: index.js, index.d.ts, index.js.map
   ```

3. ✅ **Set environment variables** (optional):
   ```bash
   export OPENAI_API_KEY=sk-...
   export LANONASIS_API_KEY=your_key
   export OPENAI_MODEL=gpt-4-turbo-preview
   ```

## 🎯 Common Commands

### Start REPL
```bash
# Direct
node dist/index.js start

# With options
node dist/index.js start --api https://api.lanonasis.com --token your_token --model gpt-4

# Via main CLI (from monorepo root)
onasis repl
```

### Check Version
```bash
node dist/index.js --version
# Should output: 0.4.0
```

### Show Help
```bash
node dist/index.js --help
```

## 🐛 Troubleshooting

### Error: Cannot find module '.../packages/repl-cli/packages/repl-cli/dist/index.js'

**Cause**: Running `onasis repl` from within the repl-cli directory.

**Fix**: 
- Run from monorepo root: `cd /path/to/lan-onasis-monorepo && onasis repl`
- Or use direct command: `node dist/index.js start`

### Error: Cannot find module 'dist/index.js'

**Cause**: Package not built.

**Fix**:
```bash
cd apps/lanonasis-maas/packages/repl-cli
bun run build
```

### Error: Module not found '@lanonasis/memory-client'

**Cause**: Dependencies not installed.

**Fix**:
```bash
cd apps/lanonasis-maas/packages/repl-cli
bun install
bun run build
```

## 📝 Development Workflow

1. **Make changes** to source files in `src/`
2. **Build**: `bun run build`
3. **Test**: `bun run test`
4. **Run**: `node dist/index.js start` or `bun run start`
5. **Watch mode** (auto-rebuild): `bun run dev` (in another terminal)

## 🔍 Verification

After building, verify everything works:

```bash
# Check build output
ls -la dist/
# Should show: index.js (executable), index.d.ts, index.js.map

# Test version
node dist/index.js --version
# Should output: 0.4.0

# Test help
node dist/index.js --help
# Should show command help

# Test start (will prompt for input)
node dist/index.js start
```

---

**Last Updated**: 2025-01-27
**Version**: 0.4.0

