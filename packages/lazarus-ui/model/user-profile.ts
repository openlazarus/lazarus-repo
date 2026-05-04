// User profile model for Lazarus

/**
 * Subscription plan types based on database schema
 */
export enum PlanType {
  Free = 'FREE',
  Plus = 'PLUS',
  Business = 'BUSINESS',
}

/**
 * User profile interface matching the database profiles table
 */
export interface UserProfile {
  id: string // UUID in database
  email: string
  first_name: string | null
  last_name: string | null
  birthdate?: Date | null
  last_sign_in_at?: Date | null
  preferences: UserPreferences
  stripe_customer_id?: string | null
  avatar?: string | null

  // Plan and subscription fields
  plan: PlanType

  // Storage management
  storage_bucket_name?: string | null
  storage_quota_mb: number // 3072 (3GB) for FREE, -1 for unlimited
  storage_used_mb: number
  upload_email?: string | null // Email for file uploads via email

  // Usage limits
  monthly_chat_limit: number // 500 for FREE, -1 for unlimited
  monthly_chats_used: number
  connected_apps_limit: number // 3 for FREE, -1 for unlimited
  connected_apps_count: number

  // Phone & email verification
  phone_number?: string | null
  email_verified?: boolean

  // Waitlist management
  still_on_waitlist?: boolean // Indicates if user is still on the waitlist

  // Timestamps
  created_at: Date | string
  updated_at: Date | string
}

/**
 * User preferences interface (stored as JSONB in database)
 */
export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  fontSize?: number
  autoSave?: boolean
  notificationsEnabled?: boolean
  language?: string
  customSettings?: Record<string, any>
}

/**
 * Plan quotas and limits configuration
 */
export const PLAN_LIMITS = {
  [PlanType.Free]: {
    storage_quota_mb: 3072, // 3GB
    monthly_chat_limit: 500,
    connected_apps_limit: 3,
  },
  [PlanType.Plus]: {
    storage_quota_mb: -1, // Unlimited
    monthly_chat_limit: -1, // Unlimited
    connected_apps_limit: -1, // Unlimited
  },
  [PlanType.Business]: {
    storage_quota_mb: -1, // Unlimited
    monthly_chat_limit: -1, // Unlimited
    connected_apps_limit: -1, // Unlimited
  },
}

/**
 * Check if a user has reached their storage quota
 */
export function hasReachedStorageQuota(profile: UserProfile): boolean {
  if (profile.storage_quota_mb === -1) return false // Unlimited
  return profile.storage_used_mb >= profile.storage_quota_mb
}

/**
 * Check if a user has reached their monthly chat limit
 */
export function hasReachedChatLimit(profile: UserProfile): boolean {
  if (profile.monthly_chat_limit === -1) return false // Unlimited
  return profile.monthly_chats_used >= profile.monthly_chat_limit
}

/**
 * Check if a user has reached their connected apps limit
 */
export function hasReachedAppsLimit(profile: UserProfile): boolean {
  if (profile.connected_apps_limit === -1) return false // Unlimited
  return profile.connected_apps_count >= profile.connected_apps_limit
}

/**
 * Get remaining storage in MB
 */
export function getRemainingStorageMB(profile: UserProfile): number {
  if (profile.storage_quota_mb === -1) return -1 // Unlimited
  return Math.max(0, profile.storage_quota_mb - profile.storage_used_mb)
}

/**
 * Create a new user profile with default values
 */
export function createUserProfile(
  data: Partial<UserProfile> = {},
): UserProfile {
  const now = new Date().toISOString()
  const plan = data.plan || PlanType.Free
  const limits = PLAN_LIMITS[plan]

  return {
    id: data.id || 'local-user',
    email: data.email || '',
    first_name: data.first_name || null,
    last_name: data.last_name || null,
    birthdate: data.birthdate || null,
    last_sign_in_at: data.last_sign_in_at || null,
    preferences: data.preferences || createUserPreferences(),
    stripe_customer_id: data.stripe_customer_id || null,
    avatar: data.avatar || null,
    plan,
    storage_bucket_name: data.storage_bucket_name || null,
    storage_quota_mb: data.storage_quota_mb ?? limits.storage_quota_mb,
    storage_used_mb: data.storage_used_mb || 0,
    upload_email: data.upload_email || null,
    monthly_chat_limit: data.monthly_chat_limit ?? limits.monthly_chat_limit,
    monthly_chats_used: data.monthly_chats_used || 0,
    connected_apps_limit:
      data.connected_apps_limit ?? limits.connected_apps_limit,
    connected_apps_count: data.connected_apps_count || 0,
    phone_number: data.phone_number || null,
    email_verified: data.email_verified ?? true,
    still_on_waitlist: data.still_on_waitlist ?? true,
    created_at: data.created_at || now,
    updated_at: data.updated_at || now,
  }
}

/**
 * Create default user preferences
 */
export function createUserPreferences(
  data: Partial<UserPreferences> = {},
): UserPreferences {
  return {
    theme: data.theme || 'system',
    fontSize: data.fontSize || 14,
    autoSave: data.autoSave !== undefined ? data.autoSave : true,
    notificationsEnabled:
      data.notificationsEnabled !== undefined
        ? data.notificationsEnabled
        : true,
    language: data.language || 'en',
    customSettings: data.customSettings || {},
  }
}
