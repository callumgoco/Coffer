import { useQuery } from '@tanstack/react-query'
import { service } from '../services/adapters'

export function useAccounts() {
  return useQuery({ queryKey: ['accounts'], queryFn: service.getAccounts })
}
export function useTransactions() {
  return useQuery({ queryKey: ['transactions'], queryFn: service.getTransactions })
}
export function useBudgets() {
  return useQuery({ queryKey: ['budgets'], queryFn: service.getBudgets })
}
export function useHoldings() {
  return useQuery({ queryKey: ['holdings'], queryFn: service.getHoldings })
}
export function useAssets() {
  return useQuery({ queryKey: ['assets'], queryFn: service.getAssets })
}
export function useWatchlist() {
  return useQuery({ queryKey: ['watchlist'], queryFn: service.getWatchlist })
}

export function useWatchlistQuote(symbol: string) {
  return useQuery({ queryKey: ['quote', symbol], queryFn: async () => symbol })
}

export function useIncomes() {
  return useQuery({ queryKey: ['incomes'], queryFn: (service as any).getIncomes })
}

export function usePortfolioSnapshots() {
  return useQuery({ queryKey: ['portfolio-snapshots'], queryFn: (service as any).getPortfolioSnapshots })
}


