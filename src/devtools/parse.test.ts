import { describe, expect, it } from 'vitest'
import { parseFunctionId } from './parse'

// Matches TanStack Start's dev-mode id generator:
// `Buffer.from(JSON.stringify(serverFn), 'utf8').toString('base64url')`
const base64url = (obj: unknown) =>
  Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url')

describe('parseFunctionId', () => {
  it('decodes the base64url JSON metadata format', () => {
    const id = base64url({
      file: '/src/routes/index.tsx?tss-serverfn-split',
      export: 'greet_createServerFn_handler',
    })
    expect(parseFunctionId(id)).toEqual({
      fileName: '/src/routes/index.tsx',
      functionName: 'greet',
    })
  })

  it('decodes ids containing base64url-only characters (- and _)', () => {
    // Chosen so the base64url encoding contains at least one `-` or `_`,
    // which are not part of the standard base64 alphabet `atob` expects.
    const id = base64url({
      file: '/src/routes/manuscript.tsx?tss-serverfn-split',
      export: 'listProjects_createServerFn_handler',
    })
    expect(id).toMatch(/[-_]/)
    expect(parseFunctionId(id)).toEqual({
      fileName: '/src/routes/manuscript.tsx',
      functionName: 'listProjects',
    })
  })

  it('decodes non-ASCII characters in file/export without mojibake', () => {
    const id = base64url({
      file: '/src/routes/café.tsx?tss-serverfn-split',
      export: 'créer_createServerFn_handler',
    })
    expect(parseFunctionId(id)).toEqual({
      fileName: '/src/routes/café.tsx',
      functionName: 'créer',
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
