-- DropForeignKey
ALTER TABLE "loans" DROP CONSTRAINT "loans_employee_id_fkey";

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "camptrack_service_name" TEXT;

-- AlterTable
ALTER TABLE "loans" ADD COLUMN     "campagne_id" TEXT,
ADD COLUMN     "campagne_nom" TEXT,
ADD COLUMN     "prestataire_id" TEXT,
ADD COLUMN     "prestataire_nom" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'internal',
ALTER COLUMN "employee_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "idx_loans_campagne" ON "loans"("campagne_id");

-- CreateIndex
CREATE INDEX "idx_loans_prestataire" ON "loans"("prestataire_id");

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- Emprunteur interne (employee_id) XOR emprunteur externe (campagne_id + prestataire_id) : jamais
-- les deux, jamais aucun des deux.
ALTER TABLE "loans" ADD CONSTRAINT "loans_borrower_xor_check" CHECK (
  (employee_id IS NOT NULL AND campagne_id IS NULL AND prestataire_id IS NULL)
  OR
  (employee_id IS NULL AND campagne_id IS NOT NULL AND prestataire_id IS NOT NULL)
);
