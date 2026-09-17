-- Migration 034c: Fix CHECK constraint with correct action values
-- The table has 'revoke' but constraint only allowed 'revoked'

BEGIN;

-- Drop existing constraint
ALTER TABLE task_approval_history DROP CONSTRAINT IF EXISTS task_approval_history_action_check;

-- Add constraint with ALL actual values including 'revoke'
ALTER TABLE task_approval_history ADD CONSTRAINT task_approval_history_action_check
  CHECK (action IN ('approved', 'rejected', 'revoke', 'revoked', 'completed', 'pending'));

COMMIT;
