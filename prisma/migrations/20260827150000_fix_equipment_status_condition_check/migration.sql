-- Corrige la contrainte equipment_status_condition_check (20260827140000) : celle-ci exigeait à
-- tort qu'un équipement disponible/emprunté soit forcément en "bon état", ce qui rejetait des
-- données réelles valides (du matériel disponible peut être en état correct ou mauvais). Seule
-- règle réelle : un équipement en panne/maintenance ne peut jamais être en "bon état".
-- `IF EXISTS` : la contrainte d'origine n'a jamais pu être créée sur certaines bases (échec de
-- validation contre des données existantes), ce DROP est donc un no-op ailleurs — sans danger.
ALTER TABLE "equipment" DROP CONSTRAINT IF EXISTS "equipment_status_condition_check";

ALTER TABLE "equipment" ADD CONSTRAINT "equipment_status_condition_check" CHECK (
  NOT (status IN ('broken', 'maintenance') AND condition = 'good')
);
