const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
])

/**
 * Convert a Medusa amount (standard units) to Qliro minor units.
 * SEK 199.00 → 19900 öre
 */
export function toMinorUnits(
  amount: number,
  currencyCode: string
): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currencyCode.toLowerCase())) {
    return Math.round(amount)
  }
  return Math.round(amount * 100)
}

/**
 * Convert Qliro minor units back to Medusa standard units.
 * 19900 öre → SEK 199.00
 */
export function fromMinorUnits(
  amount: number,
  currencyCode: string
): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currencyCode.toLowerCase())) {
    return amount
  }
  return amount / 100
}
