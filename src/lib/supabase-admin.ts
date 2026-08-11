import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Client serveur uniquement — utilise la service role key qui bypasse RLS.
// Ne jamais importer ce fichier depuis un composant client ('use client').
//
// Initialisation paresseuse : évite de faire planter la collecte de build
// Next.js (qui importe le module sans appeler la route) tant que
// SUPABASE_SERVICE_ROLE_KEY n'est pas encore configurée dans .env.local.
let cached: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local — voir .env.local.example.'
    )
  }

  cached = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cached
}
