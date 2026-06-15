import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

export const Route = createFileRoute('/')({ component: Home })

// A POST server function that takes input and returns formatted JSON.
const greet = createServerFn({ method: 'POST' })
  .validator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    return {
      message: `Hello, ${data.name}!`,
      receivedAt: new Date().toISOString(),
      lengths: { name: data.name.length },
    }
  })

// A GET server function with no input — payload travels in the query string.
const getTime = createServerFn({ method: 'GET' }).handler(async () => {
  return { now: new Date().toISOString(), tz: 'server' }
})

// A POST server function that throws, to show error capture.
const boom = createServerFn({ method: 'POST' }).handler(async () => {
  throw new Error('Intentional server error for the devtools demo')
})

function Home() {
  const [log, setLog] = useState<string>('')

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      const res = await fn()
      setLog(`${label} → ${JSON.stringify(res)}`)
    } catch (err) {
      setLog(`${label} → error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold">Server Fn Network DevTools</h1>
      <p className="mt-4 text-lg">
        Open the TanStack DevTools (bottom-right) → <strong>Server Fns</strong> tab, then trigger a
        call.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          onClick={() => run('greet', () => greet({ data: { name: 'Ada' } }))}
        >
          POST greet
        </button>
        <button
          className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
          onClick={() => run('getTime', () => getTime())}
        >
          GET getTime
        </button>
        <button
          className="rounded bg-rose-600 px-4 py-2 text-white hover:bg-rose-700"
          onClick={() => run('boom', () => boom())}
        >
          POST boom (error)
        </button>
      </div>

      {log && (
        <pre className="mt-6 rounded bg-gray-100 p-4 text-sm">{log}</pre>
      )}
    </div>
  )
}
