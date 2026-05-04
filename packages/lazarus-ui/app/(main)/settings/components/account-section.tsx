'use client'

import * as m from 'motion/react-m'
import { useEffect, useRef, useState } from 'react'

import { AvatarUpload } from '@/components/ui/avatar-upload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Spinner from '@/components/ui/spinner'
import { useAuth } from '@/hooks/auth/use-auth'
import { useProfile } from '@/hooks/auth/use-profile'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'
import { ContactVerificationSection } from './contact-verification-section'

export const AccountSection = () => {
  const { isDark } = useTheme()
  const { profile, refetchProfile } = useAuth()
  const { updateProfile } = useProfile()

  // Profile state (avatar is handled separately by AvatarUpload component)
  const [profileData, setProfileData] = useState({
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
  })

  // Track the last saved state to compare against
  const savedDataRef = useRef({
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
  })

  const [isSaving, setIsSaving] = useState(false)

  // Sync with profile changes
  useEffect(() => {
    if (profile) {
      const newData = {
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
      }
      setProfileData(newData)
      savedDataRef.current = newData
    }
  }, [profile])

  // Guard clause: don't render if user is not loaded
  if (!profile) {
    return (
      <div className='flex items-center justify-center py-12'>
        <Spinner size='sm' />
      </div>
    )
  }

  // Check if there are unsaved changes (compare against last saved state)
  const hasUnsavedChanges =
    profileData.firstName !== savedDataRef.current.firstName ||
    profileData.lastName !== savedDataRef.current.lastName

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateProfile({
        first_name: profileData.firstName,
        last_name: profileData.lastName,
      })
      // Update saved state to match current data
      savedDataRef.current = { ...profileData }
    } catch (error) {
      console.error('Failed to save profile:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset to last saved state
    setProfileData({ ...savedDataRef.current })
  }

  const displayName =
    profileData.firstName || profileData.lastName
      ? `${profileData.firstName} ${profileData.lastName}`.trim()
      : profile?.email?.charAt(0).toUpperCase() || '?'

  return (
    <m.div
      className='w-full'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}>
      {/* Save/Cancel buttons - Floating */}
      {hasUnsavedChanges && (
        <m.div
          className='fixed right-6 top-[76px] z-50 flex gap-2'
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}>
          <Button
            onClick={handleCancel}
            variant='secondary'
            size='small'
            shape='rounded'>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant='active'
            size='small'
            shape='rounded'
            loading={isSaving}>
            Save
          </Button>
        </m.div>
      )}

      {/* Main Content Area */}
      <div className='flex min-h-[calc(100vh-200px)] flex-col'>
        {/* Profile Information Section */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}>
          <h3
            className={cn(
              'mb-6 text-[13px] font-semibold uppercase tracking-wider',
              isDark ? 'text-foreground/60' : 'text-[#666666]',
            )}>
            Profile Information
          </h3>

          <div className='flex items-start gap-8'>
            {/* Avatar Section */}
            <div className='flex flex-col items-center gap-3'>
              <AvatarUpload
                src={
                  profile?.avatar && profile.avatar.trim() !== ''
                    ? profile.avatar
                    : '/avatars/blank-avatar.png'
                }
                fallback={displayName.charAt(0)}
                isDark={isDark}
                editable={true}
                size='lg'
                onAvatarChange={async (imageUrl) => {
                  // Trigger a refetch of the profile to update everywhere
                  if (refetchProfile) {
                    await refetchProfile()
                  }
                }}
              />
              <p
                className={cn(
                  'text-[11px]',
                  isDark ? 'text-foreground/50' : 'text-[#999999]',
                )}>
                Click to upload
              </p>
            </div>

            {/* Form Section */}
            <div className='flex max-w-[600px] flex-1 flex-col gap-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label
                    className={cn(
                      'mb-2 block text-[11px] font-medium uppercase tracking-wider',
                      isDark ? 'text-foreground/50' : 'text-[#999999]',
                    )}>
                    First name
                  </label>
                  <Input
                    placeholder='John'
                    value={profileData.firstName}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        firstName: e.target.value,
                      })
                    }
                    variant='surface'
                    isDark={isDark}
                    size='large'
                  />
                </div>
                <div>
                  <label
                    className={cn(
                      'mb-2 block text-[11px] font-medium uppercase tracking-wider',
                      isDark ? 'text-foreground/50' : 'text-[#999999]',
                    )}>
                    Last name
                  </label>
                  <Input
                    placeholder='Doe'
                    value={profileData.lastName}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        lastName: e.target.value,
                      })
                    }
                    variant='surface'
                    isDark={isDark}
                    size='large'
                  />
                </div>
              </div>
            </div>
          </div>
        </m.div>

        {/* Contact Verification (add email for phone users, add phone for email users) */}
        <ContactVerificationSection profile={profile} />

        {/* Spacer to push danger zone to bottom */}
        <div className='flex-1' />

        {/* Danger Zone - At the bottom with minimal styling */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className='mt-24 border-t pt-8'
          style={{
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          }}>
          <h3
            className={cn(
              'mb-4 text-[13px] font-semibold uppercase tracking-wider',
              isDark ? 'text-foreground/60' : 'text-[#666666]',
            )}>
            Danger Zone
          </h3>
          <div className='flex max-w-[600px] items-center justify-between'>
            <div>
              <p
                className={cn(
                  'text-[14px] font-medium',
                  isDark ? 'text-foreground' : 'text-[#1a1a1a]',
                )}>
                Delete account
              </p>
              <p
                className={cn(
                  'text-[12px]',
                  isDark ? 'text-foreground/50' : 'text-[#999999]',
                )}>
                This action cannot be undone
              </p>
            </div>
            <Button variant='destructive' size='small'>
              Delete
            </Button>
          </div>
        </m.div>
      </div>
    </m.div>
  )
}
