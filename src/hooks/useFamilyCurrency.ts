'use client'

import { useState, useEffect } from 'react'
import { CURRENCIES } from '@/lib/currency'

export function useFamilyCurrency() {
  const [currency, setCurrency] = useState<string>('KWD')

  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        // Currency is family-private data — resolve it server-side
        // (the browser can no longer read `families` directly)
        const response = await fetch('/api/family/currency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        const data = await response.json()
        if (data?.success && data.currency) setCurrency(data.currency)
      } catch (err) {
        console.error('[GHRS FAMILY CURRENCY] Fetch error:', err)
      }
    }

    fetchCurrency()
  }, [])

  const symbol = CURRENCIES[currency]?.symbol || 'د.ك'
  const format = (amount: number) => `${amount} ${symbol}`

  return { currency, symbol, format }
}