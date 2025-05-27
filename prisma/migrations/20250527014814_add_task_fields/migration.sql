-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "estimated_hours" DOUBLE PRECISION,
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'Medium',
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'Other';
