-- Un équipement disponible/emprunté est forcément en "bon état" ; un équipement en panne/en
-- maintenance ne peut jamais être en "bon état" (minimum "correct"). Empêche en base les
-- combinaisons incohérentes (ex. status='broken' + condition='good') même via un accès direct
-- hors API (voir src/lib/equipment-state.ts pour la logique applicative correspondante).
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_status_condition_check" CHECK (
  (status IN ('available', 'borrowed') AND condition = 'good')
  OR (status IN ('broken', 'maintenance') AND condition IN ('fair', 'poor'))
);
