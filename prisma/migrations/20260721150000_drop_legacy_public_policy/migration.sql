-- ============================================================================
-- Supprime une policy héritée de la configuration initiale du projet Supabase :
-- "Accès public" (roles: public, qual: true, cmd: ALL) présente sur les
-- 8 tables d'origine. Cette policy ouvrait un accès total et inconditionnel
-- à tout le monde (y compris non authentifié), ce qui annulait complètement
-- les policies admin/authenticated ajoutées dans la migration précédente —
-- RLS était activée mais sans effet réel tant que cette policy existait.
-- ============================================================================
do $$
declare
  t text;
begin
  foreach t in array array['categories', 'departments', 'employees', 'equipment', 'incidents', 'loan_items', 'loans', 'maintenances']
  loop
    execute format('drop policy if exists "Accès public" on public.%I', t);
  end loop;
end $$;
