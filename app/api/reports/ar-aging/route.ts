import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { getHotelTimezone } from '@/lib/hoteltime'
import { dateIn } from '@/lib/dates'

export async function GET() {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!hasPermission(role!, 'VIEW_FINANCIALS')) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }

  try {
    const unpaid = await prisma.creditTransaction.findMany({
      where: { hotelId: hotelId!, status: 'unpaid', amount: { gt: 0 } },
      include: {
        company: { select: { id: true, name: true, type: true, contactName: true, contactEmail: true, creditLimit: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    const today = new Date()
    const tz = await getHotelTimezone(hotelId!)

    type AgingRow = {
      companyId: string
      companyName: string
      companyType: string
      contactName: string | null
      contactEmail: string | null
      creditLimit: number
      current: number    // 0–30
      days31_60: number
      days61_90: number
      over90: number
      total: number
      oldestDate: string
      txCount: number
    }

    const map: Record<string, AgingRow> = {}

    for (const tx of unpaid) {
      const cid = tx.companyId
      if (!map[cid]) {
        map[cid] = {
          companyId: cid,
          companyName: tx.company.name,
          companyType: tx.company.type,
          contactName: tx.company.contactName,
          contactEmail: tx.company.contactEmail,
          creditLimit: tx.company.creditLimit,
          current: 0,
          days31_60: 0,
          days61_90: 0,
          over90: 0,
          total: 0,
          oldestDate: dateIn(tx.createdAt, tz),
          txCount: 0,
        }
      }

      const ageDays = Math.floor((today.getTime() - tx.createdAt.getTime()) / 86400000)
      if (ageDays <= 30) map[cid].current += tx.amount
      else if (ageDays <= 60) map[cid].days31_60 += tx.amount
      else if (ageDays <= 90) map[cid].days61_90 += tx.amount
      else map[cid].over90 += tx.amount

      map[cid].total += tx.amount
      map[cid].txCount++

      const txDate = dateIn(tx.createdAt, tz)
      if (txDate < map[cid].oldestDate) map[cid].oldestDate = txDate
    }

    const rows = Object.values(map).sort((a, b) => b.total - a.total)

    const totals = rows.reduce(
      (acc, r) => ({
        current: acc.current + r.current,
        days31_60: acc.days31_60 + r.days31_60,
        days61_90: acc.days61_90 + r.days61_90,
        over90: acc.over90 + r.over90,
        total: acc.total + r.total,
      }),
      { current: 0, days31_60: 0, days61_90: 0, over90: 0, total: 0 }
    )

    return NextResponse.json({ rows, totals, asOf: dateIn(today, tz) })
  } catch (err) {
    console.error('[GET /api/reports/ar-aging] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
