import { supabaseService } from './supabase'
import { mockService } from './mock'

export type Service = {
  getAccounts(): Promise<any[]>
  upsertAccounts?: (rows: any[]) => Promise<void>
  getTransactions(): Promise<any[]>
  getBudgets(): Promise<any[]>
  getHoldings(): Promise<any[]>
  getAssets(): Promise<any[]>
  getWatchlist?: () => Promise<any[]>
  addToWatchlist?: (symbol: string) => Promise<any>
  upsertTransactions?: (rows: any[]) => Promise<void>
  deleteTransaction?: (id: string) => Promise<void>
  upsertBudgets?: (rows: any[]) => Promise<void>
  upsertIncomes?: (rows: any[]) => Promise<void>
  deleteIncome?: (id: string) => Promise<void>
  upsertAssets?: (rows: any[]) => Promise<void>
  deleteAsset?: (id: string) => Promise<void>
  upsertHoldings?: (rows: any[]) => Promise<void>
  deleteHolding?: (id: string) => Promise<void>
  updateHoldingPrice?: (symbol: string, lastPrice: number) => Promise<void>
  getPortfolioSnapshots?: () => Promise<any[]>
  upsertPortfolioSnapshots?: (rows: any[]) => Promise<void>
}

const dataMode = (import.meta as any).env?.VITE_DATA_MODE ?? 'mock'

export const service: Service = (dataMode === 'live' && (import.meta as any).env?.VITE_SUPABASE_URL && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY)
  ? (supabaseService as unknown as Service)
  : (mockService as unknown as Service)


