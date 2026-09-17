-- Migration 028b: Fix performed_by NOT NULL constraint
ALTER TABLE task_approval_history ALTER COLUMN performed_by DROP NOT NULL;
