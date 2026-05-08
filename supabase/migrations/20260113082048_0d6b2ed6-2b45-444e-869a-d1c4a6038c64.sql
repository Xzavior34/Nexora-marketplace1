-- Add last_seen_at column to profiles table for online status tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone DEFAULT NULL;

-- Create index for efficient queries on last_seen_at
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON public.profiles(last_seen_at);