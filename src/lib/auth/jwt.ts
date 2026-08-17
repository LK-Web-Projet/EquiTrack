import 'server-only'
import jwt from 'jsonwebtoken'
import { SESSION_MAX_AGE } from './session'

export interface SessionPayload {
  userId: string
  email: string
  role: string
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET est requis en production.')
    }
    return 'dev-only-insecure-secret'
  }
  return secret
}

export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: SESSION_MAX_AGE, algorithm: 'HS256' })
}

export function verifySessionToken(token: string): SessionPayload {
  return jwt.verify(token, getSecret(), { algorithms: ['HS256'] }) as SessionPayload
}
