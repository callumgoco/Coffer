export interface MarketDataProvider {
  getQuote(symbol: string): Promise<{ symbol: string; price: number; source: 'live' | 'mock'; error?: string }>
  searchSymbols(keywords: string): Promise<{ results: Array<{ symbol: string; name: string; region: string; currency?: string }>; rateLimited?: boolean; error?: string }>
  getDailySeries(symbol: string, rangeDays: number): Promise<Array<{ date: string; close: number }>>
}

const avKey: string | undefined = import.meta.env.VITE_ALPHAVANTAGE_API_KEY
const fmpKey: string | undefined = import.meta.env.VITE_FMP_API_KEY

export class AlphaVantageProvider implements MarketDataProvider {
  async getQuote(symbol: string) {
    if (!avKey) return { symbol, price: 0, source: 'mock', error: 'missing_api_key' }
    try {
      const base = import.meta.env.DEV ? '/api' : 'https://www.alphavantage.co'
      const url = `${base}/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(avKey)}&datatype=json`
      console.debug('[AlphaVantage] GET', url)
      const res = await fetch(url)
      const json = await res.json()
      if (json?.Note || json?.Information) {
        console.debug('[AlphaVantage] Rate limited / info:', json.Note || json.Information)
        return { symbol, price: 0, source: 'mock', error: 'rate_limited' }
      }
      if (json?.['Error Message']) {
        console.debug('[AlphaVantage] Error Message:', json['Error Message'])
        return { symbol, price: 0, source: 'mock', error: 'error_message' }
      }
      const price = Number(json?.['Global Quote']?.['05. price'] ?? 0)
      return { symbol, price, source: 'live' }
    } catch (e) {
      console.debug('[AlphaVantage] fetch failed', e)
      return { symbol, price: 0, source: 'mock', error: 'failed to fetch' }
    }
  }

  async searchSymbols(keywords: string) {
    const trimmed = keywords.trim()
    if (!trimmed) return { results: [] }
    if (!avKey) return { results: [], error: 'missing_api_key' }
    try {
      const base = import.meta.env.DEV ? '/api' : 'https://www.alphavantage.co'
      const url = `${base}/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(trimmed)}&apikey=${encodeURIComponent(avKey)}&datatype=json`
      console.debug('[AlphaVantage] SEARCH', url)
      const res = await fetch(url)
      const json = await res.json()
      if (json?.Note || json?.Information) {
        console.debug('[AlphaVantage] Rate limited / info:', json.Note || json.Information)
        return { results: [], rateLimited: true, error: 'rate_limited' }
      }
      if (json?.['Error Message']) {
        console.debug('[AlphaVantage] Error Message:', json['Error Message'])
        return { results: [], error: 'error_message' }
      }
      const matches: any[] = json?.bestMatches ?? []
      const results = matches
        .map(m => ({
          symbol: m?.['1. symbol'] as string,
          name: m?.['2. name'] as string,
          region: m?.['4. region'] as string,
          currency: m?.['8. currency'] as string,
        }))
      console.debug('[AlphaVantage] Results count:', results.length)
      return { results }
    } catch (e) {
      console.debug('[AlphaVantage] search failed', e)
      return { results: [], error: 'network_error' }
    }
  }

  async getDailySeries(symbol: string, rangeDays: number): Promise<Array<{ date: string; close: number }>> {
    if (!avKey) return []
    try {
      const base = import.meta.env.DEV ? '/api' : 'https://www.alphavantage.co'
      // Use ADJUSTED to include splits/dividends; fallback fields handled below
      const outputsize = rangeDays > 100 ? 'full' : 'compact'
      const url = `${base}/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(avKey)}&datatype=json&outputsize=${outputsize}`
      console.debug('[AlphaVantage] SERIES', url)
      const res = await fetch(url)
      const json = await res.json()
      if (json?.Note || json?.Information) {
        console.debug('[AlphaVantage] Series rate limited/info:', json.Note || json.Information)
        return []
      }
      if (json?.['Error Message']) {
        console.debug('[AlphaVantage] Series Error Message:', json['Error Message'])
        return []
      }
      const seriesObj = json?.['Time Series (Daily)'] || json?.['Time Series (Daily)'] || {}
      const points: Array<{ date: string; close: number }> = Object.entries(seriesObj).map(([date, v]: any) => {
        const close = Number(v?.['5. adjusted close'] ?? v?.['4. close'] ?? v?.['4. close'] ?? 0)
        return { date, close }
      })
      // Sort ascending by date and limit to the requested window
      points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      if (points.length === 0) return []
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - (rangeDays + 3))
      const cutoffStr = cutoff.toISOString().slice(0, 10)
      return points.filter(p => p.date >= cutoffStr)
    } catch (e) {
      console.debug('[AlphaVantage] series failed', e)
      return []
    }
  }
}

export const alphaVantage = new AlphaVantageProvider()

// Simple in-memory caches
const quoteCache = new Map<string, { price: number; ts: number }>()
const searchCache = new Map<string, { results: Array<{ symbol: string; name: string; region: string; currency?: string }>; ts: number }>()

// Cache for historical series: key = `${symbol}|${days}`
const seriesCache = new Map<string, { points: Array<{ date: string; close: number }>; ts: number }>()

export class FmpProvider implements MarketDataProvider {
  async getQuote(symbol: string) {
    const key = symbol.toUpperCase()
    const now = Date.now()
    const cached = quoteCache.get(key)
    if (cached && now - cached.ts < 60_000) {
      return { symbol, price: cached.price, source: 'live' }
    }
    if (!fmpKey) return { symbol, price: 0, source: 'mock', error: 'missing_api_key' }
    try {
      const base = import.meta.env.DEV ? '/fmp' : 'https://financialmodelingprep.com'
      // Stable quote endpoint
      const url = `${base}/stable/quote?symbol=${encodeURIComponent(key)}&apikey=${encodeURIComponent(fmpKey)}`
      console.debug('[FMP] GET', url)
      const res = await fetch(url)
      const json = await res.json()
      const price = Number(json?.[0]?.price ?? json?.[0]?.c ?? json?.price ?? 0)
      if (!Number.isFinite(price)) {
        return { symbol, price: 0, source: 'mock', error: 'no_price' }
      }
      quoteCache.set(key, { price, ts: now })
      return { symbol, price, source: 'live' }
    } catch (e) {
      console.debug('[FMP] fetch failed', e)
      return { symbol, price: 0, source: 'mock', error: 'failed to fetch' }
    }
  }

  async searchSymbols(keywords: string) {
    const trimmed = keywords.trim()
    if (!trimmed) return { results: [] }
    const q = trimmed.toUpperCase()
    const now = Date.now()
    const cached = searchCache.get(q)
    if (cached && now - cached.ts < 5 * 60_000) {
      return { results: cached.results }
    }
    if (!fmpKey) return { results: [], error: 'missing_api_key' }
    try {
      const base = import.meta.env.DEV ? '/fmp' : 'https://financialmodelingprep.com'
      const endpoints = [
        `${base}/stable/search-symbol?query=${encodeURIComponent(trimmed)}&apikey=${encodeURIComponent(fmpKey)}`,
        `${base}/stable/search-name?query=${encodeURIComponent(trimmed)}&apikey=${encodeURIComponent(fmpKey)}`,
      ]

      for (const url of endpoints) {
        console.debug('[FMP] SEARCH', url)
        try {
          const res = await fetch(url)
          const json = await res.json()
          if (!Array.isArray(json)) {
            console.debug('[FMP] search non-array payload', json)
            continue
          }
          const results = json.map((m: any) => ({
            symbol: (m?.symbol ?? m?.ticker) as string,
            name: (m?.name ?? m?.companyName ?? m?.fullName) as string,
            region: (m?.exchangeShortName ?? m?.exchange ?? m?.stockExchangeShortName ?? '') as string,
            currency: (m?.currency || undefined) as string | undefined,
          }))
          searchCache.set(q, { results, ts: now })
          return { results }
        } catch (inner) {
          console.debug('[FMP] search attempt failed', inner)
          continue
        }
      }
      // Fallback: fetch the full tradable list once and filter client-side
      const fmpBase = import.meta.env.DEV ? '/fmp' : 'https://financialmodelingprep.com'
      const listKey = 'fmp_symbol_list_v1'
      let list: any[] | null = null
      try {
        const cached = typeof localStorage !== 'undefined' ? localStorage.getItem(listKey) : null
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed?.data) && typeof parsed?.ts === 'number' && (now - parsed.ts) < 24 * 60 * 60 * 1000) {
            list = parsed.data
          }
        }
      } catch {}
      if (!list) {
        const fallbacks = [
          `${fmpBase}/stable/stock-list?apikey=${encodeURIComponent(fmpKey)}`,
        ]
        for (const url of fallbacks) {
          console.debug('[FMP] LOAD LIST', url)
          try {
            const res = await fetch(url)
            const json = await res.json()
            if (Array.isArray(json)) {
              list = json
              try { if (typeof localStorage !== 'undefined') localStorage.setItem(listKey, JSON.stringify({ ts: now, data: list })) } catch {}
              break
            } else {
              console.debug('[FMP] list non-array payload', json)
            }
          } catch (e) {
            console.debug('[FMP] load list failed', e)
            continue
          }
        }
      }
      if (Array.isArray(list)) {
        const qLower = trimmed.toLowerCase()
        const qUpper = trimmed.toUpperCase()
        const results = list
          .map((m: any) => ({
            symbol: (m?.symbol ?? m?.ticker) as string,
            name: (m?.name ?? m?.companyName ?? m?.fullName ?? '') as string,
            region: (m?.exchangeShortName ?? m?.exchange ?? m?.stockExchangeShortName ?? '') as string,
            currency: (m?.currency || undefined) as string | undefined,
          }))
          .filter(r => r.symbol?.startsWith(qUpper) || (r.name?.toLowerCase() ?? '').includes(qLower))
          .slice(0, 10)
        searchCache.set(q, { results, ts: now })
        return { results }
      }
      return { results: [], error: 'provider_error' }
    } catch (e) {
      console.debug('[FMP] search failed', e)
      return { results: [], error: 'network_error' }
    }
  }

  async getDailySeries(symbol: string, rangeDays: number): Promise<Array<{ date: string; close: number }>> {
    const key = `${symbol.toUpperCase()}|${rangeDays}`
    const now = Date.now()
    const cached = seriesCache.get(key)
    if (cached && now - cached.ts < 10 * 60_000) {
      return cached.points
    }
    if (!fmpKey) return []
    const base = import.meta.env.DEV ? '/fmp' : 'https://financialmodelingprep.com'
    try {
      // Prefer stable historical-price-full with timeseries param to limit payload
      const url1 = `${base}/stable/historical-price-full/${encodeURIComponent(symbol)}?serietype=line&timeseries=${Math.max(rangeDays + 5, 30)}&apikey=${encodeURIComponent(fmpKey)}`
      console.debug('[FMP] SERIES', url1)
      const res1 = await fetch(url1)
      const json1 = await res1.json()
      let points: Array<{ date: string; close: number }> = []
      const historical = (json1?.historical ?? json1?.historicalStockList?.[0]?.historical)
      if (Array.isArray(historical)) {
        points = historical.map((h: any) => ({ date: String(h?.date), close: Number(h?.close ?? h?.adjClose ?? h?.price ?? 0) }))
      }
      if (points.length === 0) {
        // Fallback to historical-chart daily with date range
        const to = new Date()
        const from = new Date()
        from.setDate(to.getDate() - (rangeDays + 3))
        const toStr = to.toISOString().slice(0, 10)
        const fromStr = from.toISOString().slice(0, 10)
        const url2 = `${base}/stable/historical-chart/1day/${encodeURIComponent(symbol)}?from=${fromStr}&to=${toStr}&apikey=${encodeURIComponent(fmpKey)}`
        console.debug('[FMP] SERIES FALLBACK', url2)
        const res2 = await fetch(url2)
        const json2 = await res2.json()
        if (Array.isArray(json2)) {
          points = json2.map((h: any) => ({ date: String(h?.date ?? h?.dateTime ?? h?.timestamp ?? '').slice(0, 10), close: Number(h?.close ?? h?.adjClose ?? h?.price ?? h?.c ?? 0) }))
        }
      }
      points = points.filter(p => p.date && Number.isFinite(p.close))
      points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      seriesCache.set(key, { points, ts: now })
      return points
    } catch (e) {
      console.debug('[FMP] series failed', e)
      return []
    }
  }
}

export const fmp = new FmpProvider()
