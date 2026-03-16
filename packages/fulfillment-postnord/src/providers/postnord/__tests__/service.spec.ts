import { describe, it, expect, vi, beforeEach } from "vitest"
import PostNordFulfillmentService from "../service"

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  activity: vi.fn(),
  progress: vi.fn(),
  failure: vi.fn(),
  success: vi.fn(),
  shouldLog: vi.fn(),
  setLogLevel: vi.fn(),
  unsetLogLevel: vi.fn(),
}

const defaultOptions = {
  apiKey: "test-api-key",
  customerNumber: "1234567890",
  senderAddress: {
    name: "Test Store AB",
    street: "Storgatan 1",
    postalCode: "11122",
    city: "Stockholm",
    countryCode: "SE",
  },
  environment: "test" as const,
}

function createService(overrides = {}) {
  const opts = { ...defaultOptions, ...overrides }
  return new PostNordFulfillmentService(
    { logger: mockLogger } as any,
    opts
  )
}

describe("PostNordFulfillmentService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── validateOptions ──

  describe("validateOptions", () => {
    it("throws when apiKey is missing", () => {
      expect(() =>
        PostNordFulfillmentService.validateOptions({
          customerNumber: "123",
          senderAddress: defaultOptions.senderAddress,
        })
      ).toThrow("apiKey is required")
    })

    it("throws when customerNumber is missing", () => {
      expect(() =>
        PostNordFulfillmentService.validateOptions({
          apiKey: "key",
          senderAddress: defaultOptions.senderAddress,
        })
      ).toThrow("customerNumber is required")
    })

    it("throws when senderAddress is missing", () => {
      expect(() =>
        PostNordFulfillmentService.validateOptions({
          apiKey: "key",
          customerNumber: "123",
        })
      ).toThrow("senderAddress is required")
    })

    it("throws when senderAddress fields are incomplete", () => {
      expect(() =>
        PostNordFulfillmentService.validateOptions({
          apiKey: "key",
          customerNumber: "123",
          senderAddress: { name: "Test" },
        })
      ).toThrow("senderAddress must include")
    })

    it("accepts valid options", () => {
      expect(() =>
        PostNordFulfillmentService.validateOptions({
          apiKey: "key",
          customerNumber: "123",
          senderAddress: defaultOptions.senderAddress,
        })
      ).not.toThrow()
    })
  })

  // ── getFulfillmentOptions ──

  describe("getFulfillmentOptions", () => {
    it("returns all service types with is_return", async () => {
      const service = createService()
      const options = await service.getFulfillmentOptions()

      expect(options).toHaveLength(5)

      const ids = options.map((o) => o.id)
      expect(ids).toContain("mypack_home")
      expect(ids).toContain("mypack_collect")
      expect(ids).toContain("parcel")
      expect(ids).toContain("pallet")
      expect(ids).toContain("return")
    })

    it("mypack_collect requires pickup point", async () => {
      const service = createService()
      const options = await service.getFulfillmentOptions()
      const collect = options.find((o) => o.id === "mypack_collect")

      expect((collect as any).requires_pickup_point).toBe(true)
    })

    it("pallet supports up to 1000kg", async () => {
      const service = createService()
      const options = await service.getFulfillmentOptions()
      const pallet = options.find((o) => o.id === "pallet")

      expect((pallet as any).max_weight_kg).toBe(1000)
    })

    it("return option has is_return=true", async () => {
      const service = createService()
      const options = await service.getFulfillmentOptions()
      const returnOpt = options.find((o) => o.id === "return")

      expect(returnOpt?.is_return).toBe(true)
    })

    it("non-return options have is_return=false", async () => {
      const service = createService()
      const options = await service.getFulfillmentOptions()
      const nonReturn = options.filter((o) => o.id !== "return")

      for (const opt of nonReturn) {
        expect(opt.is_return).toBe(false)
      }
    })
  })

  // ── validateOption ──

  describe("validateOption", () => {
    it("returns true for valid service IDs", async () => {
      const service = createService()

      expect(await service.validateOption({ id: "mypack_home" })).toBe(true)
      expect(await service.validateOption({ id: "mypack_collect" })).toBe(true)
      expect(await service.validateOption({ id: "parcel" })).toBe(true)
    })

    it("returns false for unknown service IDs", async () => {
      const service = createService()

      expect(await service.validateOption({ id: "unknown" })).toBe(false)
      expect(await service.validateOption({})).toBe(false)
    })
  })

  // ── validateFulfillmentData ──

  describe("validateFulfillmentData", () => {
    it("throws for unknown service", async () => {
      const service = createService()

      await expect(
        service.validateFulfillmentData({ id: "invalid" }, {}, {})
      ).rejects.toThrow('unknown service "invalid"')
    })

    it("throws when mypack_collect lacks service_point_id", async () => {
      const service = createService()

      await expect(
        service.validateFulfillmentData(
          { id: "mypack_collect" },
          {},
          {}
        )
      ).rejects.toThrow("requires a service_point_id")
    })

    it("throws when weight exceeds service limit", async () => {
      const service = createService()

      await expect(
        service.validateFulfillmentData(
          { id: "mypack_home" },
          { weight_grams: 25000 },
          {}
        )
      ).rejects.toThrow("exceeds max 20kg")
    })

    it("passes valid mypack_home data", async () => {
      const service = createService()

      const result = await service.validateFulfillmentData(
        { id: "mypack_home" },
        { weight_grams: 5000 },
        {}
      )

      expect(result.service_id).toBe("mypack_home")
      expect(result.weight_grams).toBe(5000)
    })

    it("passes valid mypack_collect data with service point", async () => {
      const service = createService()

      const result = await service.validateFulfillmentData(
        { id: "mypack_collect" },
        { service_point_id: "SP123", weight_grams: 3000 },
        {}
      )

      expect(result.service_id).toBe("mypack_collect")
      expect(result.service_point_id).toBe("SP123")
    })
  })

  // ── canCalculate ──

  describe("canCalculate", () => {
    it("returns true for known service IDs", async () => {
      const service = createService()
      expect(await service.canCalculate({ id: "mypack_home" })).toBe(true)
    })

    it("returns false for unknown service IDs", async () => {
      const service = createService()
      expect(await service.canCalculate({ id: "fedex" })).toBe(false)
    })
  })

  // ── calculatePrice ──

  describe("calculatePrice", () => {
    it("returns CalculatedShippingOptionPrice with 0 when address is missing", async () => {
      const service = createService()

      const result = await service.calculatePrice(
        { id: "mypack_home" },
        { weight_grams: 1000 },
        {}
      )

      expect(result).toEqual({
        calculated_amount: 0,
        is_calculated_price_tax_inclusive: true,
      })
      expect(mockLogger.warn).toHaveBeenCalled()
    })
  })

  // ── createFulfillment ──

  describe("createFulfillment", () => {
    it("throws when shipping address is missing", async () => {
      const service = createService()

      await expect(
        service.createFulfillment(
          { service_id: "mypack_home" },
          [],
          undefined,
          {} as any
        )
      ).rejects.toThrow("shipping address is required")
    })
  })

  // ── cancelFulfillment ──

  describe("cancelFulfillment", () => {
    it("logs warning when no shipment_id present", async () => {
      const service = createService()

      await service.cancelFulfillment({})

      expect(mockLogger.warn).toHaveBeenCalled()
    })
  })

  // ── getFulfillmentDocuments ──

  describe("getFulfillmentDocuments", () => {
    it("returns empty array", async () => {
      const service = createService()
      const docs = await service.getFulfillmentDocuments({})

      expect(docs).toEqual([])
    })
  })

  // ── getReturnDocuments ──

  describe("getReturnDocuments", () => {
    it("returns empty array", async () => {
      const service = createService()
      const docs = await service.getReturnDocuments({})

      expect(docs).toEqual([])
    })
  })

  // ── getShipmentDocuments ──

  describe("getShipmentDocuments", () => {
    it("returns empty array", async () => {
      const service = createService()
      const docs = await service.getShipmentDocuments({})

      expect(docs).toEqual([])
    })
  })

  // ── retrieveDocuments ──

  describe("retrieveDocuments", () => {
    it("completes without error", async () => {
      const service = createService()

      await expect(
        service.retrieveDocuments({}, "label")
      ).resolves.toBeUndefined()
    })
  })
})
