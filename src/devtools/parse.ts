/**
 * Decode a base64url string (unpadded, `-`/`_` instead of `+`/`/`) the way
 * `Buffer.from(...).toString('base64url')` produces it. Plain `atob` only
 * understands the standard base64 alphabet and throws `InvalidCharacterError`
 * on `-`/`_`, so we translate the alphabet and restore padding first.
 *
 * `atob` also only yields a Latin1 "binary string" (one JS char per byte),
 * but the upstream id is encoded from UTF-8 bytes (`Buffer.from(..., 'utf8')`),
 * so any non-ASCII characters in `file`/`export` would come out mojibake'd.
 * Re-decoding the byte string as UTF-8 via `TextDecoder` fixes that.
 */
function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/**
 * Resolve a TanStack Start server-function `functionId` (the last segment of the
 * request URL) into a friendly file + function name.
 *
 * In current TanStack Start the id is (unpadded) base64url-encoded JSON, e.g.
 * `{"file":"/src/routes/index.tsx?tss-serverfn-split","export":"greet_createServerFn_handler"}`.
 * We also fall back to the older `src_routes_index_tsx--greet` style and, failing
 * both, just surface the raw id (the bundler may emit opaque ids in production).
 */
export function parseFunctionId(functionId: string): {
  fileName: string
  functionName: string
} {
  // Newer format: base64url-encoded JSON metadata.
  try {
    const decoded = base64UrlDecode(functionId)
    if (decoded.startsWith('{')) {
      const meta = JSON.parse(decoded) as {
        file?: string
        export?: string
        name?: string
      }
      const rawName = meta.export ?? meta.name
      if (rawName || meta.file) {
        return {
          // Strip the `?tss-serverfn-split` (and any other query) marker.
          fileName: meta.file ? meta.file.split('?')[0] : '',
          functionName:
            rawName
              ?.replace(/_createServerFn_handler$/, '')
              .replace(/_handler$/, '') || functionId,
        }
      }
    }
  } catch {
    // not base64/JSON — fall through
  }

  // Older format: `<file>--<fn>` with underscores standing in for separators.
  const [filePart, fnPart] = functionId.split('--')
  if (fnPart) {
    return {
      fileName: filePart.replace(/_(tsx|ts|jsx|js)$/, '.$1').replace(/_/g, '/'),
      functionName: fnPart.replace(/_createServerFn_handler$/, '').replace(/_handler$/, '') || functionId,
    }
  }

  return { fileName: '', functionName: functionId }
}
