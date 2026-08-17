export const SESSION_COOKIE = 'et_session'

export const SESSION_MAX_AGE = 7 * 24 * 60 * 60 // 7 jours, en secondes

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE,
}
