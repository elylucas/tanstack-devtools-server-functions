# Submitting to the TanStack DevTools Marketplace

The marketplace is a curated registry inside the devtools shell. Submission is a
PR to [`TanStack/devtools`](https://github.com/TanStack/devtools) that adds an
entry to `packages/devtools/src/tabs/plugin-registry.ts`.

> Reference: https://tanstack.com/devtools/latest/docs/third-party-plugins

## Prerequisites (do these first, in order)

1. **Publish `tanstack-devtools-server-functions` to npm** — the marketplace
   installs from npm, so the package must be public first. (See the “Releasing”
   section in the [README](./README.md).)
2. The package already exports the factory the auto-installer needs:
   `createServerFnNetworkPlugin()` (`type: 'function'`), registering with the
   stable id `server-fn-network`.

## Registry entry

Add this under the `THIRD-PARTY PLUGINS` section of `PLUGIN_REGISTRY` in
`packages/devtools/src/tabs/plugin-registry.ts`:

```ts
'tanstack-devtools-server-functions': {
  packageName: 'tanstack-devtools-server-functions',
  title: 'Server Functions Devtools',
  description:
    'Inspect TanStack Start server function calls — method, name, file, headers, and decoded request/response JSON, like the browser network panel.',
  requires: {
    packageName: '@tanstack/react-start',
    minVersion: '1.131.0',
  },
  pluginImport: {
    importName: 'createServerFnNetworkPlugin',
    type: 'function',
  },
  pluginId: 'server-fn-network',
  docsUrl: 'https://github.com/elylucas/tanstack-devtools-server-functions#readme',
  repoUrl: 'https://github.com/elylucas/tanstack-devtools-server-functions',
  author: 'Ely Lucas',
  framework: 'react',
  isNew: true,
  tags: ['TanStack', 'TanStack Start', 'server-functions', 'network'],
},
```

Notes:

- `pluginImport` → the auto-installer injects
  `import { createServerFnNetworkPlugin } from 'tanstack-devtools-server-functions'`
  and `createServerFnNetworkPlugin()` into the `plugins` array.
- `pluginId: 'server-fn-network'` matches the id the plugin registers with, so
  the marketplace can tell when it's already installed.
- Do **not** set `featured: true` — that flag is reserved for the TanStack team.

## PR steps

```bash
gh repo fork TanStack/devtools --clone --remote
cd devtools
git checkout -b feat/marketplace-server-functions
# edit packages/devtools/src/tabs/plugin-registry.ts (add the entry above)
git commit -am "feat(marketplace): add tanstack-devtools-server-functions"
git push -u origin feat/marketplace-server-functions
gh pr create --repo TanStack/devtools \
  --title "feat(marketplace): add tanstack-devtools-server-functions" \
  --body "Adds the Server Functions Devtools plugin (inspects TanStack Start server function calls). npm: https://www.npmjs.com/package/tanstack-devtools-server-functions"
```
