import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// Identifie l'utilisateur authentifié à partir des cookies de la requête,
// pour les routes API. Client anon (respecte RLS) — suffisant pour lire
// son propre rôle via la policy "select_own_profile".
export async function getRouteUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // Pas de rafraîchissement de cookies nécessaire dans un route handler ponctuel.
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, isAdmin: false }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { user, isAdmin: profile?.role === 'admin' }
}
