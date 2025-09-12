import { describe, it, expect } from 'vitest'
import { formatMoney } from './money'

describe('formatMoney', () => {
  it('formats GBP by default', () => {
    const s = formatMoney(1234.56)
    expect(s).toMatch(/£\s?1,?234\.56|1,?234\.56\s?£/)
  })
  it('formats with given currency', () => {
    const s = formatMoney(10, 'USD')
    expect(s).toMatch(/\$\s?10\.00|10\.00\s?\$/)
  })
})


