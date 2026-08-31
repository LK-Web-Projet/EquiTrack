import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api-auth'
import { listCamptrackServices } from '@/lib/camptrack-client'

// GET /api/camptrack/services — proxy authentifié (session admin) vers CampTrack, pour peupler
// le sélecteur de services dans le formulaire catégorie. Ne jamais exposer CAMPTRACK_API_KEY au
// navigateur : c'est pour ça que ce détour côté serveur existe plutôt qu'un appel direct client.
export const GET = withAdmin(async () => {
  try {
    const services = await listCamptrackServices()
    return NextResponse.json({ data: services })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Impossible de récupérer les services CampTrack' }, { status: 502 })
  }
})
