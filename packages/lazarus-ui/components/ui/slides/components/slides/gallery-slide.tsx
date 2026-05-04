'use client'

import { GalleryImage, Slide } from '../../types'

interface GallerySlideProps {
  slide: Slide
  theme: any
}

export function GallerySlide({ slide, theme }: GallerySlideProps) {
  const { title, subtitle, images = [] } = slide

  if (!images || images.length === 0) {
    return (
      <div className='flex h-full items-center justify-center text-muted-foreground'>
        <p>No images provided</p>
      </div>
    )
  }

  // Determine layout based on number of images
  const layout = getGalleryLayout(images.length)

  return (
    <div
      className='flex h-full flex-col'
      style={{ padding: theme.spacing.slide.padding }}>
      {/* Header */}
      {(title || subtitle) && (
        <div className='mb-6'>
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

      {/* Gallery Grid */}
      <div className='flex flex-1 items-center'>
        <div
          className={`grid h-full w-full gap-4 ${layout.className}`}
          style={{ gridAutoRows: 'minmax(0, 1fr)' }}>
          {images.map((image, index) => (
            <GalleryItem
              key={index}
              image={image}
              theme={theme}
              isLarge={layout.largeIndices.includes(index)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function GalleryItem({
  image,
  theme,
  isLarge,
}: {
  image: GalleryImage
  theme: any
  isLarge?: boolean
}) {
  const { src, alt, caption, aspectRatio } = image

  return (
    <div
      className={`group relative overflow-hidden rounded-xl ${isLarge ? 'col-span-2 row-span-2' : ''} `}
      style={{
        backgroundColor:
          theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      }}>
      <img
        src={src}
        alt={alt}
        className='h-full w-full object-cover transition-transform duration-700 group-hover:scale-110'
        style={{ aspectRatio: aspectRatio || 'auto' }}
      />

      {caption && (
        <div className='absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100'>
          <p
            className='text-sm text-white'
            style={{ fontFamily: theme.typography.fontFamily.sans }}>
            {caption}
          </p>
        </div>
      )}
    </div>
  )
}

function getGalleryLayout(count: number): {
  className: string
  largeIndices: number[]
} {
  switch (count) {
    case 1:
      return { className: 'grid-cols-1', largeIndices: [] }
    case 2:
      return { className: 'grid-cols-2', largeIndices: [] }
    case 3:
      return { className: 'grid-cols-3', largeIndices: [] }
    case 4:
      return { className: 'grid-cols-2 grid-rows-2', largeIndices: [] }
    case 5:
      return { className: 'grid-cols-3 grid-rows-2', largeIndices: [0] }
    case 6:
      return { className: 'grid-cols-3 grid-rows-2', largeIndices: [] }
    case 7:
      return { className: 'grid-cols-4 grid-rows-2', largeIndices: [0] }
    case 8:
      return { className: 'grid-cols-4 grid-rows-2', largeIndices: [] }
    case 9:
      return { className: 'grid-cols-3 grid-rows-3', largeIndices: [] }
    default:
      return { className: 'grid-cols-4 grid-rows-3', largeIndices: [] }
  }
}
