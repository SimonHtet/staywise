import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { checkLoginRateLimit, resetLoginAttempts } from './ratelimit'
import { writeAudit } from './audit'

// How often a live session re-reads the user row (role / active / hotel)
const REVALIDATE_MS = 5 * 60 * 1000

// Compared against when the email doesn't exist, so unknown accounts take the
// same time to reject as wrong passwords (prevents user enumeration by timing).
const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null

        const forwarded = req?.headers?.['x-forwarded-for'] as string | undefined
        const ip =
          forwarded?.split(',')[0]?.trim() ||
          (req?.headers?.['x-real-ip'] as string | undefined) ||
          'unknown'

        const email = credentials.email.trim().toLowerCase()
        if (!(await checkLoginRateLimit(ip, email))) return null

        let user
        try {
          user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
          })
        } catch (err) {
          console.error('[auth] DB error during login:', err)
          return null
        }

        const valid = await bcrypt.compare(credentials.password, user?.password ?? DUMMY_HASH)
        if (!user || !valid || !user.active) return null

        await resetLoginAttempts(email)
        await writeAudit({
          hotelId: user.hotelId,
          userId: user.id,
          userName: user.name ?? user.email,
          action: 'user.login',
          entity: 'user',
          entityId: user.id,
          details: { ip },
        })

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          hotelId: user.hotelId,
          mustChangePassword: user.mustChangePassword,
        }
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 24 * 60 * 60 },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.hotelId = (user as any).hotelId
        token.mustChangePassword = (user as any).mustChangePassword
        token.checkedAt = Date.now()
        return token
      }
      // Re-read the user every few minutes (or when the client calls update())
      // so role changes, deactivation and password resets take effect without
      // waiting for the 24 h token to expire.
      const stale = Date.now() - ((token.checkedAt as number) ?? 0) > REVALIDATE_MS
      if (token.id && (stale || trigger === 'update')) {
        try {
          const fresh = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, hotelId: true, active: true, mustChangePassword: true },
          })
          if (!fresh || !fresh.active) {
            // Strip identity — getSessionOrUnauthorized() rejects it as 401
            return { ...token, id: '', role: '', hotelId: '' }
          }
          token.role = fresh.role
          token.hotelId = fresh.hotelId
          token.mustChangePassword = fresh.mustChangePassword
          token.checkedAt = Date.now()
        } catch (err) {
          // DB blip — keep the current token rather than logging everyone out
          console.error('[auth] token revalidation failed:', err)
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).role = token.role
        ;(session.user as any).hotelId = token.hotelId
        ;(session.user as any).mustChangePassword = token.mustChangePassword ?? false
      }
      return session
    },
  },
}
