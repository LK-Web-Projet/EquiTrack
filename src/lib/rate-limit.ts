import 'server-only'

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000
const LOCKOUT_MS = 15 * 60 * 1000

type Entry = { count: number; windowStart: number; blockedUntil: number | null }

const attempts = new Map<string, Entry>()

function prune(now: number) {
  for (const [key, entry] of attempts) {
    const expired = (entry.blockedUntil ?? entry.windowStart + WINDOW_MS) < now
    if (expired) attempts.delete(key)
  }
}

export function isRateLimited(key: string): { limited: boolean; retryAfterSeconds?: number } {
  const now = Date.now()
  const entry = attempts.get(key)
  if (entry?.blockedUntil && entry.blockedUntil > now) {
    return { limited: true, retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000) }
  }
  return { limited: false }
}

export function recordFailedAttempt(key: string) {
  const now = Date.now()
  if (attempts.size > 5000) prune(now)

  const entry = attempts.get(key)
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now, blockedUntil: null })
    return
  }

  entry.count += 1
  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + LOCKOUT_MS
  }
}

export function clearAttempts(key: string) {
  attempts.delete(key)
}

export function rateLimitKey(req: Request, identifier: string) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
  return `${ip}:${identifier.toLowerCase()}`
}
