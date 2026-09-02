-- Migration 032: Fix reject_task_completion to set approved=FALSE
-- The RPC was not setting approved=FALSE, so rejected completions still showed as pending

BEGIN;

DROP FUNCTION IF EXISTS reject_task_completion(UUID, UUID);

CREATE OR REPLACE FUNCTION reject_task_completion(
  p_completion_id UUID,
  p_rejected_by UUID
)
RETURNS TABLE(success boolean, message text)
AS $$
DECLARE
  v_completion RECORD;
  v_task RECORD;
  v_caller_family_id UUID;
  v_caller_role TEXT;
BEGIN
  SELECT * INTO v_completion FROM task_completions WHERE id = p_completion_id;

  IF v_completion IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Completion not found'::TEXT;
    RETURN;
  END IF;

  IF v_completion.approved = TRUE THEN
    RETURN QUERY SELECT FALSE, 'Already approved'::TEXT;
    RETURN;
  END IF;

  -- Check if already rejected
  IF v_completion.rejected_by IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, 'Already rejected'::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_task FROM tasks WHERE id = v_completion.task_id;

  -- Family check
  SELECT family_id, role INTO v_caller_family_id, v_caller_role
  FROM get_current_member();

  IF v_caller_family_id IS NOT NULL THEN
    IF v_task.family_id != v_caller_family_id THEN
      RETURN QUERY SELECT FALSE, 'Not authorized'::TEXT;
      RETURN;
    END IF;
    IF v_caller_role NOT IN ('owner', 'parent') THEN
      RETURN QUERY SELECT FALSE, 'Not authorized: not a parent'::TEXT;
      RETURN;
    END IF;
  END IF;

  UPDATE task_completions
  SET approved = FALSE,
      rejected_by = p_rejected_by,
      rejected_at = NOW()
  WHERE id = p_completion_id;

  RETURN QUERY SELECT TRUE, 'Completion rejected'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
