import accounts from '../../mocks/accounts.json'
import transactions from '../../mocks/transactions.json'
import budgets from '../../mocks/budgets.json'
import incomes from '../../mocks/incomes.json'
import holdings from '../../mocks/holdings.json'
import assets from '../../mocks/assets.json'
import watchlist from '../../mocks/watchlist.json'
import type { Account, Transaction, Budget, Holding, AssetItem, WatchItem, Income, PortfolioSnapshot } from '../../types'

export const mockDb = {
  accounts: accounts as Account[],
  transactions: transactions as Transaction[],
  budgets: budgets as Budget[],
  holdings: holdings as Holding[],
  assets: assets as AssetItem[],
  watchlist: watchlist as WatchItem[],
  incomes: incomes as Income[],
}

export const mockService = {
  async getAccounts() { return mockDb.accounts },
  async getTransactions() { return mockDb.transactions },
  async getBudgets() {
    // compute spent from transactions, matching currency via account
    const accountsById = new Map(mockDb.accounts.map(a => [a.id, a]))
    return mockDb.budgets.map(b => {
      const spent = mockDb.transactions
        .filter(t => t.category === b.category)
        .filter(t => {
          const acc = accountsById.get(t.accountId)
          if (!acc) return false
          return b.currency ? acc.currency === b.currency : true
        })
        .reduce((sum, t) => sum + (t.amount < 0 ? -t.amount : 0), 0)
      return { ...b, spent }
    })
  },
  async getHoldings() { return mockDb.holdings },
  async getAssets() { return mockDb.assets },
  async getWatchlist() { return mockDb.watchlist },
  async getIncomes() { return mockDb.incomes },
  async getPortfolioSnapshots(): Promise<PortfolioSnapshot[]> { return [] },
  async upsertPortfolioSnapshots(_rows: PortfolioSnapshot[]): Promise<void> { return },
  async addToWatchlist(symbol: string) {
    const exists = mockDb.watchlist.some(w => w.symbol.toUpperCase() === symbol.toUpperCase())
    if (exists) return
    const id = `w_${Date.now()}`
    mockDb.watchlist = [...mockDb.watchlist, { id, symbol }]
    return id
  },
  async upsertTransactions(rows: Transaction[]) {
    const byId = new Map(mockDb.transactions.map(t => [t.id, t]))
    for (const r of rows) byId.set(r.id, r)
    mockDb.transactions = Array.from(byId.values())
  },
  async upsertBudgets(rows: Budget[]) {
    const byId = new Map(mockDb.budgets.map(b => [b.id, b]))
    for (const r of rows) byId.set(r.id, r)
    mockDb.budgets = Array.from(byId.values())
  },
  async upsertIncomes(rows: Income[]) {
    const byId = new Map(mockDb.incomes.map(i => [i.id, i]))
    for (const r of rows) byId.set(r.id, r)
    mockDb.incomes = Array.from(byId.values())
  },
  async upsertAssets(rows: AssetItem[]) {
    const byId = new Map(mockDb.assets.map(a => [a.id, a]))
    for (const r of rows) byId.set(r.id, r)
    mockDb.assets = Array.from(byId.values())
  },
  async deleteAsset(id: string) {
    mockDb.assets = mockDb.assets.filter(a => a.id !== id)
  },
  async deleteTransaction(id: string) {
    mockDb.transactions = mockDb.transactions.filter(t => t.id !== id)
  },
  async deleteIncome(id: string) {
    mockDb.incomes = mockDb.incomes.filter(i => i.id !== id)
  },
}


