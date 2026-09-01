export type MemberRole = 'owner' | 'parent' | 'child'

export interface Family {
  id: string
  name: string
  code: string
  created_at: string
  created_by: string
}

export interface Member {
  id: string
  family_id: string
  name: string
  role: MemberRole
  pin_hash: string | null
  avatar_url: string | null
  created_at: string
}

export interface AuthIdentity {
  id: string
  member_id: string
  auth_user_id: string
  provider: string
  created_at: string
}

export interface FamilyInvitation {
  id: string
  family_id: string
  code: string
  role: MemberRole
  invited_by: string
  used_by: string | null
  expires_at: string
  created_at: string
}

export interface Task {
  id: string
  family_id: string
  title: string
  description: string | null
  assigned_to: string[] | null
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom' | 'once'
  xp_reward: number
  money_reward: number | null
  requires_approval: boolean
  is_active: boolean
  created_by: string
  created_at: string
  is_deleted?: boolean
  deleted_at?: string | null
  story_content?: string | null
  story_type?: string | null
  story_url?: string | null
  is_bonus?: boolean
  priority?: 'high' | 'medium' | 'low'
  schedule_days?: number[] | null
  is_paused?: boolean
  task_type?: 'standard' | 'quran' | 'dua'
  quran_action_type?: 'read' | 'memorize'
  surah_number?: number | null
  from_ayah?: number | null
  to_ayah?: number | null
  custom_title?: string | null
  custom_content_text?: string | null
}

export interface TaskCompletion {
  id: string
  task_id: string
  member_id: string
  completed_at: string
  approved: boolean
  approved_by: string | null
  approved_at: string | null
}

export interface XpTransaction {
  id: string
  member_id: string
  amount: number
  source: string
  source_id: string | null
  description: string | null
  created_at: string
}

export interface MoneyTransaction {
  id: string
  member_id: string
  amount: number
  type: 'earned' | 'paid' | 'withdrawn' | 'redeemed'
  source: string
  source_id: string | null
  status: 'pending' | 'approved' | 'paid' | 'rejected'
  description: string | null
  created_at: string
}

export interface WithdrawalRequest {
  id: string
  member_id: string
  amount: number
  status: 'pending' | 'approved' | 'paid' | 'rejected'
  requested_at: string
  processed_by: string | null
  processed_at: string | null
}

export interface Gift {
  id: string
  family_id: string
  title: string
  description: string | null
  cost_xp: number
  cost_money: number | null
  image_url: string | null
  is_active: boolean
  created_by: string
  created_at: string
}

export interface GiftRedemption {
  id: string
  gift_id: string
  member_id: string
  redeemed_at: string
}

export interface AchievementDefinition {
  id: string
  title: string
  description: string
  icon: string
  requirement_type: string
  requirement_value: number
  created_at: string
}

export interface MemberAchievement {
  id: string
  member_id: string
  achievement_id: string
  earned_at: string
}

export interface QuranProgress {
  id: string
  member_id: string
  surah: number
  ayah: number
  completed_at: string
  created_at: string
}

export interface Story {
  id: string
  family_id: string
  title: string
  content: string
  moral_value: string | null
  reward_xp: number
  assigned_to: string | null
  is_preset: boolean
  is_active: boolean
  created_by: string | null
  created_at: string
}

export interface PresetStory {
  id: string
  title: string
  content: string
  moral_value: string
  category: string
  icon: string
  sort_order: number
  created_at: string
}
