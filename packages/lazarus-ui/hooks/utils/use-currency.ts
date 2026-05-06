'use client'
import { useEffect, useState } from 'react'

type Currency = {
  code: string
  symbol: string
  name: string
}

export const useCurrency = () => {
  const [currency, setCurrency] = useState<Currency>(() => {
    const cached = localStorage.getItem('user-currency')
    return cached
      ? JSON.parse(cached)
      : {
          code: 'USD',
          symbol: '$',
          name: 'US Dollar',
        }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [position, setPosition] = useState<GeolocationPosition | null>(null)

  const handleGeolocationError = (error: GeolocationPositionError) => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        setError('Location access denied. Please enable location services.')
        break
      case error.POSITION_UNAVAILABLE:
        setError('Location information unavailable. Please try again.')
        break
      case error.TIMEOUT:
        setError('Location request timed out. Please try again.')
        break
      default:
        setError('An unknown error occurred getting location.')
    }
    setLoading(false)
  }

  const handlePositionUpdate = async (position: GeolocationPosition) => {
    try {
      setPosition(position)
      const { countryCode: country, continentCode: continent } =
        await getCountryFromCoordinates(position.coords)
      const newCurrency = await getCurrencyForCountry(country, continent)

      if (newCurrency.code !== currency.code) {
        localStorage.setItem('user-currency', JSON.stringify(newCurrency))
        localStorage.setItem('user-currency-time', Date.now().toString())
        setCurrency(newCurrency)
      }
      setError(null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to determine currency',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let watchId: number

    if (navigator.geolocation) {
      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }

      watchId = navigator.geolocation.watchPosition(
        handlePositionUpdate,
        handleGeolocationError,
        options,
      )
    } else {
      setError('Geolocation is not supported by this browser')
      setLoading(false)
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [currency.code])

  const getCurrentLocation = () => {
    setLoading(true)
    setError(null)

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        handlePositionUpdate,
        handleGeolocationError,
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        },
      )
    } else {
      setError('Geolocation is not supported by this browser')
      setLoading(false)
    }
  }

  return {
    currency,
    loading,
    error,
    refresh: getCurrentLocation,
    position: position
      ? {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
      : null,
  }
}

const getCountryFromCoordinates = async (
  coords: GeolocationCoordinates,
): Promise<{ countryCode: string; continentCode: string }> => {
  const { latitude, longitude } = coords

  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
    )

    if (!response.ok) {
      throw new Error('Failed to get location data')
    }

    const data = await response.json()

    if (!data.countryCode) {
      throw new Error('No country code found for this location')
    }

    return {
      countryCode: data.countryCode.toUpperCase(),
      continentCode: data.continentCode.toUpperCase(),
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    throw new Error('Could not determine country from coordinates')
  }
}

const getCurrencyForCountry = async (
  countryCode: string,
  continentCode: string,
): Promise<Currency> => {
  const currencyMap: Record<string, Currency> = {
    US: { code: 'USD', symbol: '$', name: 'US Dollar' },
    EU: { code: 'EUR', symbol: '€', name: 'Euro' },
  }

  const currency = currencyMap[countryCode] || currencyMap[continentCode]
  if (!currency) {
    throw new Error(`Currency not found for country: ${countryCode}`)
  }

  return currency
}
