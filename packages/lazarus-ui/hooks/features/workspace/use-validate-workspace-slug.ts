import { useSupabaseQuery } from '@/hooks/data/use-supabase-query'

interface UseValidateWorkspaceSlugResult {
  validationError: string | null
  isValidating: boolean
  isValid: boolean
}

export const useValidateWorkspaceSlug = (
  slug: string,
  currentSlug?: string,
): UseValidateWorkspaceSlugResult => {
  const {
    data: slugExists,
    loading: isValidating,
    error: queryError,
  } = useSupabaseQuery<boolean>(
    (supabase) => {
      const sanitizedSlug = slug.trim().toLowerCase()
      return supabase.rpc('check_workspace_slug_exists', {
        slug_to_check: sanitizedSlug,
      })
    },
    {
      enabled: !!slug && slug.trim().length >= 3 && slug !== currentSlug,
      deps: [slug],
    },
  )

  if (!slug.trim()) {
    return {
      validationError: null,
      isValidating: false,
      isValid: false,
    }
  }

  if (slug.length < 3) {
    return {
      validationError: 'Slug must be at least 3 characters long',
      isValidating: false,
      isValid: false,
    }
  }

  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '')
  if (cleanSlug !== slug) {
    return {
      validationError: 'Only letters, numbers, and hyphens are allowed',
      isValidating: false,
      isValid: false,
    }
  }

  if (currentSlug && slug === currentSlug) {
    return {
      validationError: null,
      isValidating: false,
      isValid: true,
    }
  }

  if (queryError) {
    console.error('Query error:', queryError)
    return {
      validationError: 'Error checking slug availability',
      isValidating,
      isValid: false,
    }
  }

  if (slugExists) {
    return {
      validationError: `The slug "${slug}" already exists. Please choose a different one.`,
      isValidating,
      isValid: false,
    }
  }

  return {
    validationError: null,
    isValidating,
    isValid: true,
  }
}
