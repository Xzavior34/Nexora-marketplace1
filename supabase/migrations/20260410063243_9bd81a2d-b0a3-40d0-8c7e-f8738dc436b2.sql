-- Prevent duplicate applications at the database level
ALTER TABLE public.task_applications
ADD CONSTRAINT unique_task_applicant UNIQUE (task_id, applicant_id);

-- Enable realtime for notifications so the bell updates instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;