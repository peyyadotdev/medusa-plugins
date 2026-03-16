import { describe, it, expect } from "vitest"
import { toMinorUnits, fromMinorUnits } from "../currency"

describe("toMinorUnits", () => {
  it("converts SEK to öre", () => {
    expect(toMinorUnits(199.0, "sek")).toBe(19900)
    expect(toMinorUnits(49.99, "SEK")).toBe(4999)
  })

  it("converts EUR to cents", () => {
    expect(toMinorUnits(10.5, "eur")).toBe(1050)
  })

  it("converts NOK to øre", () => {
    expect(toMinorUnits(100, "nok")).toBe(10000)
  })

  it("converts DKK to øre", () => {
    expect(toMinorUnits(250.75, "dkk")).toBe(25075)
  })

  it("handles zero-decimal currencies (JPY)", () => {
    expect(toMinorUnits(1000, "jpy")).toBe(1000)
  })

  it("rounds fractional amounts", () => {
    expect(toMinorUnits(10.999, "sek")).toBe(1100)
  })
})

describe("fromMinorUnits", () => {
  it("converts öre to SEK", () => {
    expect(fromMinorUnits(19900, "sek")).toBe(199.0)
    expect(fromMinorUnits(4999, "SEK")).toBe(49.99)
  })

  it("converts cents to EUR", () => {
    expect(fromMinorUnits(1050, "eur")).toBe(10.5)
  })

  it("handles zero-decimal currencies (JPY)", () => {
    expect(fromMinorUnits(1000, "jpy")).toBe(1000)
  })
})
