-- CreateEnum
CREATE TYPE "TeamMembershipStatus" AS ENUM ('pending', 'active');

-- AlterTable
ALTER TABLE "team_memberships" ADD COLUMN     "status" "TeamMembershipStatus" NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "createdByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
