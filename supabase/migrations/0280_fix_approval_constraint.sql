-- Migration 028: Fix CHECK constraint on task_approval_history
-- Adds 'revoke' to the allowed action values

BEGIN;

-- Drop old constraint
ALTER TABLE task_approval_history DROP CONSTRAINT IF EXISTS task_approval_history_action_check;

-- Add new constraint with all allowed values
ALTER TABLE task_approval_history ADD CONSTRAINT task_approval_history_action_check 
CHECK (action IN ('approve', 'reject', 'revoke'));

COMMIT;
