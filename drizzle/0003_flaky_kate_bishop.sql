ALTER TABLE "lesson_completions" ALTER COLUMN "completed_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "lesson_completions" ALTER COLUMN "completed_at" DROP NOT NULL;