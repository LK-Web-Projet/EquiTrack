-- ============================================================================
-- EquiTrack — authentification, rôles, photos équipements, écritures
-- atomiques pour les emprunts.
--
-- Appliquée via `npm run db:migrate` (prisma migrate dev). Idempotente :
-- peut être rejouée sans danger.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────
-- 1. Table profiles (rôle applicatif lié à auth.users)
-- ────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  role       text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Auto-création d'une ligne profiles à chaque nouvel utilisateur auth.
-- Le rôle/nom sont lus depuis user_metadata si fournis à la création
-- (voir /api/admin/users et prisma/seed.ts), sinon 'user' par défaut.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Fonction utilitaire réutilisée dans toutes les policies admin.
-- security definer + owner (postgres) => bypasse RLS sur profiles,
-- évite toute récursion des policies.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "select_own_profile" on public.profiles;
create policy "select_own_profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "select_all_profiles_admin" on public.profiles;
create policy "select_all_profiles_admin" on public.profiles
  for select using (public.is_admin());

drop policy if exists "update_profiles_admin" on public.profiles;
create policy "update_profiles_admin" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());


-- ────────────────────────────────────────────────────────────────────────
-- 2. Table equipment_photos
-- ────────────────────────────────────────────────────────────────────────
create table if not exists public.equipment_photos (
  id           uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  url          text not null,
  created_at   timestamptz not null default now()
);
create index if not exists equipment_photos_equipment_id_idx
  on public.equipment_photos(equipment_id);

alter table public.equipment_photos enable row level security;


-- ────────────────────────────────────────────────────────────────────────
-- 3. RLS sur les tables existantes
--    Lecture : tout utilisateur connecté. Écriture : selon la table.
-- ────────────────────────────────────────────────────────────────────────

-- Tables gérées uniquement par l'admin (données de référence) :
--   categories, departments, employees, equipment, equipment_photos, maintenances
do $$
declare
  t text;
begin
  foreach t in array array['categories', 'departments', 'employees', 'equipment', 'equipment_photos', 'maintenances']
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "select_authenticated" on public.%I', t);
    execute format('create policy "select_authenticated" on public.%I for select using (auth.uid() is not null)', t);

    execute format('drop policy if exists "admin_insert" on public.%I', t);
    execute format('create policy "admin_insert" on public.%I for insert with check (public.is_admin())', t);

    execute format('drop policy if exists "admin_update" on public.%I', t);
    execute format('create policy "admin_update" on public.%I for update using (public.is_admin()) with check (public.is_admin())', t);

    execute format('drop policy if exists "admin_delete" on public.%I', t);
    execute format('create policy "admin_delete" on public.%I for delete using (public.is_admin())', t);
  end loop;
end $$;

-- Loans / loan_items : tout utilisateur connecté peut emprunter et retourner
-- (les écritures passent en réalité par les fonctions RPC ci-dessous, qui
-- s'exécutent en security definer — ces policies sont une sécurité de repli).
do $$
declare
  t text;
begin
  foreach t in array array['loans', 'loan_items']
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "select_authenticated" on public.%I', t);
    execute format('create policy "select_authenticated" on public.%I for select using (auth.uid() is not null)', t);

    execute format('drop policy if exists "authenticated_insert" on public.%I', t);
    execute format('create policy "authenticated_insert" on public.%I for insert with check (auth.uid() is not null)', t);

    execute format('drop policy if exists "authenticated_update" on public.%I', t);
    execute format('create policy "authenticated_update" on public.%I for update using (auth.uid() is not null) with check (auth.uid() is not null)', t);
  end loop;
end $$;

-- Incidents : tout utilisateur connecté peut signaler un problème ;
-- résoudre/supprimer reste réservé à l'admin.
alter table public.incidents enable row level security;

drop policy if exists "select_authenticated" on public.incidents;
create policy "select_authenticated" on public.incidents
  for select using (auth.uid() is not null);

drop policy if exists "authenticated_insert" on public.incidents;
create policy "authenticated_insert" on public.incidents
  for insert with check (auth.uid() is not null);

drop policy if exists "admin_update" on public.incidents;
create policy "admin_update" on public.incidents
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_delete" on public.incidents;
create policy "admin_delete" on public.incidents
  for delete using (public.is_admin());


-- ────────────────────────────────────────────────────────────────────────
-- 4. Bucket Storage pour les photos d'équipement
-- ────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('equipment-photos', 'equipment-photos', true)
on conflict (id) do nothing;

drop policy if exists "equipment_photos_public_read" on storage.objects;
create policy "equipment_photos_public_read" on storage.objects
  for select using (bucket_id = 'equipment-photos');

drop policy if exists "equipment_photos_admin_insert" on storage.objects;
create policy "equipment_photos_admin_insert" on storage.objects
  for insert with check (bucket_id = 'equipment-photos' and public.is_admin());

drop policy if exists "equipment_photos_admin_delete" on storage.objects;
create policy "equipment_photos_admin_delete" on storage.objects
  for delete using (bucket_id = 'equipment-photos' and public.is_admin());


-- ────────────────────────────────────────────────────────────────────────
-- 5. Fonctions RPC transactionnelles pour les emprunts
--    (remplacent les écritures séquentielles côté client — tout réussit
--    ou tout échoue ensemble)
-- ────────────────────────────────────────────────────────────────────────
create or replace function public.create_loan_with_items(
  p_employee_id uuid,
  p_checkout_date text,
  p_checkout_time text,
  p_expected_return_date text,
  p_checkout_notes text,
  p_processed_by text,
  p_equipment_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié';
  end if;
  if p_equipment_ids is null or array_length(p_equipment_ids, 1) is null then
    raise exception 'Aucun équipement sélectionné';
  end if;

  execute format(
    'insert into public.loans (employee_id, checkout_date, checkout_time, expected_return_date, checkout_notes, processed_by, status) values (%L, %L, %L, %L, %L, %L, %L) returning id',
    p_employee_id, p_checkout_date, p_checkout_time, p_expected_return_date, p_checkout_notes, p_processed_by, 'active'
  ) into v_loan_id;

  insert into public.loan_items (loan_id, equipment_id)
  select v_loan_id, eid from unnest(p_equipment_ids) as eid;

  update public.equipment
  set status = 'borrowed', updated_at = now()
  where id = any(p_equipment_ids);

  return v_loan_id;
end;
$$;

grant execute on function public.create_loan_with_items(uuid, text, text, text, text, text, uuid[]) to authenticated;

create or replace function public.return_loan_with_items(
  p_loan_id uuid,
  p_return_date text,
  p_return_time text,
  p_return_notes text,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_equipment_id uuid;
  v_condition text;
  v_notes text;
  v_new_status text;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié';
  end if;

  execute format(
    'update public.loans set status = %L, return_date = %L, return_time = %L, return_notes = %L where id = %L',
    'returned', p_return_date, p_return_time, p_return_notes, p_loan_id
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_equipment_id := (v_item->>'equipment_id')::uuid;
    v_condition := v_item->>'return_condition';
    v_notes := v_item->>'return_notes';

    execute format(
      'update public.loan_items set return_condition = %L, return_notes = %L where loan_id = %L and equipment_id = %L',
      v_condition, v_notes, p_loan_id, v_equipment_id
    );

    v_new_status := case when v_condition = 'broken' then 'broken' else 'available' end;

    execute format(
      'update public.equipment set status = %L, updated_at = now() where id = %L',
      v_new_status, v_equipment_id
    );
  end loop;
end;
$$;

grant execute on function public.return_loan_with_items(uuid, text, text, text, jsonb) to authenticated;
