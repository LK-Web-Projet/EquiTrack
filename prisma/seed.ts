// Seed : crée (ou met à jour) le tout premier compte admin, pour ne plus
// avoir à le faire manuellement depuis le Dashboard Supabase.
//
// Nécessite dans .env.local :
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME (optionnel)
//
// Lancer avec : npm run db:seed  (ou automatiquement après `npm run db:migrate`)
//
// Idempotent : peut être relancé sans risque, il ne recrée pas le compte
// s'il existe déjà (il remet juste son rôle à 'admin').

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const adminEmail = process.env.SEED_ADMIN_EMAIL
const adminPassword = process.env.SEED_ADMIN_PASSWORD
const adminName = process.env.SEED_ADMIN_NAME || 'Admin'

async function main() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis dans .env.local (voir .env.local.example)."
    )
  }
  if (!adminEmail || !adminPassword) {
    throw new Error(
      "SEED_ADMIN_EMAIL et SEED_ADMIN_PASSWORD sont requis dans .env.local pour créer le premier compte admin."
    )
  }
  if (adminPassword.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD doit contenir au moins 8 caractères.')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Cherche si le compte existe déjà (pagination simple, largement
  // suffisante pour le nombre de comptes attendu sur ce type d'app).
  let userId: string | null = null
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const found = data.users.find(u => u.email?.toLowerCase() === adminEmail.toLowerCase())
    if (found) { userId = found.id; break }
    if (data.users.length < 200) break
  }

  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: adminName, role: 'admin' },
    })
    if (error) throw error
    userId = data.user.id
    console.log(`✓ Compte admin créé : ${adminEmail}`)
  } else {
    console.log(`✓ Compte admin déjà existant : ${adminEmail} (rôle vérifié)`)
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: userId, full_name: adminName, role: 'admin' })
  if (profileError) throw profileError

  console.log('✓ Seed terminé.')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
