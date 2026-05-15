-- Safe view for cross-table OR queries (applicant_id OR poster_id)
CREATE OR REPLACE VIEW public.task_applications_with_poster AS
SELECT
  ta.id,
  ta.task_id,
  ta.applicant_id,
  ta.status,
  ta.created_at,
  t.poster_id
FROM public.task_applications ta
JOIN public.tasks t ON t.id = ta.task_id;

GRANT SELECT ON public.task_applications_with_poster TO authenticated;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_task_applications_applicant
  ON public.task_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_task_applications_task
  ON public.task_applications(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_poster
  ON public.tasks(poster_id);
CREATE INDEX IF NOT EXISTS idx_messages_task_sender
  ON public.messages(task_id, sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_escrow_state_log_changed_at
  ON public.escrow_state_log(changed_at DESC);

-- Safely add `payout` to transaction_type enum if it exists and value missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'transaction_type'
        AND e.enumlabel = 'payout'
    ) THEN
      ALTER TYPE public.transaction_type ADD VALUE 'payout';
    END IF;
  END IF;
END $$;