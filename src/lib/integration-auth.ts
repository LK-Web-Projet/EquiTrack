import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

// Vérifie la clé Bearer envoyée par une app externe (ex: CampTrack) sur les routes
// /api/integration/*. Comparaison timing-safe. Même pattern que CampTrack (lib/integrationAuth.ts)
// côté intégration Proforma, pour rester cohérent entre les deux apps.
export function verifyIntegrationKey(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get('authorization')
  const integrationKey = process.env.EQUITRACK_INTEGRATION_API_KEY

  if (!integrationKey) {
    console.error('[INTEGRATION] EQUITRACK_INTEGRATION_API_KEY non configurée')
    return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
  }

  const expectedAuth = `Bearer ${integrationKey}`
  let authorized = false
  try {
    authorized = authHeader !== null &&
      authHeader.length === expectedAuth.length &&
      timingSafeEqual(Buffer.from(authHeader), Buffer.from(expectedAuth))
  } catch {
    authorized = false
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  return null
}
