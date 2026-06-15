import { useEffect, useMemo, useState } from 'react'
import { useStore } from '@tanstack/react-store'
import JsonView from '@uiw/react-json-view'
import { vscodeTheme } from '@uiw/react-json-view/vscode'
import { clearEntries, networkStore } from './network-store'
import { installServerFnInterceptor } from './intercept'
import type { ServerFnEntry } from './network-store'

const colors = {
  bg: '#0f0f11',
  panel: '#161618',
  border: '#2a2a2e',
  text: '#e4e4e7',
  muted: '#8a8a93',
  accent: '#3b82f6',
  rowHover: '#1d1d21',
  rowActive: '#1e293b',
  get: '#34d399',
  post: '#fbbf24',
  error: '#f87171',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
}

function methodColor(method: string) {
  if (method === 'POST') return colors.post
  if (method === 'GET') return colors.get
  return colors.muted
}

function statusColor(entry: ServerFnEntry) {
  if (entry.status === 'pending') return colors.muted
  if (entry.status === 'error') return colors.error
  return colors.get
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ color: colors.muted, fontSize: 12, padding: 8 }}>{children}</div>
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }}
      style={{
        position: 'absolute',
        top: 6,
        right: 6,
        zIndex: 1,
        background: copied ? colors.get : colors.panel,
        color: copied ? '#0f0f11' : colors.muted,
        border: `1px solid ${colors.border}`,
        borderRadius: 5,
        padding: '3px 8px',
        fontSize: 11,
        cursor: 'pointer',
      }}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function Pre({ children }: { children: string }) {
  return (
    <pre
      style={{
        margin: 0,
        padding: 10,
        color: colors.text,
        fontFamily: colors.mono,
        fontSize: 12,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {children}
    </pre>
  )
}

/**
 * Renders a body string as a color-coded, collapsible JSON tree when it parses
 * as an object/array, otherwise as raw text. Always offers a copy button.
 */
function BodyView({ text }: { text: string | undefined }) {
  const parsed = useMemo(() => {
    if (text == null || text === '') return { kind: 'empty' as const }
    try {
      const value: unknown = JSON.parse(text)
      if (value !== null && typeof value === 'object') {
        return { kind: 'json' as const, value }
      }
    } catch {
      // fall through to raw
    }
    return { kind: 'raw' as const, value: text }
  }, [text])

  if (parsed.kind === 'empty') return <Empty>(empty)</Empty>

  const copyText =
    parsed.kind === 'json' ? JSON.stringify(parsed.value, null, 2) : parsed.value

  return (
    <div
      style={{
        position: 'relative',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        maxHeight: '100%',
        overflow: 'auto',
      }}
    >
      <CopyButton text={copyText} />
      {parsed.kind === 'json' ? (
        <div style={{ padding: 10 }}>
          <JsonView
            value={parsed.value}
            style={
              {
                ...vscodeTheme,
                '--w-rjv-background-color': 'transparent',
                fontFamily: colors.mono,
                fontSize: 12,
              } as React.CSSProperties
            }
            displayDataTypes={false}
            displayObjectSize
            enableClipboard
            collapsed={3}
            shortenTextAfterLength={80}
          />
        </div>
      ) : (
        <Pre>{parsed.value}</Pre>
      )}
    </div>
  )
}

function HeaderTable({ rows }: { rows: Array<[string, string]> }) {
  if (!rows.length) return <Empty>No headers</Empty>
  return (
    <div style={{ fontFamily: colors.mono, fontSize: 12 }}>
      {rows.map(([k, v], i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 8,
            padding: '3px 0',
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <span style={{ color: colors.accent, flexShrink: 0 }}>{k}:</span>
          <span style={{ color: colors.text, wordBreak: 'break-all' }}>{v}</span>
        </div>
      ))}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: colors.muted,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

type Tab = 'headers' | 'request' | 'response'

function Detail({ entry }: { entry: ServerFnEntry }) {
  const [tab, setTab] = useState<Tab>('headers')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
      <div style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
          {entry.functionName}
        </div>
        <div style={{ fontSize: 11, color: colors.muted, fontFamily: colors.mono }}>
          {entry.fileName || entry.functionId}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: '6px 8px', borderBottom: `1px solid ${colors.border}` }}>
        {(['headers', 'request', 'response'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: tab === t ? colors.accent : 'transparent',
              color: tab === t ? '#fff' : colors.muted,
              border: 'none',
              borderRadius: 5,
              padding: '4px 10px',
              fontSize: 12,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ padding: 12, overflow: 'auto', flex: 1 }}>
        {tab === 'headers' && (
          <>
            <Section label="General">
              <HeaderTable
                rows={[
                  ['Request URL', entry.url],
                  ['Method', entry.method],
                  ['Status', entry.statusCode ? `${entry.statusCode} ${entry.statusText ?? ''}` : entry.status],
                  ['Function', entry.functionName],
                  ['File', entry.fileName || '—'],
                  ['Duration', entry.durationMs != null ? `${entry.durationMs} ms` : '—'],
                ]}
              />
            </Section>
            <Section label="Request Headers">
              <HeaderTable rows={entry.requestHeaders} />
            </Section>
            <Section label="Response Headers">
              <HeaderTable rows={entry.responseHeaders ?? []} />
            </Section>
          </>
        )}

        {tab === 'request' && (
          <>
            {entry.query && (
              <Section label="Query Payload">
                <BodyView text={entry.query} />
              </Section>
            )}
            <Section label="Request Body">
              <BodyView text={entry.requestBody} />
            </Section>
          </>
        )}

        {tab === 'response' && (
          <Section label="Response Body">
            {entry.error ? <BodyView text={entry.error} /> : <BodyView text={entry.responseBody} />}
          </Section>
        )}
      </div>
    </div>
  )
}

export function NetworkPanel() {
  const entries = useStore(networkStore, (s) => s.entries)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    installServerFnInterceptor()
  }, [])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(
      (e) =>
        e.functionName.toLowerCase().includes(q) ||
        e.fileName.toLowerCase().includes(q) ||
        e.method.toLowerCase().includes(q),
    )
  }, [entries, filter])

  const selected = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId],
  )

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        minHeight: 300,
        background: colors.panel,
        color: colors.text,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* List */}
      <div
        style={{
          width: 360,
          flexShrink: 0,
          borderRight: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <span style={{ fontSize: 12, color: colors.muted }}>
            {filter.trim()
              ? `${filtered.length} of ${entries.length}`
              : `${entries.length} server function call${entries.length === 1 ? '' : 's'}`}
          </span>
          <button
            onClick={() => {
              clearEntries()
              setSelectedId(null)
            }}
            style={{
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              color: colors.muted,
              borderRadius: 5,
              padding: '3px 8px',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>

        <div style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.border}`, position: 'relative' }}>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by function, file, or method"
            style={{
              width: '100%',
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: 5,
              color: colors.text,
              fontSize: 12,
              padding: '5px 26px 5px 8px',
              outline: 'none',
            }}
          />
          {filter && (
            <button
              onClick={() => setFilter('')}
              title="Clear filter"
              style={{
                position: 'absolute',
                right: 18,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: colors.muted,
                cursor: 'pointer',
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>

        <div style={{ overflow: 'auto', flex: 1 }}>
          {entries.length === 0 && <Empty>Call a server function to see it here.</Empty>}
          {entries.length > 0 && filtered.length === 0 && <Empty>No calls match “{filter}”.</Empty>}
          {filtered.map((entry) => {
            const active = entry.id === selectedId
            return (
              <div
                key={entry.id}
                onClick={() => setSelectedId(entry.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 12px',
                  cursor: 'pointer',
                  background: active ? colors.rowActive : 'transparent',
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                <span
                  style={{
                    fontFamily: colors.mono,
                    fontSize: 11,
                    fontWeight: 700,
                    color: methodColor(entry.method),
                    width: 38,
                    flexShrink: 0,
                  }}
                >
                  {entry.method}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 12,
                      color: colors.text,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {entry.functionName}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 10,
                      color: colors.muted,
                      fontFamily: colors.mono,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {entry.fileName || entry.functionId}
                  </span>
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: colors.mono,
                    color: statusColor(entry),
                    flexShrink: 0,
                  }}
                >
                  {entry.status === 'pending' ? '…' : (entry.statusCode ?? 'ERR')}
                </span>
                {entry.durationMs != null && (
                  <span style={{ fontSize: 10, color: colors.muted, width: 48, textAlign: 'right', flexShrink: 0 }}>
                    {entry.durationMs}ms
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {selected ? (
          <Detail entry={selected} />
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.muted,
              fontSize: 13,
            }}
          >
            Select a request to inspect it
          </div>
        )}
      </div>
    </div>
  )
}
