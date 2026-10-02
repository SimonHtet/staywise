'use client'

// Last-resort boundary if the root layout itself fails. Must render <html>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0F2044', color: '#fff' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <p style={{ fontSize: 32, fontWeight: 900, margin: 0 }}>
              STAYWISE<span style={{ color: '#38bdf8' }}>.</span>
            </p>
            <p style={{ marginTop: 16, lineHeight: 1.6, color: 'rgba(255,255,255,.75)' }}>
              Staywise couldn’t start. Your data is safe. Try again, and if it keeps happening, note the time and tell your manager.
            </p>
            {error.digest && <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>Ref: {error.digest}</p>}
            <button
              onClick={reset}
              style={{ marginTop: 16, padding: '10px 18px', borderRadius: 12, border: 0, background: '#0284c7', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
