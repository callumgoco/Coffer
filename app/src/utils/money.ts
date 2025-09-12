export function formatMoney(value: number, currency: string = 'GBP') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}
