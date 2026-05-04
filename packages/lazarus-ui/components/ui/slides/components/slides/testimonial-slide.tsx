'use client'

import { Slide, Testimonial } from '../../types'

interface TestimonialSlideProps {
  slide: Slide
  theme: any
}

export function TestimonialSlide({ slide, theme }: TestimonialSlideProps) {
  const { title, subtitle, testimonials = [] } = slide

  if (!testimonials || testimonials.length === 0) {
    return (
      <div className='flex h-full items-center justify-center text-muted-foreground'>
        <p>No testimonials provided</p>
      </div>
    )
  }

  // Single testimonial gets special treatment
  const isSingle = testimonials.length === 1

  return (
    <div
      className='flex h-full flex-col'
      style={{ padding: theme.spacing.slide.padding }}>
      {/* Header */}
      {!isSingle && (title || subtitle) && (
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

      {/* Testimonials */}
      <div className='flex flex-1 items-center'>
        {isSingle ? (
          <SingleTestimonial testimonial={testimonials[0]} theme={theme} />
        ) : (
          <MultipleTestimonials testimonials={testimonials} theme={theme} />
        )}
      </div>
    </div>
  )
}

function SingleTestimonial({
  testimonial,
  theme,
}: {
  testimonial: Testimonial
  theme: any
}) {
  const { quote, author, role, company, image, rating } = testimonial

  return (
    <div className='mx-auto w-full max-w-4xl text-center'>
      {/* Quote Icon */}
      <div
        className='mb-8 text-6xl opacity-20'
        style={{ color: theme.colors.primary }}>
        "
      </div>

      {/* Quote */}
      <blockquote
        className='mb-8 text-2xl leading-relaxed md:text-3xl'
        style={{
          fontFamily: theme.typography.fontFamily.sans,
          color: theme.colors.text,
          fontWeight: theme.typography.fontWeight.medium,
        }}>
        {quote}
      </blockquote>

      {/* Rating */}
      {rating && (
        <div className='mb-6 flex justify-center gap-1'>
          {[...Array(5)].map((_, i) => (
            <span
              key={i}
              className='text-2xl'
              style={{
                color: i < rating ? '#facc15' : theme.colors.border,
              }}>
              ★
            </span>
          ))}
        </div>
      )}

      {/* Author */}
      <div className='flex items-center justify-center gap-4'>
        {image && (
          <img
            src={image}
            alt={author}
            className='h-16 w-16 rounded-full object-cover'
            style={{ border: `2px solid ${theme.colors.border}` }}
          />
        )}
        <div className='text-left'>
          <p
            className='text-lg font-semibold'
            style={{
              color: theme.colors.text,
              fontFamily: theme.typography.fontFamily.sans,
            }}>
            {author}
          </p>
          {(role || company) && (
            <p className='text-sm' style={{ color: theme.colors.muted }}>
              {role}
              {role && company && ' at '}
              {company}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function MultipleTestimonials({
  testimonials,
  theme,
}: {
  testimonials: Testimonial[]
  theme: any
}) {
  const gridCols = testimonials.length === 2 ? 2 : 3

  return (
    <div
      className={`grid w-full gap-6 ${gridCols === 2 ? 'grid-cols-2' : 'grid-cols-3'} `}>
      {testimonials.map((testimonial, index) => (
        <TestimonialCard key={index} testimonial={testimonial} theme={theme} />
      ))}
    </div>
  )
}

function TestimonialCard({
  testimonial,
  theme,
}: {
  testimonial: Testimonial
  theme: any
}) {
  const { quote, author, role, company, image, rating } = testimonial

  return (
    <div
      className='flex flex-col rounded-2xl p-6'
      style={{
        backgroundColor:
          theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        border: `1px solid ${theme.colors.border}`,
      }}>
      {/* Rating */}
      {rating && (
        <div className='mb-4 flex gap-0.5'>
          {[...Array(5)].map((_, i) => (
            <span
              key={i}
              className='text-sm'
              style={{
                color: i < rating ? '#facc15' : theme.colors.border,
              }}>
              ★
            </span>
          ))}
        </div>
      )}

      {/* Quote */}
      <blockquote
        className='mb-6 flex-1 text-base'
        style={{
          fontFamily: theme.typography.fontFamily.sans,
          color: theme.colors.text,
        }}>
        "{quote}"
      </blockquote>

      {/* Author */}
      <div className='flex items-center gap-3'>
        {image && (
          <img
            src={image}
            alt={author}
            className='h-10 w-10 rounded-full object-cover'
            style={{ border: `1px solid ${theme.colors.border}` }}
          />
        )}
        <div>
          <p
            className='text-sm font-semibold'
            style={{
              color: theme.colors.text,
              fontFamily: theme.typography.fontFamily.sans,
            }}>
            {author}
          </p>
          {(role || company) && (
            <p className='text-xs' style={{ color: theme.colors.muted }}>
              {role}
              {role && company && ' · '}
              {company}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
