import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission, isValidRole, MIN_PASSWORD_LENGTH, USER_SELECT } from '@/lib/rbac'
import bcrypt from 'bcryptjs'
import { audited } from '@/lib/audit'

async function PUT_handler(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, role, session, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!hasPermission(role!, 'MANAGE_USERS')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } })
  if (!target || target.hotelId !== hotelId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const { name, userRole, password, active } = body
  const isSelf = params.id === (session!.user as any).id
  const activeAdmins = () => prisma.user.count({ where: { hotelId: hotelId!, role: 'admin', active: true } })

  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = typeof name === 'string' ? name.trim().slice(0, 100) || null : null
  if (userRole !== undefined) {
    if (!isValidRole(userRole)) {
      return NextResponse.json({ error: 'Choose a valid role' }, { status: 400 })
    }
    // Prevent removing the last admin
    if (target.role === 'admin' && userRole !== 'admin' && (await activeAdmins()) <= 1) {
      return NextResponse.json({ error: 'Cannot demote the last admin' }, { status: 400 })
    }
    data.role = userRole
  }
  if (active !== undefined) {
    if (typeof active !== 'boolean') {
      return NextResponse.json({ error: 'active must be true or false' }, { status: 400 })
    }
    if (!active && isSelf) {
      return NextResponse.json({ error: 'You cannot deactivate your own account' }, { status: 400 })
    }
    if (!active && target.role === 'admin' && (await activeAdmins()) <= 1) {
      return NextResponse.json({ error: 'Cannot deactivate the last admin' }, { status: 400 })
    }
    data.active = active
  }
  if (typeof password === 'string' && password.trim()) {
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 })
    }
    data.password = await bcrypt.hash(password, 10)
    data.passwordChangedAt = new Date()
    // An admin-set password is temporary — the user must replace it on next login
    data.mustChangePassword = !isSelf
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data,
    select: USER_SELECT,
  })
  return NextResponse.json(updated)
}

async function DELETE_handler(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, role, session, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!hasPermission(role!, 'MANAGE_USERS')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const currentUserId = (session!.user as any).id
  if (params.id === currentUserId) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } })
  if (!target || target.hotelId !== hotelId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (target.role === 'admin') {
    const adminCount = await prisma.user.count({ where: { hotelId: hotelId!, role: 'admin', active: true } })
    if (adminCount <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last admin' }, { status: 400 })
    }
  }

  await prisma.user.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}

export const PUT = audited('user.update', PUT_handler)

export const DELETE = audited('user.delete', DELETE_handler)
