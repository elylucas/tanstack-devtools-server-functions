import { defineConfig } from 'tsup'

// Builds the publishable plugin library from src/devtools. The demo app
// (src/routes, router, vite/nitro config) is NOT part of the package — it stays
// in the repo for local development and is excluded via the package.json
// `files` whitelist.
export default defineConfig({
  entry: { index: 'src/devtools/index.tsx' },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'es2022',
  tsconfig: 'tsconfig.build.json',
  // Everything in dependencies/peerDependencies is externalized automatically;
  // these are listed for clarity/safety.
  external: ['react', 'react-dom', '@tanstack/react-devtools'],
})
