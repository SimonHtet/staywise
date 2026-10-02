import { prisma } from './prisma'

// Login throttle stored in Postgres so every serverless instance shares the
// same counters. Keyed per IP *and* per email: the IP key stops one machine
// spraying many accounts, the email key stops a botnet hammering one account.
const WINDOW_MS = 15 * 60 * 1000
const MAX_PER_IP = 20
const MAX_PER_EMAIL = 5

async function bump(key: string, max: number): Promise<boolean> {
  const now = new Date()
  const resetAt = new Date(now.getTime() + WINDOW_MS)
  const row = await prisma.loginAttempt.upsert({
    where: { key },
    create: { key, count: 1, resetAt },
    update: { count: { increment: 1 } },
  })
  if (row.resetAt < now) {
    // Window expired — start a fresh one with this attempt counted
    await prisma.loginAttempt.update({ where: { key }, data: { count: 1, resetAt } })
    return true
  }
  return row.count <= max
}

export async function checkLoginRateLimit(ip: string, email: string): Promise<boolean> {
  try {
    const [ipOk, emailOk] = await Promise.all([
      bump(`ip:${ip}`, MAX_PER_IP),
      bump(`email:${email.toLowerCase()}`, MAX_PER_EMAIL),
    ])
    return ipOk && emailOk
  } catch (err) {
    // Fail open: a throttle-table hiccup must not lock every user out
    console.error('[ratelimit] check failed:', err)
    return true
  }
}

export async function resetLoginAttempts(email: string) {
  await prisma.loginAttempt.deleteMany({ where: { key: `email:${email.toLowerCase()}` } }).catch(() => {})
}
