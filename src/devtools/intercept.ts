import { fromCrossJSON, fromJSON } from 'seroval'
import { defaultSerovalPlugins } from '@tanstack/router-core'
import { addEntry, updateEntry } from './network-store'
import { parseFunctionId } from './parse'
import type { ServerFnEntry } from './network-store'

/**
 * Every TanStack Start server-function request is stamped with this header by
 * `serverFnFetcher`. We use it to distinguish server-fn calls from ordinary
 * fetches so the panel only shows the traffic the user cares about.
 */
const SERVER_FN_HEADER = 'x-tsr-serverfn'

let installed = false
let counter = 0

function nextId() {
  counter += 1
  return `sfn-${Date.now().toString(36)}-${counter}`
}

function headersToEntries(headers: Headers): Array<[string, string]> {
  const out: Array<[string, string]> = []
  headers.forEach((value, key) => out.push([key, value]))
  return out
}

function isServerFn(headers: Headers): boolean {
  return headers.get(SERVER_FN_HEADER) === 'true'
}

/**
 * Server-function responses are seroval-serialized on the wire (e.g.
 * `{"t":10,"i":0,...}`), which is unreadable. When the response is flagged as
 * serialized we decode it back into the real return value and pretty-print it.
 * The decoded payload is an envelope: `{ result, error, context }`.
 */
function decodeServerFnResponse(
  text: string,
  isSerialized: boolean,
): { pretty?: string; isError?: boolean } {
  if (!text) return {}
  try {
    const node = JSON.parse(text)
    if (!isSerialized) {
      // Plain JSON (redirect / notFound / non-serialized) — just pretty-print.
      return { pretty: JSON.stringify(node, null, 2) }
    }
    const value: unknown = fromCrossJSON(node, {
      refs: new Map(),
      plugins: defaultSerovalPlugins,
    })
    if (value && typeof value === 'object' && ('result' in value || 'error' in value)) {
      const env = value as { result?: unknown; error?: unknown }
      if (env.error != null) {
        const e = env.error
        const error =
          e instanceof Error
            ? { name: e.name, message: e.message, stack: e.stack }
            : e
        return { pretty: JSON.stringify({ error }, null, 2), isError: true }
      }
      return { pretty: JSON.stringify(env.result ?? null, null, 2) }
    }
    return { pretty: JSON.stringify(value, null, 2) }
  } catch {
    // Not decodable (e.g. framed streaming response) — fall back to raw text.
    return {}
  }
}

/**
 * Decode a seroval payload back into its value. Request payloads use the
 * `toJSON` wrapper form (`{ t: <node>, f: ... }`, decoded with `fromJSON`),
 * while bare cross-JSON nodes (`{ t: <number>, ... }`) use `fromCrossJSON`.
 * Returns undefined when `text` isn't seroval so callers fall back to raw text.
 */
function decodeSerovalNode(text: string): unknown {
  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === 'object') {
      if (parsed.t && typeof parsed.t === 'object') {
        return fromJSON(parsed, { plugins: defaultSerovalPlugins })
      }
      if (typeof parsed.t === 'number') {
        return fromCrossJSON(parsed, { refs: new Map(), plugins: defaultSerovalPlugins })
      }
    }
  } catch {
    // not a seroval payload
  }
  return undefined
}

async function readBody(body: BodyInit | null | undefined): Promise<string | undefined> {
  if (body == null) return undefined
  if (typeof body === 'string') {
    // Request payloads are seroval-serialized (`{ data, context }`) — decode
    // them so the panel shows the real arguments rather than the wire format.
    const decoded = decodeSerovalNode(body)
    return decoded !== undefined ? JSON.stringify(decoded, null, 2) : body
  }
  if (body instanceof FormData) {
    const parts: Array<string> = []
    body.forEach((value, key) => {
      parts.push(`${key}: ${value instanceof File ? `[File ${value.name}]` : value}`)
    })
    return parts.join('\n')
  }
  if (body instanceof URLSearchParams) return body.toString()
  return undefined
}

/**
 * Wrap the global `fetch` so every server-function call is recorded into the
 * network store. The original fetch is always invoked and the real Response is
 * returned untouched — we only read a clone — so app behavior is unaffected.
 */
export function installServerFnInterceptor() {
  if (installed || typeof window === 'undefined') return
  installed = true

  const original = window.fetch.bind(window)

  window.fetch = async function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const headers = new Headers(init?.headers)

    if (!isServerFn(headers)) {
      return original(input, init)
    }

    const rawUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url

    const [path, query] = rawUrl.split('?')
    const functionId = path.split('/').filter(Boolean).pop() ?? path
    const { fileName, functionName } = parseFunctionId(
      decodeURIComponent(functionId),
    )

    const id = nextId()
    const startedAt = Date.now()

    const entry: ServerFnEntry = {
      id,
      functionId,
      functionName,
      fileName,
      method: (init?.method ?? 'GET').toUpperCase(),
      url: path,
      query: query ? decodeURIComponent(query) : undefined,
      status: 'pending',
      startedAt,
      requestHeaders: headersToEntries(headers),
      requestBody: await readBody(init?.body),
    }
    addEntry(entry)

    try {
      const response = await original(input, init)
      const clone = response.clone()
      let rawBody: string | undefined
      try {
        rawBody = await clone.text()
      } catch {
        rawBody = undefined
      }

      const isSerialized = !!response.headers.get('x-tss-serialized')
      const decoded = rawBody
        ? decodeServerFnResponse(rawBody, isSerialized)
        : {}

      updateEntry(id, {
        // A server fn can return HTTP 200 while throwing — detect that via the
        // decoded envelope so the list reflects the real outcome.
        status: !response.ok || decoded.isError ? 'error' : 'success',
        statusCode: response.status,
        statusText: response.statusText,
        durationMs: Date.now() - startedAt,
        responseHeaders: headersToEntries(response.headers),
        responseBody: decoded.pretty ?? rawBody,
      })
      return response
    } catch (err) {
      updateEntry(id, {
        status: 'error',
        durationMs: Date.now() - startedAt,
        error: err instanceof Error ? err.message : String(err),
      })
      throw err
    }
  }
}
