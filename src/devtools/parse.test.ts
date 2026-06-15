import { describe, expect, it } from 'vitest'
import { parseFunctionId } from './parse'

const base64 = (obj: unknown) =>
  Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=+$/, '')

describe('parseFunctionId', () => {
  it('decodes the base64 JSON metadata format', () => {
    const id = base64({
      file: '/src/routes/index.tsx?tss-serverfn-split',
      export: 'greet_createServerFn_handler',
    })
    expect(parseFunctionId(id)).toEqual({
      fileName: '/src/routes/index.tsx',
      functionName: 'greet',
    })
  })

  it('supports the legacy `file--fn` format', () => {
    expect(parseFunctionId('src_routes_index_tsx--greet_createServerFn_handler')).toEqual({
      fileName: 'src/routes/index.tsx',
      functionName: 'greet',
    })
  })

  it('falls back to the raw id for opaque/unknown ids', () => {
    expect(parseFunctionId('a1b2c3hash')).toEqual({
      fileName: '',
      functionName: 'a1b2c3hash',
    })
  })
})
