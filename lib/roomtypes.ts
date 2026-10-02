// Shared validation for room-type routes (route files may only export handlers)

export function canManageRooms(role: string) {
  return role === 'admin' || role === 'manager'
}

export function parseRoomType(body: any): { code?: string; name?: string; rate?: number; error?: string } {
  const out: { code?: string; name?: string; rate?: number } = {}
  if (body.code !== undefined) {
    const code = String(body.code).trim().toUpperCase().replace(/\s+/g, '_')
    if (!/^[A-Z0-9_]{1,20}$/.test(code)) return { error: 'Code must be 1–20 letters, numbers or _' }
    out.code = code
  }
  if (body.name !== undefined) {
    const name = String(body.name).trim().slice(0, 60)
    if (!name) return { error: 'Name is required' }
    out.name = name
  }
  if (body.rate !== undefined) {
    const rate = Number(body.rate)
    if (!Number.isFinite(rate) || rate < 0) return { error: 'Enter a valid rate' }
    out.rate = rate
  }
  return out
}
