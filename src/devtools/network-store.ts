import { Store } from '@tanstack/store'

export type EntryStatus = 'pending' | 'success' | 'error'

export interface ServerFnEntry {
  /** Unique id for this call */
  id: string
  /** The raw functionId pulled from the request URL */
  functionId: string
  /** Best-effort friendly function name parsed from the functionId */
  functionName: string
  /** Best-effort source file parsed from the functionId */
  fileName: string
  /** HTTP method (GET / POST) */
  method: string
  /** Full request URL (without the query payload for GET) */
  url: string
  /** Query string payload for GET calls, if any */
  query?: string
  status: EntryStatus
  /** HTTP status code once the response arrives */
  statusCode?: number
  statusText?: string
  startedAt: number
  durationMs?: number
  requestHeaders: Array<[string, string]>
  requestBody?: string
  responseHeaders?: Array<[string, string]>
  responseBody?: string
  error?: string
}

interface NetworkState {
  entries: Array<ServerFnEntry>
}

const MAX_ENTRIES = 200

export const networkStore = new Store<NetworkState>({ entries: [] })

export function addEntry(entry: ServerFnEntry) {
  networkStore.setState((state) => {
    const entries = [entry, ...state.entries]
    if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES
    return { entries }
  })
}

export function updateEntry(id: string, patch: Partial<ServerFnEntry>) {
  networkStore.setState((state) => ({
    entries: state.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
  }))
}

export function clearEntries() {
  networkStore.setState(() => ({ entries: [] }))
}
