import { z } from 'zod'

export type DataMode = 'mock' | 'live'

const envSchema = z.object({
  VITE_DATA_MODE: z.enum(['mock', 'live']).default('mock'),
})

const env = envSchema.parse({
  VITE_DATA_MODE: import.meta.env.VITE_DATA_MODE,
})

export const dataMode: DataMode = env.VITE_DATA_MODE

export interface DataAdapter {
  getSummary(): Promise<{ netWorth: number }>
}

class MockAdapter implements DataAdapter {
  async getSummary() {
    // trivial placeholder; expanded later
    return { netWorth: 123456 }
  }
}

class LiveAdapter implements DataAdapter {
  async getSummary() {
    // TODO: wire to Supabase later; for now fallback same as mock
    return { netWorth: 123456 }
  }
}

export const dataAdapter: DataAdapter = dataMode === 'live' ? new LiveAdapter() : new MockAdapter()
