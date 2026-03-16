import { describe, it, expect } from "vitest"
import { toMinorUnits, fromMinorUnits } from "../currency"

describe("toMinorUnits", () => {
  it("converts SEK to oere (199.00 -> 19900)", () => {
    expect(toMinorUnits(199, "SEK")).toBe(19900)
  })

  it("converts EUR to cents (49.99 -> 4999)", () => {
    expect(toMinorUnits(49.99, "EUR")).toBe(4999)
  })

  it("converts NOK correctly (100.50 -> 10050)", () => {
    expect(toMinorUnits(100.5, "NOK")).toBe(10050)
  })

  it("converts DKK correctly (299.95 -> 29995)", () => {
    expect(toMinorUnits(299.95, "DKK")).toBe(29995)
  })

  it("handles zero-decimal currency JPY (1000 -> 1000)", () => {
    expect(toMinorUnits(1000, "JPY")).toBe(1000)
  })

  it("handles zero-decimal currency KRW (50000 -> 50000)", () => {
    expect(toMinorUnits(50000, "KRW")).toBe(50000)
  })

  it("rounds fractional oere correctly", () => {
    expect(toMinorUnits(1.006, "SEK")).toBe(101)
    expect(toMinorUnits(1.994, "SEK")).toBe(199)
  })

  it("is case-insensitive", () => {
    expect(toMinorUnits(10, "sek")).toBe(1000)
    expect(toMinorUnits(10, "Sek")).toBe(1000)
  })

  it("handles zero amount", () => {
    expect(toMinorUnits(0, "SEK")).toBe(0)
  })
})

describe("fromMinorUnits", () => {
  it("converts oere to SEK (19900 -> 199.00)", () => {
    expect(fromMinorUnits(19900, "SEK")).toBe(199)
  })

  it("converts cents to EUR (4999 -> 49.99)", () => {
    expect(fromMinorUnits(4999, "EUR")).toBe(49.99)
  })

  it("handles zero-decimal currency JPY (1000 -> 1000)", () => {
    expect(fromMinorUnits(1000, "JPY")).toBe(1000)
  })

  it("handles zero amount", () => {
    expect(fromMinorUnits(0, "SEK")).toBe(0)
  })

  it("is case-insensitive", () => {
    expect(fromMinorUnits(1000, "sek")).toBe(10)
  })
})
