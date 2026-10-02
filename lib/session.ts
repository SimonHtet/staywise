import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from './auth'

export async function getSessionOrUnauthorized() {
  const session = await getServerSession(authOptions)
  const hotelId = (session?.user as any)?.hotelId as string | undefined
  const role = (session?.user as any)?.role as string | undefined
  // A session without a hotel or role is malformed (or was revoked) — never
  // fall back to a default hotel, that would leak another tenant's data.
  if (!session || !hotelId || !role) {
    return {
      session: null,
      hotelId: null,
      role: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { session, hotelId, role, error: null }
}
