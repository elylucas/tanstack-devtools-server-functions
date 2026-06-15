import { NetworkPanel } from './NetworkPanel'
import { installServerFnInterceptor } from './intercept'
import type { TanStackDevtoolsReactPlugin } from '@tanstack/react-devtools'

/** The stable plugin id this plugin registers with in the devtools shell. */
export const PLUGIN_ID = 'server-fn-network'

// Install eagerly on the client so calls made before the panel is opened are
// still captured.
installServerFnInterceptor()

/**
 * Factory form of the plugin, matching the `type: 'function'` shape used by the
 * TanStack DevTools marketplace auto-installer (it injects
 * `createServerFnNetworkPlugin()` into the `plugins` array).
 */
export function createServerFnNetworkPlugin(): TanStackDevtoolsReactPlugin {
  installServerFnInterceptor()
  return {
    id: PLUGIN_ID,
    name: 'Server Functions',
    render: <NetworkPanel />,
  }
}

/** Ready-to-use plugin object for `<TanStackDevtools plugins={[...]} />`. */
export const serverFnNetworkPlugin: TanStackDevtoolsReactPlugin =
  createServerFnNetworkPlugin()

export { NetworkPanel } from './NetworkPanel'
export { networkStore } from './network-store'
