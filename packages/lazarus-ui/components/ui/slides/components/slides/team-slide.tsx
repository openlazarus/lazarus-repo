'use client'

import { Slide, TeamMember } from '../../types'

interface TeamSlideProps {
  slide: Slide
  theme: any
}

export function TeamSlide({ slide, theme }: TeamSlideProps) {
  const { title, subtitle, members = [] } = slide

  if (!members || members.length === 0) {
    return (
      <div className='flex h-full items-center justify-center text-muted-foreground'>
        <p>No team members provided</p>
      </div>
    )
  }

  // Determine grid layout
  const gridCols =
    members.length <= 3
      ? members.length
      : members.length === 4
        ? 2
        : members.length <= 6
          ? 3
          : 4

  return (
    <div
      className='flex h-full flex-col'
      style={{ padding: theme.spacing.slide.padding }}>
      {/* Header */}
      {(title || subtitle) && (
        <div className='mb-8'>
          {title && (
            <h2
              className='mb-3 text-4xl font-semibold'
              style={{
                fontFamily: theme.typography.fontFamily.sans,
                color: theme.colors.text,
              }}>
              {title}
            </h2>
          )}
          {subtitle && (
            <p
              className='text-xl opacity-80'
              style={{
                fontFamily: theme.typography.fontFamily.sans,
                color: theme.colors.muted,
              }}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Team Grid */}
      <div className='flex flex-1 items-center'>
        <div
          className={`grid w-full gap-6 ${gridCols === 1 ? 'grid-cols-1' : ''} ${gridCols === 2 ? 'grid-cols-2' : ''} ${gridCols === 3 ? 'grid-cols-3' : ''} ${gridCols === 4 ? 'grid-cols-4' : ''} `}>
          {members.map((member, index) => (
            <MemberCard key={index} member={member} theme={theme} />
          ))}
        </div>
      </div>
    </div>
  )
}

function MemberCard({ member, theme }: { member: TeamMember; theme: any }) {
  const { name, role, image, bio, social } = member

  return (
    <div
      className='flex flex-col items-center rounded-2xl p-4 text-center transition-all duration-300 hover:scale-105'
      style={{
        backgroundColor:
          theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      }}>
      {/* Avatar */}
      <div
        className='mb-4 h-24 w-24 overflow-hidden rounded-full'
        style={{
          backgroundColor: theme.colors.primary + '20',
          border: `2px solid ${theme.colors.border}`,
        }}>
        {image ? (
          <img src={image} alt={name} className='h-full w-full object-cover' />
        ) : (
          <div className='flex h-full w-full items-center justify-center'>
            <span
              className='text-3xl font-bold'
              style={{ color: theme.colors.primary }}>
              {name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Name */}
      <h3
        className='mb-1 text-lg font-semibold'
        style={{
          color: theme.colors.text,
          fontFamily: theme.typography.fontFamily.sans,
        }}>
        {name}
      </h3>

      {/* Role */}
      <p
        className='mb-3 text-sm font-medium'
        style={{ color: theme.colors.primary }}>
        {role}
      </p>

      {/* Bio */}
      {bio && (
        <p
          className='mb-3 line-clamp-3 text-sm opacity-80'
          style={{ color: theme.colors.muted }}>
          {bio}
        </p>
      )}

      {/* Social Links */}
      {social && (
        <div className='mt-auto flex gap-3'>
          {social.linkedin && (
            <a
              href={social.linkedin}
              target='_blank'
              rel='noopener noreferrer'
              className='text-sm hover:opacity-80'
              style={{ color: theme.colors.primary }}>
              LinkedIn
            </a>
          )}
          {social.twitter && (
            <a
              href={social.twitter}
              target='_blank'
              rel='noopener noreferrer'
              className='text-sm hover:opacity-80'
              style={{ color: theme.colors.primary }}>
              Twitter
            </a>
          )}
          {social.email && (
            <a
              href={`mailto:${social.email}`}
              className='text-sm hover:opacity-80'
              style={{ color: theme.colors.primary }}>
              Email
            </a>
          )}
        </div>
      )}
    </div>
  )
}
