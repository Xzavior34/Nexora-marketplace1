-- 1) Wallet topups (deposits)
CREATE TABLE IF NOT EXISTS public.wallet_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_kobo bigint NOT NULL,
  paystack_reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_topups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own wallet topups"
ON public.wallet_topups
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own wallet topups"
ON public.wallet_topups
FOR SELECT
USING (auth.uid() = user_id);

-- 2) Task applications (so poster can chat with people who clicked/applied)
CREATE TABLE IF NOT EXISTS public.task_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, applicant_id)
);

ALTER TABLE public.task_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants can create their own applications"
ON public.task_applications
FOR INSERT
WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Applicants can view their own applications"
ON public.task_applications
FOR SELECT
USING (
  auth.uid() = applicant_id
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_applications.task_id
      AND t.poster_id = auth.uid()
  )
);

CREATE POLICY "Posters can update application status"
ON public.task_applications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_applications.task_id
      AND t.poster_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_applications.task_id
      AND t.poster_id = auth.uid()
  )
);

-- 3) Messages: support per-application chat threads
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES public.task_applications(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_messages_application_id ON public.messages(application_id);
CREATE INDEX IF NOT EXISTS idx_task_applications_task_id ON public.task_applications(task_id);
CREATE INDEX IF NOT EXISTS idx_task_applications_applicant_id ON public.task_applications(applicant_id);

-- Replace existing message policies with application-aware ones
DROP POLICY IF EXISTS "Users can insert messages for their tasks" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages for their tasks" ON public.messages;

CREATE POLICY "Users can insert messages for their task chats"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND (
    -- assigned chat
    (application_id IS NULL AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = messages.task_id
        AND (t.poster_id = auth.uid() OR t.assignee_id = auth.uid())
    ))
    OR
    -- applicant chat (threaded per application)
    (application_id IS NOT NULL AND EXISTS (
      SELECT 1
      FROM public.task_applications a
      JOIN public.tasks t ON t.id = a.task_id
      WHERE a.id = messages.application_id
        AND t.id = messages.task_id
        AND (t.poster_id = auth.uid() OR a.applicant_id = auth.uid())
    ))
  )
);

CREATE POLICY "Users can view messages for their task chats"
ON public.messages
FOR SELECT
USING (
  -- assigned chat
  (application_id IS NULL AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = messages.task_id
      AND (t.poster_id = auth.uid() OR t.assignee_id = auth.uid())
  ))
  OR
  -- applicant chat
  (application_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.task_applications a
    JOIN public.tasks t ON t.id = a.task_id
    WHERE a.id = messages.application_id
      AND t.id = messages.task_id
      AND (t.poster_id = auth.uid() OR a.applicant_id = auth.uid())
  ))
);
