/**
 * Server-side notification helper.
 *
 * All notification creation goes through this module to ensure:
 * - Consistent event structure
 * - Family isolation validation (via create_notification RPC)
 * - Structured logging
 * - No client-controlled recipient IDs
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { logEvent } from '@/lib/logger';

export type NotificationType =
  | 'gift_request'
  | 'gift_approved'
  | 'gift_rejected'
  | 'withdrawal_request'
  | 'task_pending'
  | 'task_approved'
  | 'task_rejected'
  | 'streak_milestone'
  | 'daily_goal_reached';

export type ReferenceType = 'gift' | 'task' | 'withdrawal' | 'achievement' | 'streak' | 'goal';

interface CreateNotificationParams {
  familyId: string;
  recipientMemberId: string;
  senderMemberId?: string;
  type: NotificationType;
  title: string;
  body?: string;
  referenceType?: ReferenceType;
  referenceId?: string;
}

/**
 * Create a notification via the create_notification RPC.
 * Returns the notification ID on success, null on failure.
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<string | null> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc('create_notification', {
      p_family_id: params.familyId,
      p_recipient_member_id: params.recipientMemberId,
      p_type: params.type,
      p_title: params.title,
      p_body: params.body || null,
      p_sender_member_id: params.senderMemberId || null,
      p_reference_type: params.referenceType || null,
      p_reference_id: params.referenceId || null,
    });

    if (error) {
      logEvent('error', 'notification.create_failed', error.message, {
        family_id: params.familyId,
        recipient_id: params.recipientMemberId,
        type: params.type,
      });
      return null;
    }

    logEvent('info', 'notification.created', `${params.type} → ${params.recipientMemberId}`, {
      family_id: params.familyId,
      notification_id: data,
      type: params.type,
    });

    return data as string;
  } catch (err) {
    logEvent('error', 'notification.create_exception', 'Unexpected error', {
      family_id: params.familyId,
      type: params.type,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Notify all parent members of a family.
 */
export async function notifyParents(
  familyId: string,
  params: Omit<CreateNotificationParams, 'familyId' | 'recipientMemberId'>
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    const { data: parents } = await supabase
      .from('members')
      .select('id')
      .eq('family_id', familyId)
      .in('role', ['owner', 'parent'])
      .eq('is_deleted', false);

    if (!parents || parents.length === 0) return;

    for (const parent of parents) {
      await createNotification({
        ...params,
        familyId,
        recipientMemberId: parent.id,
      });
    }
  } catch (err) {
    logEvent('error', 'notification.notify_parents_failed', 'Failed to notify parents', {
      family_id: familyId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Notify a specific child member.
 */
export async function notifyChild(
  familyId: string,
  childMemberId: string,
  params: Omit<CreateNotificationParams, 'familyId' | 'recipientMemberId'>
): Promise<void> {
  await createNotification({
    ...params,
    familyId,
    recipientMemberId: childMemberId,
  });
}
