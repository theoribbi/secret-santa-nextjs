ALTER TABLE "assignments" ADD COLUMN "email_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "email_resend_id" varchar(100);--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "email_error" text;