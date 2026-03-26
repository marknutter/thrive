-- Add the create_ledger step to any existing users' onboarding progress.
-- New users get it automatically via getProgress() auto-initialization.
-- This migration inserts the step for users who already have onboarding rows
-- but don't yet have the create_ledger step.

INSERT INTO onboarding_progress (user_id, step_key, status)
SELECT DISTINCT user_id, 'create_ledger', 'pending'
FROM onboarding_progress
WHERE user_id NOT IN (
  SELECT user_id FROM onboarding_progress WHERE step_key = 'create_ledger'
);
