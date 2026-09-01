'use client'

import { createClient } from '@/lib/supabase/client'

export const CURRENCIES: Record<string, { name: string; symbol: string }> = {
  KWD: { name: 'الدينار الكويتي', symbol: 'د.ك' },
  SAR: { name: 'الريال السعودي', symbol: 'ر.س' },
  AED: { name: 'الدرهم الإماراتي', symbol: 'د.إ' },
  QAR: { name: 'الريال القطري', symbol: 'ر.ق' },
  BHD: { name: 'الدينار البحريني', symbol: 'د.ب' },
  OMR: { name: 'الريال العماني', symbol: 'ر.ع' },
}

export async function getFamilyCurrency(familyId: string): Promise<string> {
  const supabase = createClient()
  const { data } = await supabase
    .from('families')
    .select('currency')
    .eq('id', familyId)
    .single()

  return data?.currency || 'KWD'
}

export function formatMoney(amount: number, currencyCode: string = 'KWD'): string {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.KWD
  return `${amount} ${currency.symbol}`
}
