import { NetworkPanel } from './NetworkPanel'
import { installServerFnInterceptor } from './intercept'
import type { TanStackDevtoolsReactPlugin } from '@tanstack/react-devtools'

// Install eagerly on the client so calls made before the panel is opened are
// still captured.
installServerFnInterceptor()

export const serverFnNetworkPlugin: TanStackDevtoolsReactPlugin = {
  id: 'server-fn-network',
  name: 'Server Fns',
  render: <NetworkPanel />,
}

export { NetworkPanel } from './NetworkPanel'
export { networkStore } from './network-store'
