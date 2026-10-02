import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission, isValidRole, MIN_PASSWORD_LENGTH, USER_SELECT } from '@/lib/rbac'
import bcrypt from 'bcryptjs'
import { audited } from '@/lib/audit'

function strip(user: { id: string; name: string | null; email: string; role: string; hotelId: string; createdAt: Date }) {
  const { ...safe } = user
  return safe
}

export async function GET(_req: NextRequest) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!hasPermission(role!, 'VIEW_ALL_USERS')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    where: { hotelId: hotelId! },
    select: USER_SELECT,
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(users)
}

async function POST_handler(req: NextRequest) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!hasPermission(role!, 'MANAGE_USERS')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { name, email, password, userRole } = body

  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password.trim()) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }
  if (!isValidRole(userRole)) {
    return NextResponse.json({ error: 'Choose a valid role' }, { status: 400 })
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      name: name?.trim() || null,
      email: email.trim().toLowerCase(),
      password: hashed,
      role: userRole,
      hotelId: hotelId!,
      // The admin chose this password — the new user replaces it on first login
      mustChangePassword: true,
    },
    select: USER_SELECT,
  })
  return NextResponse.json(user, { status: 201 })
}

export const POST = audited('user.create', POST_handler)
