import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { MIN_PASSWORD_LENGTH } from '@/lib/rbac'
import { audited } from '@/lib/audit'

// POST /api/account/password — signed-in user changes their own password
async function POST_handler(req: NextRequest) {
  const { session, error } = await getSessionOrUnauthorized({ allowPendingPasswordChange: true })
  if (error) return error
  const userId = (session!.user as any).id as string

  const body = await req.json().catch(() => ({}))
  const { currentPassword, newPassword } = body
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return NextResponse.json({ error: 'Enter your current and new password' }, { status: 400 })
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 })
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: 'New password must be different from the current one' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !user.active) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await bcrypt.compare(currentPassword, user.password))) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: await bcrypt.hash(newPassword, 10),
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    },
  })
  return NextResponse.json({ ok: true })
}

export const POST = audited('user.passwordChange', POST_handler)
