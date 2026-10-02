'use client'

export default function ReceiptControls({ resNumber }: { resNumber: string }) {
  return (
    <div className="no-print flex flex-wrap items-center gap-3 px-4 sm:px-8 py-3 bg-white border-b border-slate-200 text-sm">
      <button onClick={() => window.close()} className="text-sky-700 font-semibold hover:underline">
        Close tab
      </button>
      <span className="text-slate-600">Receipt {resNumber} · 80 mm</span>
      <button
        onClick={() => window.print()}
        className="ml-auto px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700"
      >
        Print receipt
      </button>
    </div>
  )
}
