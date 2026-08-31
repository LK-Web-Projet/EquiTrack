-- CreateTable
CREATE TABLE "checklist_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "checklist_item_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "state" TEXT NOT NULL,
    "maintenance_id" UUID,
    "loan_item_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_checklist_items_category" ON "checklist_items"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_items_category_id_name_key" ON "checklist_items"("category_id", "name");

-- CreateIndex
CREATE INDEX "idx_checklist_results_equipment_item" ON "checklist_results"("equipment_id", "checklist_item_id");

-- CreateIndex
CREATE INDEX "idx_checklist_results_maintenance" ON "checklist_results"("maintenance_id");

-- CreateIndex
CREATE INDEX "idx_checklist_results_loan_item" ON "checklist_results"("loan_item_id");

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_results" ADD CONSTRAINT "checklist_results_checklist_item_id_fkey" FOREIGN KEY ("checklist_item_id") REFERENCES "checklist_items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_results" ADD CONSTRAINT "checklist_results_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_results" ADD CONSTRAINT "checklist_results_maintenance_id_fkey" FOREIGN KEY ("maintenance_id") REFERENCES "maintenances"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checklist_results" ADD CONSTRAINT "checklist_results_loan_item_id_fkey" FOREIGN KEY ("loan_item_id") REFERENCES "loan_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Un checklist_results est rattaché à EXACTEMENT un événement : une maintenance OU un retour de
-- prêt, jamais les deux, jamais aucun des deux.
ALTER TABLE "checklist_results" ADD CONSTRAINT "checklist_results_event_xor_check" CHECK (
  (maintenance_id IS NOT NULL AND loan_item_id IS NULL)
  OR
  (maintenance_id IS NULL AND loan_item_id IS NOT NULL)
);
