import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRouteUser } from '@/lib/supabase-route'

export async function GET() {
  const { isAdmin } = await getRouteUser()
  if (!isAdmin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const supabaseAdmin = getSupabaseAdmin()
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers()
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  const { data: profiles, error: profilesError } = await supabaseAdmin.from('profiles').select('*')
  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 })

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))
  const users = authData.users.map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    full_name: profileMap.get(u.id)?.full_name ?? '',
    role: profileMap.get(u.id)?.role ?? 'user',
  }))

  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  const { isAdmin } = await getRouteUser()
  if (!isAdmin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { email, password, full_name, role } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
  }
  if (String(password).length < 8) {
    return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 })
  }

  const finalRole = role === 'admin' ? 'admin' : 'user'

  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name ?? '', role: finalRole },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Le trigger DB remplit déjà profiles à partir des metadata — on s'assure
  // explicitement du rôle/nom au cas où.
  await supabaseAdmin.from('profiles').upsert({
    id: data.user.id,
    full_name: full_name ?? '',
    role: finalRole,
  })

  return NextResponse.json({ user: data.user })
}
