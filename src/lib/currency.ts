'use client'

export const CURRENCIES: Record<string, { name: string; symbol: string }> = {
  KWD: { name: 'الدينار الكويتي', symbol: 'د.ك' },
  SAR: { name: 'الريال السعودي', symbol: 'ر.س' },
  AED: { name: 'الدرهم الإماراتي', symbol: 'د.إ' },
  QAR: { name: 'الريال القطري', symbol: 'ر.ق' },
  BHD: { name: 'الدينار البحريني', symbol: 'د.ب' },
  OMR: { name: 'الريال العماني', symbol: 'ر.ع' },
}

export function formatMoney(amount: number | string, currencyCode: string = 'KWD'): string {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.KWD
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `${num.toFixed(3)} ${currency.symbol}`
}