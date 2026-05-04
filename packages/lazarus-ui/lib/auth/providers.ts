import {
  RiAppleFill,
  RiDiscordFill,
  RiGoogleFill,
  RiLinkedinFill,
  RiMailSendLine,
  RiPhoneLine,
} from '@remixicon/react'

import { OptionItem } from '@/components/ui/option-list'

export type AuthProvider =
  | 'email'
  | 'phone'
  | 'apple'
  | 'google'
  | 'discord'
  | 'linkedin_oidc'

export const authProviderOptions: OptionItem<AuthProvider>[] = [
  {
    id: 'email',
    icon: RiMailSendLine,
    label: 'Continue with Email',
    description: 'Passwordless login via secure magic link',
  },
  {
    id: 'phone',
    icon: RiPhoneLine,
    label: 'Continue with Phone',
    description: 'Sign in with SMS verification code',
  },
  {
    id: 'apple',
    icon: RiAppleFill,
    label: 'Continue with Apple',
    description: 'Sign in securely with your Apple ID',
  },
  {
    id: 'google',
    icon: RiGoogleFill,
    label: 'Continue with Google',
    description: 'Sign in with your Google Account',
  },
  {
    id: 'discord',
    icon: RiDiscordFill,
    label: 'Continue with Discord',
    description: 'Sign in with your Discord Account',
  },
  {
    id: 'linkedin_oidc',
    icon: RiLinkedinFill,
    label: 'Continue with LinkedIn',
    description: 'Sign in with your LinkedIn Account',
  },
]
