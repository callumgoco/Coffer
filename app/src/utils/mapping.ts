export function snakeToCamel<T extends Record<string, any>>(row: T) {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(row)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    out[camel] = v
  }
  return out
}


