import { generateItemId, Item } from './item'
import { PlanType } from './user-profile'

/**
 * Connected App Types
 */
export enum ConnectedAppType {
  GoogleDrive = 'google_drive',
  Gmail = 'gmail',
  Slack = 'slack',
  WhatsApp = 'whatsapp',
  iMessage = 'imessage',
  Phone = 'phone',
  Discord = 'discord',
  AppleCalendar = 'apple_calendar',
  iCloud = 'icloud',
  CustomAPI = 'custom_api',
  HubSpot = 'hubspot',
  Linear = 'linear',
  Dropbox = 'dropbox',
  OneDrive = 'one_drive',
  Jira = 'jira',
  Asana = 'asana',
  GitHub = 'github',
  Notion = 'notion',
  GoogleCalendar = 'google_calendar',
  Resend = 'resend',
  WordPress = 'wordpress',
  Reddit = 'reddit',
  Salesforce = 'salesforce',
}

/**
 * App model that extends the base Item interface
 * Matches the apps table structure in the database
 */
export interface App extends Item {
  type: 'app'
  available_app_id: string // Reference to available_apps.id
  app_type: ConnectedAppType | string
  config: Record<string, any>
  version?: string
  required_plan: PlanType
  is_connected: boolean
  is_connecting: boolean
  oauth_config: Record<string, any>
  connection_data: Record<string, any>
}

/**
 * Create a new App instance
 */
export function createApp(
  data: Partial<App> & {
    available_app_id?: string
    app_type?: ConnectedAppType | string
    required_plan?: PlanType
    is_connected?: boolean
    is_connecting?: boolean
    oauth_config?: Record<string, any>
    connection_data?: Record<string, any>
  },
): App {
  const id = data.id || `app_${generateItemId()}`
  const now = new Date().toISOString()

  return {
    id,
    type: 'app',
    name: data.name || `App ${id}`,
    workspaceId: data.workspaceId || '',
    available_app_id: data.available_app_id || '',
    app_type: data.app_type || ConnectedAppType.CustomAPI,
    config: data.config || {},
    version: data.version,
    required_plan: data.required_plan || PlanType.Free,
    is_connected: data.is_connected || false,
    is_connecting: data.is_connecting || false,
    oauth_config: data.oauth_config || {},
    connection_data: data.connection_data || {},
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    metadata: data.metadata || {},
    labels: data.labels || [],
    description: data.description || '',
  }
}

/**
 * Check if user can connect an app based on their plan
 */
export function canUserConnectApp(app: App, userPlan: PlanType): boolean {
  const planHierarchy = {
    [PlanType.Free]: 0,
    [PlanType.Plus]: 1,
    [PlanType.Business]: 2,
  }

  return planHierarchy[userPlan] >= planHierarchy[app.required_plan]
}

/**
 * Get icon type (component or remixicon) for an app
 */
export function getAppIconType(
  appType: ConnectedAppType,
): 'component' | 'remixicon' {
  const iconTypeMap: Record<string, 'component' | 'remixicon'> = {
    [ConnectedAppType.GoogleDrive]: 'component',
    [ConnectedAppType.Gmail]: 'component',
    [ConnectedAppType.Slack]: 'component',
    [ConnectedAppType.WhatsApp]: 'component',
    [ConnectedAppType.iMessage]: 'component',
    [ConnectedAppType.Phone]: 'component',
    [ConnectedAppType.Discord]: 'component',
    [ConnectedAppType.AppleCalendar]: 'component',
    [ConnectedAppType.iCloud]: 'component',
    [ConnectedAppType.CustomAPI]: 'remixicon',
    [ConnectedAppType.HubSpot]: 'component',
    [ConnectedAppType.Linear]: 'component',
    [ConnectedAppType.Dropbox]: 'component',
    [ConnectedAppType.OneDrive]: 'component',
    [ConnectedAppType.GitHub]: 'component',
    [ConnectedAppType.Notion]: 'component',
    [ConnectedAppType.GoogleCalendar]: 'component',
    // All others default to remixicon
  }

  return iconTypeMap[appType] || 'remixicon'
}

/**
 * Get icon path or icon class name for an app
 */
export function getAppIcon(appType: ConnectedAppType): string {
  const iconMap: Record<string, string> = {
    [ConnectedAppType.GoogleDrive]: '/icons/logos/drive-logo.svg',
    [ConnectedAppType.Gmail]: '/icons/logos/gmail-logo.svg',
    [ConnectedAppType.Slack]: '/icons/logos/slack-logo.svg',
    [ConnectedAppType.WhatsApp]: '/icons/logos/whatsapp-logo.svg',
    [ConnectedAppType.iMessage]: '/icons/logos/imessage-logo.svg',
    [ConnectedAppType.Phone]: '/icons/logos/phone-logo.svg',
    [ConnectedAppType.Discord]: '/icons/logos/discord-logo.svg',
    [ConnectedAppType.AppleCalendar]: '/icons/logos/apple-calendar-logo.svg',
    [ConnectedAppType.iCloud]: '/icons/logos/apple-icloud-logo.svg',
    [ConnectedAppType.CustomAPI]: '/icons/logos/apple-icloud-logo.svg',
    [ConnectedAppType.HubSpot]: '/icons/logos/hubspot-logo.svg',
    [ConnectedAppType.Linear]: '/icons/logos/linear-logo.svg',
    [ConnectedAppType.Dropbox]: '/icons/dropbox.svg',
    [ConnectedAppType.OneDrive]: '/icons/onedrive.svg',
    [ConnectedAppType.Jira]: 'ri-jira-line',
    [ConnectedAppType.Asana]: 'ri-checkbox-multiple-line',
    [ConnectedAppType.GitHub]: '/icons/github.svg',
    [ConnectedAppType.Notion]: '/icons/notion.svg',
    [ConnectedAppType.GoogleCalendar]: '/icons/logos/google-calendar.svg',
    [ConnectedAppType.Resend]: 'ri-send-plane-line',
    [ConnectedAppType.WordPress]: 'ri-wordpress-line',
    [ConnectedAppType.Reddit]: 'ri-reddit-line',
    [ConnectedAppType.Salesforce]: '/icons/logos/salesforce-logo.svg',
  }

  return iconMap[appType] || '/icons/workspace/other-icon.svg'
}

/**
 * Get icon color for an app
 */
export function getAppIconColor(appType: ConnectedAppType): string {
  const colorMap: Record<string, string> = {
    [ConnectedAppType.GoogleDrive]: 'text-[#4285F4]',
    [ConnectedAppType.Gmail]: 'text-[#EA4335]',
    [ConnectedAppType.Slack]: 'text-[#4A154B]',
    [ConnectedAppType.WhatsApp]: 'text-[#25D366]',
    [ConnectedAppType.iMessage]: 'text-[#34C759]',
    [ConnectedAppType.Phone]: 'text-[#0098FC]',
    [ConnectedAppType.Discord]: 'text-[#5865F2]',
    [ConnectedAppType.AppleCalendar]: 'text-[#FF3B30]',
    [ConnectedAppType.iCloud]: 'text-[#000000]',
    [ConnectedAppType.CustomAPI]: 'text-gray-700',
    [ConnectedAppType.HubSpot]: 'text-[#FF7A59]',
    [ConnectedAppType.Linear]: 'text-[#5E6AD2]',
    [ConnectedAppType.Dropbox]: 'text-[#0061FF]',
    [ConnectedAppType.OneDrive]: 'text-[#0078D4]',
    [ConnectedAppType.Jira]: 'text-[#0052CC]',
    [ConnectedAppType.Asana]: 'text-[#F06A6A]',
    [ConnectedAppType.GitHub]: 'text-[#24292E]',
    [ConnectedAppType.Notion]: 'text-[#000000]',
    [ConnectedAppType.GoogleCalendar]: 'text-[#4285F4]',
    [ConnectedAppType.Resend]: 'text-[#00A95C]',
    [ConnectedAppType.WordPress]: 'text-[#21759B]',
    [ConnectedAppType.Reddit]: 'text-[#FF4500]',
    [ConnectedAppType.Salesforce]: 'text-[#00A1E0]',
  }

  return colorMap[appType] || 'text-gray-600'
}

/**
 * Connect an app (mock implementation)
 */
export async function connectApp(app: App): Promise<App> {
  // Connecting to app

  // In a real implementation, this would call Supabase to update the app connection
  return {
    ...app,
    is_connected: true,
    is_connecting: false,
    connection_data: {
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    },
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Disconnect an app (mock implementation)
 */
export async function disconnectApp(app: App): Promise<App> {
  // Disconnecting from app

  // In a real implementation, this would call Supabase to update the app connection
  return {
    ...app,
    is_connected: false,
    is_connecting: false,
    connection_data: {},
    updatedAt: new Date().toISOString(),
  }
}
