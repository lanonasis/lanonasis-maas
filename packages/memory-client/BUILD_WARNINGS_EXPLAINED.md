# Build Warnings Explained

**Date:** 2025-11-30  
**SDK Version:** 2.0.0  
**Build Tool:** Rollup + TypeScript

---

## 📋 Warning Summary

During the build process, you're seeing three types of warnings:

1. **TS2688:** Cannot find type definition file for 'eventsource'
2. **TS6304:** Composite projects may not disable declaration emit
3. **Info:** outputToFilesystem option is defaulting to true

---

## 🔍 Warning 1: TS2688 - Missing 'eventsource' Types

### What It Means

```
TS2688: Cannot find type definition file for 'eventsource'.
The file is in the program because:
  Entry point for implicit type library 'eventsource'
```

**Explanation:**
- TypeScript is looking for type definitions for the `eventsource` package
- This happens because your `tsconfig.json` has `"composite": true`, which enables project references
- TypeScript tries to include all referenced types, including those from dependencies
- The `eventsource` types are being referenced (possibly indirectly through a dependency), but `@types/eventsource` isn't installed

### Why It Happens

1. **Composite Mode:** Your `tsconfig.json` has `"composite": true`, which makes TypeScript more strict about type checking
2. **Type Resolution:** TypeScript is trying to resolve all types, including those from dependencies
3. **Missing Types:** The `@types/eventsource` package isn't installed, but TypeScript expects it

### Impact

- ⚠️ **Low Impact** - This is a type-checking warning, not a build error
- ✅ **Build Still Works** - Your code compiles successfully
- ⚠️ **Type Safety** - You might miss type errors related to EventSource if you use it

### Solutions

#### Option 1: Install Missing Types (Recommended if using EventSource)

```bash
cd apps/lanonasis-maas/packages/memory-client
npm install --save-dev @types/eventsource
```

#### Option 2: Skip Type Checking for This Package

Add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "skipLibCheck": true,  // ✅ You already have this!
    "types": []  // Explicitly specify which types to include
  }
}
```

#### Option 3: Suppress the Warning (If not using EventSource)

Add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "skipLibCheck": true,  // ✅ Already enabled
    "types": ["node"]  // Only include Node.js types explicitly
  }
}
```

#### Option 4: Use TypeScript's `skipLibCheck` More Aggressively

Your `tsconfig.json` already has `"skipLibCheck": true`, but the warning persists because:
- Rollup's TypeScript plugin might be using a different configuration
- The warning comes from the TypeScript compiler, not the build output

**Best Solution:** Install `@types/eventsource` if you're using EventSource anywhere, or ignore the warning if you're not.

---

## 🔍 Warning 2: TS6304 - Declaration Emit in Composite Projects

### What It Means

```
TS6304: Composite projects may not disable declaration emit.
```

**Explanation:**
- Your `tsconfig.json` has `"composite": true`
- In your `rollup.config.js`, you're setting `declaration: false` in the TypeScript plugin options
- TypeScript composite projects **require** declaration files to be generated
- This creates a conflict between your Rollup config and TypeScript's requirements

### Why It Happens

1. **Composite Mode:** `"composite": true` in `tsconfig.json` enables project references
2. **Rollup Override:** Your Rollup config sets `declaration: false` to prevent TypeScript from generating `.d.ts` files (since Rollup handles this separately)
3. **Conflict:** TypeScript sees the composite flag but also sees `declaration: false`, which is incompatible

### Impact

- ⚠️ **Low Impact** - This is a warning, not an error
- ✅ **Build Still Works** - Rollup generates declaration files separately using `rollup-plugin-dts`
- ⚠️ **TypeScript Project References** - If you're using TypeScript project references, this might cause issues

### Solutions

#### Option 1: Remove Composite Mode (Recommended for SDK)

Since you're using Rollup to build, you don't need TypeScript's composite mode:

```json
// tsconfig.json
{
  "compilerOptions": {
    // Remove or set to false:
    // "composite": true,  // ❌ Remove this
    "composite": false,   // ✅ Or explicitly set to false
    "declaration": true,  // Keep this for IDE support
    // ... rest of config
  }
}
```

**Why:** Rollup handles the build, so you don't need TypeScript's project reference features.

#### Option 2: Keep Composite but Don't Override Declaration

In `rollup.config.js`, don't set `declaration: false`:

```javascript
typescript({
  tsconfig: './tsconfig.json',
  // Remove these lines:
  // declaration: false,      // ❌ Remove
  // declarationMap: false,   // ❌ Remove
  outDir: 'dist/core',
  rootDir: 'src/core'
}),
```

**Why:** Let TypeScript generate declarations, then Rollup's `dts` plugin will handle the final output.

#### Option 3: Use Separate TypeScript Configs

Create `tsconfig.build.json` for Rollup:

```json
// tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "composite": false,  // Disable for build
    "declaration": false  // Rollup handles this
  }
}
```

Then in `rollup.config.js`:

```javascript
typescript({
  tsconfig: './tsconfig.build.json',  // Use build-specific config
  // ...
}),
```

**Recommended:** Option 1 (remove composite mode) since you're using Rollup.

---

## 🔍 Warning 3: outputToFilesystem Option Defaulting

### What It Means

```
@rollup/plugin-typescript: outputToFilesystem option is defaulting to true.
```

**Explanation:**
- This is an **informational message**, not a warning
- The Rollup TypeScript plugin is telling you that it's writing files to disk
- This is the default behavior and is expected

### Why It Happens

- The `@rollup/plugin-typescript` plugin writes TypeScript compilation output to the filesystem
- By default, `outputToFilesystem: true` means files are written to disk
- This is normal behavior for build processes

### Impact

- ✅ **No Impact** - This is just informational
- ✅ **Expected Behavior** - Files should be written to disk during build

### Solutions

**No action needed** - This is just informational. If you want to suppress the message:

```javascript
typescript({
  tsconfig: './tsconfig.json',
  outputToFilesystem: true,  // Explicitly set (already the default)
  // ... rest of config
}),
```

Or if you want to suppress informational messages, you can configure Rollup's log level, but this is unnecessary.

---

## 🎯 Recommended Fixes

### Quick Fix (Recommended)

1. **Fix TS2688:** Install missing types (if using EventSource) or ignore if not:
   ```bash
   npm install --save-dev @types/eventsource
   ```

2. **Fix TS6304:** Remove `composite: true` from `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "composite": false,  // Change from true to false
       // ... rest of config
     }
   }
   ```

3. **Info Message:** No action needed - it's just informational

### Complete Fix

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es2020",
    "lib": ["es2020", "dom", "dom.iterable"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolvePackageJsonExports": false,
    "resolvePackageJsonImports": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "inlineSources": true,
    "outDir": "./dist",
    "removeComments": false,
    "importHelpers": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "composite": false  // ✅ Change from true to false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

And optionally install missing types:

```bash
npm install --save-dev @types/eventsource
```

---

## 📊 Impact Summary

| Warning | Severity | Impact | Action Required |
|---------|----------|--------|-----------------|
| **TS2688** (eventsource) | Low | Type checking only | Optional - install types if using EventSource |
| **TS6304** (composite) | Low | TypeScript project references | Recommended - remove composite mode |
| **outputToFilesystem** | Info | None | None - informational only |

---

## ✅ After Applying Fixes

After making these changes, your build should show:

```
✅ No TypeScript warnings
✅ Clean build output
✅ Same functionality
```

The warnings don't affect functionality, but fixing them improves build cleanliness and type safety.

---

## 🔗 Related Files

- `tsconfig.json` - TypeScript configuration
- `rollup.config.js` - Rollup build configuration
- `package.json` - Dependencies and scripts

---

## 💡 Additional Notes

### Why Composite Mode?

TypeScript's `composite: true` is useful for:
- **Monorepos** with multiple TypeScript projects
- **Project references** between packages
- **Incremental builds** across projects

For a single SDK package built with Rollup, you typically don't need it.

### Why the Warnings Don't Break the Build

- TypeScript warnings are **non-fatal**
- Rollup continues building even with TypeScript warnings
- The final output is correct because Rollup handles the build process
- Type definitions are generated separately by `rollup-plugin-dts`

---

**Summary:** These are minor warnings that don't affect functionality. Fixing them improves build cleanliness and type safety, but your SDK is working correctly as-is! ✅

