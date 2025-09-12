import { useQuery } from '@tanstack/react-query'

export type CurrencyCode = 'GBP'|'USD'|'EUR'|'CAD'

const API_KEY = (import.meta as any).env?.VITE_FREECURRENCY_API_KEY as string | undefined
const BASE_URL = 'https://api.freecurrencyapi.com/v1/latest'

export interface RatesResponse {
  data: Record<string, number>
}

async function fetchRates(base: CurrencyCode): Promise<Record<string, number>> {
  if (!API_KEY) {
    console.warn('[currency] Missing VITE_FREECURRENCY_API_KEY, skipping live rates')
    return {}
  }
  const url = `${BASE_URL}?apikey=${API_KEY}&base_currency=${base}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch currency rates')
  const json: RatesResponse = await res.json()
  return json.data
}

export function useRates(base: CurrencyCode) {
  return useQuery({
    queryKey: ['currency-rates', base],
    queryFn: () => fetchRates(base),
    staleTime: 1000 * 60 * 60 * 12, // 12 hours
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  })
}

export function convertAmount(amount: number, from: CurrencyCode, to: CurrencyCode, rates: Record<string, number> | undefined): number {
  if (!rates || from === to) return amount
  const upperFrom = from.toUpperCase()
  const upperTo = to.toUpperCase()
  const rateFrom = rates[upperFrom]
  const rateTo = rates[upperTo]
  // If both currency keys exist, use ratio which works regardless of base
  if (rateFrom != null && rateTo != null && rateFrom !== 0) {
    return amount * (rateTo / rateFrom)
  }
  // Fallbacks for partial availability
  if (rateTo === 1 && rateFrom != null && rateFrom !== 0) {
    // base is 'to'
    return amount / rateFrom
  }
  if (rateFrom === 1 && rateTo != null) {
    // base is 'from'
    return amount * rateTo
  }
  return amount
}


