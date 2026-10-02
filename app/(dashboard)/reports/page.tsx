'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { hasPermission } from '@/lib/rbac'
import { FileBarChart, Globe, ExternalLink, Download } from 'lucide-react'
import { addDays, todayIn } from '@/lib/dates'

const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent'

function today() {
  return todayIn()
}

export default function ReportsPage() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role ?? ''
  const canViewFinancials = hasPermission(role, 'VIEW_FINANCIALS')

  const [flashDate, setFlashDate] = useState(today())
  const [regDate, setRegDate] = useState(today())
  const [exportFrom, setExportFrom] = useState(addDays(today(), -30))
  const [exportTo, setExportTo] = useState(today())

  // Plain link download — the browser shows its own progress and keeps the file name
  function exportHref(kind: string) {
    return `/api/export/${kind}?from=${exportFrom}&to=${exportTo}`
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Reports</h2>
        <p className="text-sm text-gray-600">Printable operational reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {canViewFinancials && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                <FileBarChart className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Manager Flash Report</h2>
                <p className="text-xs text-gray-500">Occupancy, revenue, ADR, collections, arrivals & departures</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <input
                type="date"
                aria-label="Report date"
                value={flashDate}
                onChange={(e) => setFlashDate(e.target.value)}
                className={inputCls}
              />
              <button
                onClick={() => window.open(`/print/report?date=${flashDate}`, '_blank')}
                className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Open Report
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Globe className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Foreign Guest Registration</h2>
              <p className="text-xs text-gray-500">Immigration report of foreign guest arrivals (full passport numbers)</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <input
              type="date"
              aria-label="Arrival date"
              value={regDate}
              onChange={(e) => setRegDate(e.target.value)}
              className={inputCls}
            />
            <button
              onClick={() => window.open(`/print/foreigner-reg?date=${regDate}`, '_blank')}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Open Report
            </button>
          </div>
        </div>
      </div>

      {canViewFinancials && (
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6" aria-labelledby="export-heading">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Download className="w-5 h-5 text-emerald-700" aria-hidden />
            </div>
            <div>
              <h2 id="export-heading" className="font-semibold text-gray-900">Export to Excel</h2>
              <p className="text-sm text-gray-600">CSV files that open in Excel or Google Sheets. Every export is recorded in the activity log.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3 mt-4">
            <div>
              <label htmlFor="exp-from" className="block text-sm font-medium text-slate-700 mb-1">From</label>
              <input id="exp-from" type="date" value={exportFrom} max={exportTo} onChange={(e) => setExportFrom(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="exp-to" className="block text-sm font-medium text-slate-700 mb-1">To</label>
              <input id="exp-to" type="date" value={exportTo} min={exportFrom} onChange={(e) => setExportTo(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {[
              { kind: 'reservations', title: 'Bookings', note: 'Stays in the date range' },
              { kind: 'revenue', title: 'Payments collected', note: 'Folios settled in the date range' },
              { kind: 'receivables', title: 'Company balances owed', note: 'All unpaid, ignores dates' },
              { kind: 'guests', title: 'Guest list', note: 'All guests, no passport numbers' },
            ].map((x) => (
              <a
                key={x.kind}
                href={exportHref(x.kind)}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors"
              >
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{x.title}</span>
                  <span className="block text-xs text-slate-600">{x.note}</span>
                </span>
                <Download className="w-4 h-4 text-emerald-700 flex-shrink-0" aria-hidden />
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
