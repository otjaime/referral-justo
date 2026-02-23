-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('PENDING', 'QUALIFIED', 'DEMO_SCHEDULED', 'MEETING_HELD', 'WON', 'LOST', 'NO_SHOW', 'NURTURE', 'DEAD');

-- CreateEnum
CREATE TYPE "PipelineEventType" AS ENUM ('STATUS_CHANGE', 'NOTE', 'SCORE_UPDATE', 'CONTACT_ATTEMPT', 'DEMO_SCHEDULED', 'MEETING_HELD', 'AUTO_QUALIFIED');

-- AlterTable
ALTER TABLE "referrals" ADD COLUMN     "demo_scheduled_at" TIMESTAMP(3),
ADD COLUMN     "from_meta_ad" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "meeting_held_at" TIMESTAMP(3),
ADD COLUMN     "meeting_outcome" TEXT,
ADD COLUMN     "next_action_at" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "nurture_stage" INTEGER,
ADD COLUMN     "opened_messages" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pipeline_status" "PipelineStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "requested_demo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "responded_wa" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "response_time_min" INTEGER,
ADD COLUMN     "score_engage" INTEGER,
ADD COLUMN     "score_fit" INTEGER,
ADD COLUMN     "score_intent" INTEGER,
ADD COLUMN     "score_total" INTEGER,
ADD COLUMN     "scored_at" TIMESTAMP(3),
ADD COLUMN     "sdr_contacted_at" TIMESTAMP(3),
ADD COLUMN     "used_calculator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "used_diagnostic" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "city" TEXT,
ADD COLUMN     "current_pos" TEXT,
ADD COLUMN     "delivery_pct" INTEGER,
ADD COLUMN     "num_locations" INTEGER,
ADD COLUMN     "owner_email" TEXT,
ADD COLUMN     "owner_whatsapp" TEXT;

-- CreateTable
CREATE TABLE "pipeline_events" (
    "id" TEXT NOT NULL,
    "referral_id" TEXT NOT NULL,
    "event_type" "PipelineEventType" NOT NULL,
    "from_status" "PipelineStatus",
    "to_status" "PipelineStatus",
    "note" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipeline_events_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pipeline_events" ADD CONSTRAINT "pipeline_events_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
