import 'server-only'

// Client sortant EquiTrack → CampTrack, calqué sur le client que CampTrack utilise déjà pour
// appeler l'app Proforma (camptrack-reseaupub/lib/integrations/proformaClient.ts). Utilisé
// uniquement pour peupler le sélecteur de services dans le formulaire catégorie — aucune écriture,
// lecture seule.

export interface CamptrackService {
  id_service: string
  nom: string
}

function baseHeaders() {
  return {
    Authorization: `Bearer ${process.env.CAMPTRACK_API_KEY}`,
    'Content-Type': 'application/json',
  }
}

function baseUrl() {
  const url = process.env.CAMPTRACK_API_URL
  if (!url) {
    throw new Error("CAMPTRACK_API_URL n'est pas configurée")
  }
  return url.replace(/\/+$/, '')
}

export async function listCamptrackServices(): Promise<CamptrackService[]> {
  const res = await fetch(`${baseUrl()}/api/integration/services`, {
    headers: baseHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error('Impossible de récupérer la liste des services CampTrack (app indisponible ou clé invalide)')
  }
  return res.json()
}
