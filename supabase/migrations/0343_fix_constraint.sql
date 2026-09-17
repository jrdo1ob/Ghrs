-- Migration 034b: Fix CHECK constraint safely
-- First drop the constraint, then update data, then add new constraint

BEGIN;

-- Drop existing constraint
ALTER TABLE task_approval_history DROP CONSTRAINT IF EXISTS task_approval_history_action_check;

-- Add new constraint with all allowed values
ALTER TABLE task_approval_history ADD CONSTRAINT task_approval_history_action_check
  CHECK (action IN ('approved', 'rejected', 'revoked', 'completed', 'pending'));

COMMIT;
