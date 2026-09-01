'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CURRENCIES } from '@/lib/currency'

export function useFamilyCurrency() {
  const [currency, setCurrency] = useState<string>('KWD')
  const supabase = createClient()

  useEffect(() => {
    const fetchCurrency = async () => {
      const familyId = localStorage.getItem('family_id')
      if (!familyId) return

      const { data } = await supabase
        .from('families')
        .select('currency')
        .eq('id', familyId)
        .single()

      if (data?.currency) setCurrency(data.currency)
    }

    fetchCurrency()
  }, [])

  const symbol = CURRENCIES[currency]?.symbol || 'د.ك'
  const format = (amount: number) => `${amount} ${symbol}`

  return { currency, symbol, format }
}
