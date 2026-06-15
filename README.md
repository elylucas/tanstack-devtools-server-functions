# tanstack-devtools-server-functions

[![npm version](https://img.shields.io/npm/v/tanstack-devtools-server-functions.svg)](https://www.npmjs.com/package/tanstack-devtools-server-functions)
[![CI/CD](https://github.com/elylucas/tanstack-devtools-server-functions/actions/workflows/ci.yml/badge.svg)](https://github.com/elylucas/tanstack-devtools-server-functions/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/tanstack-devtools-server-functions.svg)](./LICENSE)

A [TanStack DevTools](https://tanstack.com/devtools) plugin that shows every
[TanStack Start](https://tanstack.com/start) **server function** call in a
Chrome-DevTools-style network panel — method, function name, source file,
headers, request body, and response body, with the seroval-serialized payloads
decoded back into readable, color-coded JSON.

> Think of it as the browser Network tab, but scoped to your server functions
> and showing the actual decoded arguments and return values.

## Features

- 📡 **Captures every server function call** automatically — no per-call wiring.
- 🔎 **Request list** with HTTP method, function name, source file, status
  (red on error), and duration.
- 🧾 **Headers / Request / Response tabs**, mirroring the browser network panel.
- 🌳 **Color-coded, collapsible JSON tree** for request and response bodies
  (powered by [`@uiw/react-json-view`](https://github.com/uiwjs/react-json-view)).
- 🧬 **Decodes seroval payloads** so you see real arguments and return values,
  not the wire format — including thrown server errors (name / message / stack).
- 🔬 **Filter** the list by function name, source file, or HTTP method.
- 📋 **Copy** button on each body.

## Installation

```bash
npm install -D tanstack-devtools-server-functions
```

This is a dev-only plugin. Peer dependencies — which a TanStack Start app
already has — are `@tanstack/react-devtools`, `react`, and `react-dom`.

## Usage

Add the plugin to the `plugins` array of `<TanStackDevtools>` (typically in your
root route):

```tsx
import { TanStackDevtools } from '@tanstack/react-devtools'
import { serverFnNetworkPlugin } from 'tanstack-devtools-server-functions'

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <TanStackDevtools plugins={[serverFnNetworkPlugin]} />
    </>
  )
}
```

That's it. Open the DevTools, switch to the **Server Fns** tab, and trigger a
server function.

### Exports

| Export                          | Description                                                          |
| ------------------------------- | ------------------------------------------------------------------- |
| `serverFnNetworkPlugin`         | The plugin object to pass to `<TanStackDevtools plugins={[...]} />`. |
| `createServerFnNetworkPlugin()` | Factory returning the plugin object (used by marketplace auto-install). |
| `NetworkPanel`                  | The panel React component, if you want to render it yourself.        |
| `networkStore`                  | The underlying `@tanstack/store` of captured calls.                 |

## How it works

- **Capture** wraps the global `window.fetch`. TanStack Start stamps every
  server-function request with the header `x-tsr-serverFn: true`, so the plugin
  records exactly those calls and ignores all other traffic. The original fetch
  always runs and the real `Response` is returned untouched (only a `clone()` is
  read), so app behavior is unaffected.
- **Function / file name** are parsed from the request URL — the `functionId`
  segment is base64-encoded JSON describing the source file and export.
- **Decoding** — request payloads use seroval's `toJSON` form (`fromJSON`) and
  responses use cross-JSON (`fromCrossJSON`), using `defaultSerovalPlugins` from
  `@tanstack/router-core`. Responses are the `{ result, error, context }`
  envelope; the panel surfaces `result`, or the decoded `error` when the server
  function threw (flagging the row as an error even on an HTTP 200).

### Known limitations

- Streaming / framed (`application/x-tss-framed`) responses are not decoded and
  show their raw frames.
- Capture relies on the default global `fetch`. If you configure a custom
  server-fn fetch via `createStart({ serverFns: { fetch } })`, install the
  interceptor around that implementation instead.

## Marketplace

This plugin is set up for the [TanStack DevTools marketplace](https://tanstack.com/devtools/latest/docs/third-party-plugins).
It exports `createServerFnNetworkPlugin()` (the `type: 'function'` shape the
marketplace auto-installer expects). See [MARKETPLACE.md](./MARKETPLACE.md) for
the registry entry and PR steps.

## Development

This repository is both the published package **and** a TanStack Start demo app
used to develop and exercise the plugin. The plugin source lives in
[`src/devtools/`](./src/devtools); the rest of `src/` is the demo app and is
**not** part of the published package.

```bash
npm install
npm run dev        # run the demo app at http://localhost:3000
npm run build      # build the publishable library to dist/ (tsup)
npm test           # run unit tests (vitest)
npm run typecheck  # type-check the whole repo
npm run lint       # lint
```

The demo app's index route exposes a few sample server functions (`greet`,
`getTime`, and an intentionally-throwing `boom`) so you can see the panel work.

## Releasing

Releases are automated with [semantic-release](https://semantic-release.gitbook.io/).
Merging [Conventional Commits](https://www.conventionalcommits.org/) to `main`
(`fix:` → patch, `feat:` → minor, `feat!:` / `BREAKING CHANGE` → major)
publishes a new version to npm and creates a GitHub release. The CI workflow
requires an `NPM_TOKEN` repository secret.

## License

[MIT](./LICENSE) © Ely Lucas
