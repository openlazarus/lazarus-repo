import _ from 'lodash'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

type QueryParams = Record<string, string | string[]>

const parseSearchParams = (searchParams: URLSearchParams): QueryParams => {
  const params: QueryParams = {}

  searchParams.forEach((value, key) => {
    if (params[key]) {
      if (Array.isArray(params[key])) {
        params[key] = [...params[key], value]
      } else {
        params[key] = [params[key] as string, value]
      }
    } else {
      params[key] = value
    }
  })

  return params
}

const stringifyQueryParams = (params: QueryParams): string => {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => searchParams.append(key, v))
    } else {
      searchParams.set(key, value as string)
    }
  })

  return searchParams.toString()
}

export const useQueryParams = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Initialize with current search params
  const [queryParams, setQueryParams] = useState<QueryParams>(() =>
    parseSearchParams(searchParams),
  )

  // Function to add new query params or update existing ones
  const addQueryParams = useCallback(
    (newParams: Partial<QueryParams>, options = { replace: false }) => {
      const updatedParams: QueryParams = { ...queryParams }

      Object.entries(newParams).forEach(([key, value]) => {
        updatedParams[key] = value ?? ''
      })

      setQueryParams(updatedParams)

      const queryString = stringifyQueryParams(updatedParams)
      const url = queryString ? `${pathname}?${queryString}` : pathname

      if (options.replace) {
        router.replace(url)
      } else {
        router.push(url)
      }
    },
    [queryParams, router, pathname],
  )

  const setQueryParamsFunction = useCallback(
    (newParams: Partial<QueryParams>, options = { replace: false }) => {
      const updatedParams: QueryParams = Object.fromEntries(
        Object.entries(newParams).filter(([_, v]) => v !== undefined),
      ) as QueryParams

      setQueryParams(updatedParams)

      const queryString = stringifyQueryParams(updatedParams)
      const url = queryString ? `${pathname}?${queryString}` : pathname

      if (options.replace) {
        router.replace(url)
      } else {
        router.push(url)
      }
    },
    [router, pathname],
  )

  const removeQueryParams = useCallback(
    (keys: string[], options = { replace: false }) => {
      const updatedParams = _.omit(queryParams, keys)
      setQueryParams(updatedParams)

      const queryString = stringifyQueryParams(updatedParams)
      const url = queryString ? `${pathname}?${queryString}` : pathname

      if (options.replace) {
        router.replace(url)
      } else {
        router.push(url)
      }
    },
    [queryParams, router, pathname],
  )

  // Update local state when URL changes
  useEffect(() => {
    const updatedParams = parseSearchParams(searchParams)
    setQueryParams(updatedParams)
  }, [searchParams])

  const parsedParams = useMemo(() => queryParams, [queryParams])

  return {
    queryParams: parsedParams,
    addQueryParams,
    setQueryParams: setQueryParamsFunction,
    removeQueryParams,
  }
}
