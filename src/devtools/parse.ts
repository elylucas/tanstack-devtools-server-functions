/**
 * Resolve a TanStack Start server-function `functionId` (the last segment of the
 * request URL) into a friendly file + function name.
 *
 * In current TanStack Start the id is (unpadded) base64-encoded JSON, e.g.
 * `{"file":"/src/routes/index.tsx?tss-serverfn-split","export":"greet_createServerFn_handler"}`.
 * We also fall back to the older `src_routes_index_tsx--greet` style and, failing
 * both, just surface the raw id (the bundler may emit opaque ids in production).
 */
export function parseFunctionId(functionId: string): {
  fileName: string
  functionName: string
} {
  // Newer format: base64-encoded JSON metadata.
  try {
    const decoded = atob(functionId)
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
