import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardShell } from './DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  const hotelId = (session?.user as any)?.hotelId as string | undefined
  if (!session || !hotelId) {
    redirect('/login')
  }

  // Main currency drives every money symbol on the client (lib/money.ts)
  const setting = await prisma.hotelSetting
    .findUnique({ where: { id: hotelId }, select: { baseCurrency: true } })
    .catch(() => null)

  return <DashboardShell currency={setting?.baseCurrency ?? 'THB'}>{children}</DashboardShell>
}
