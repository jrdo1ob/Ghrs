-- Migration 080: In-app Notification System
-- Product Phase 4: Notifications
--
-- Changes:
-- 1. CREATE TABLE notifications — persistent in-app notification storage
-- 2. RLS + GRANT: browser roles blocked, service_role only
-- 3. CREATE FUNCTION create_notification — secure server-side creation
-- 4. CREATE FUNCTION mark_notification_read — mark single as read
-- 5. CREATE FUNCTION mark_all_notifications_read — mark all as read for member
-- 6. CREATE FUNCTION get_unread_notification_count — badge count
-- 7. CREATE FUNCTION cleanup_old_notifications — 90-day retention
-- 8. pg_cron: daily cleanup at 04:00 UTC
--
-- Design:
--   - All access via service_role (API routes). RLS blocks browser roles.
--   - Notifications are family-scoped via recipient_member_id → members.family_id.
--   - Types: gift_request, gift_approved, gift_rejected, withdrawal_request,
--     task_pending, task_approved, task_rejected, streak_milestone, daily_goal_reached.
--   - 90-day retention. Cleanup is idempotent.
--   - SECURITY DEFINER for creation (inserts bypass RLS via service_role anyway,
--     but function validates recipient exists and belongs to caller's family).

BEGIN;

-- ============================================================
-- 1. Notifications table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id           UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  recipient_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  sender_member_id    UUID REFERENCES members(id) ON DELETE SET NULL,
  type                TEXT NOT NULL CHECK (type IN (
    'gift_request', 'gift_approved', 'gift_rejected',
    'withdrawal_request',
    'task_pending', 'task_approved', 'task_rejected',
    'streak_milestone', 'daily_goal_reached'
  )),
  title               TEXT NOT NULL,
  body                TEXT,
  reference_type      TEXT CHECK (reference_type IN ('gift', 'task', 'withdrawal', 'achievement', 'streak', 'goal')),
  reference_id        UUID,
  is_read             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.notifications IS 'Phase 4: Persistent in-app notifications. All access via service_role.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON public.notifications (recipient_member_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_family
  ON public.notifications (family_id, created_at DESC);

-- ============================================================
-- 2. RLS: block browser roles, allow service_role
-- ============================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_service_only ON public.notifications;
CREATE POLICY notifications_service_only ON public.notifications
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 3. Table grants: browser roles get nothing
-- ============================================================

REVOKE ALL ON public.notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO service_role;

-- ============================================================
-- 4. Create notification function
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_notification(
  p_family_id UUID,
  p_recipient_member_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_sender_member_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $BODY$
DECLARE
  v_notification_id UUID;
  v_recipient_family_id UUID;
BEGIN
  -- Validate recipient exists and belongs to the same family
  SELECT family_id INTO v_recipient_family_id
  FROM members WHERE id = p_recipient_member_id AND is_deleted = FALSE;

  IF v_recipient_family_id IS NULL THEN
    RAISE EXCEPTION 'Recipient member not found or deleted';
  END IF;

  IF v_recipient_family_id != p_family_id THEN
    RAISE EXCEPTION 'Recipient does not belong to the specified family';
  END IF;

  -- Validate sender belongs to same family (if provided)
  IF p_sender_member_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM members
      WHERE id = p_sender_member_id AND family_id = p_family_id AND is_deleted = FALSE
    ) THEN
      RAISE EXCEPTION 'Sender does not belong to the specified family';
    END IF;
  END IF;

  INSERT INTO public.notifications (
    family_id, recipient_member_id, sender_member_id,
    type, title, body, reference_type, reference_id
  ) VALUES (
    p_family_id, p_recipient_member_id, p_sender_member_id,
    p_type, p_title, p_body, p_reference_type, p_reference_id
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$BODY$;

-- ============================================================
-- 5. Mark single notification as read
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_notification_read(
  p_notification_id UUID,
  p_member_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $BODY$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE
  WHERE id = p_notification_id
    AND recipient_member_id = p_member_id
    AND is_read = FALSE;

  v_updated := FOUND;
  RETURN v_updated;
END;
$BODY$;

-- ============================================================
-- 6. Mark all notifications as read for a member
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(
  p_member_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $BODY$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE
  WHERE recipient_member_id = p_member_id
    AND is_read = FALSE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$BODY$;

-- ============================================================
-- 7. Get unread notification count
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_unread_notification_count(
  p_member_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $BODY$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.notifications
  WHERE recipient_member_id = p_member_id
    AND is_read = FALSE;

  RETURN COALESCE(v_count, 0);
END;
$BODY$;

-- ============================================================
-- 8. Cleanup old notifications (90-day retention)
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $BODY$
BEGIN
  DELETE FROM public.notifications
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$BODY$;

-- ============================================================
-- 9. Restrict function EXECUTE to service_role only
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.create_notification(UUID, UUID, TEXT, TEXT, TEXT, UUID, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, UUID, TEXT, TEXT, TEXT, UUID, TEXT, UUID)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.mark_notification_read(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID, UUID)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read(UUID)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_unread_notification_count(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count(UUID)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_notifications()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications()
  TO service_role;

-- ============================================================
-- 10. pg_cron: daily cleanup at 04:00 UTC
-- ============================================================

SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 4 * * *',
  'SELECT cleanup_old_notifications()'
);

-- ============================================================
-- 11. Verify
-- ============================================================

SELECT jobname, schedule, command FROM cron.job
WHERE jobname = 'cleanup-old-notifications';

COMMIT;
