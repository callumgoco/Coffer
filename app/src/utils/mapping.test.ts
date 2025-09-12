import { describe, it, expect } from 'vitest'
import { snakeToCamel } from './mapping'

describe('snakeToCamel', () => {
  it('converts snake_case keys to camelCase', () => {
    const row = { account_id: 'x', average_cost: 12.3, plain: 1 }
    const out = snakeToCamel(row)
    expect(out).toEqual({ accountId: 'x', averageCost: 12.3, plain: 1 })
  })
})


