import { toCrossJSONAsync } from 'seroval'
import { describe, expect, it } from 'vitest'
import { decodeServerFnResponse, defaultSerovalPlugins } from './intercept'

// Serializes a server-fn response envelope the way TanStack Start's
// server-functions handler does before sending it.
const serialize = async (envelope: unknown) =>
  JSON.stringify(
    await toCrossJSONAsync(envelope, {
      refs: new Map(),
      plugins: defaultSerovalPlugins,
    }),
  )

describe('defaultSerovalPlugins', () => {
  it("resolves TanStack's plugins from the installed router-core", () => {
    // Start 1.0 moved them to `@tanstack/router-core/ssr/client`; an empty list
    // would mean neither location was found and errors would stop decoding.
    expect(defaultSerovalPlugins.length).toBeGreaterThan(0)
  })
})

describe('decodeServerFnResponse', () => {
  it('decodes a successful result', async () => {
    const text = await serialize({ result: { message: 'Hello, Ada!' } })
    expect(decodeServerFnResponse(text, true)).toEqual({
      pretty: JSON.stringify({ message: 'Hello, Ada!' }, null, 2),
    })
  })

  it('flags a 1.0 `{ error }` envelope as an error', async () => {
    const text = await serialize({ error: new Error('boom') })
    const decoded = decodeServerFnResponse(text, true)
    expect(decoded.isError).toBe(true)
    expect(JSON.parse(decoded.pretty!).error).toMatchObject({
      name: 'Error',
      message: 'boom',
    })
  })

  it('flags a thrown falsy value as an error (1.0)', async () => {
    const text = await serialize({ error: undefined })
    expect(decodeServerFnResponse(text, true)).toEqual({
      pretty: JSON.stringify({ error: null }, null, 2),
      isError: true,
    })
  })

  it('treats a pre-1.0 envelope with an undefined error as success', async () => {
    const text = await serialize({
      result: 42,
      error: undefined,
      context: undefined,
    })
    expect(decodeServerFnResponse(text, true)).toEqual({ pretty: '42' })
  })
})
