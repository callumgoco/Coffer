export type CurrencyCode = 'GBP' | 'USD' | 'EUR' | 'CAD'

export interface Account {
  id: string
  name: string
  type: 'checking' | 'savings' | 'credit' | 'brokerage' | 'cash'
  balance: number
  currency: CurrencyCode
}

export interface Transaction {
  id: string
  date: string
  merchant: string
  category: string
  amount: number
  currency?: CurrencyCode
  notes?: string
}

export interface Budget {
  id: string
  category: string
  limit: number
  spent: number
  currency?: CurrencyCode
}

export interface Holding {
  id: string
  symbol: string
  quantity: number
  averageCost: number
  lastPrice?: number
  region?: string
  currency?: string
}

export interface WatchItem {
  id: string
  symbol: string
}

export interface AssetItem {
  id: string
  name: string
  value: number
  currency?: CurrencyCode
  pricePaid?: number
  acquiredOn?: string
  notes?: string
  url?: string
}

export interface Income {
  id: string
  date: string
  source: string
  amount: number
  currency: CurrencyCode
}

export interface PortfolioSnapshot {
  id: string
  date: string
  value: number
  currency: CurrencyCode
  bookCost?: number
  unrealized?: number
  pnl?: number
}
