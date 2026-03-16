import { describe, it, expect, vi, beforeEach } from "vitest"
import PostNordFulfillmentService from "../service"
import { MedusaError } from "@medusajs/framework/utils"

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
    it("returns all service types", async () => {
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

      expect(collect?.requires_pickup_point).toBe(true)
    })

    it("pallet supports up to 1000kg", async () => {
      const service = createService()
      const options = await service.getFulfillmentOptions()
      const pallet = options.find((o) => o.id === "pallet")

      expect(pallet?.max_weight_kg).toBe(1000)
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
    it("returns 0 when shipping address is missing", async () => {
      const service = createService()

      const price = await service.calculatePrice(
        { id: "mypack_home" },
        { weight_grams: 1000 },
        {}
      )

      expect(price).toBe(0)
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
          {},
          {}
        )
      ).rejects.toThrow("shipping address is required")
    })
  })

  // ── cancelFulfillment ──

  describe("cancelFulfillment", () => {
    it("returns empty when no shipment_id present", async () => {
      const service = createService()

      const result = await service.cancelFulfillment({ data: {} })

      expect(result).toEqual({})
      expect(mockLogger.warn).toHaveBeenCalled()
    })
  })

  // ── getFulfillmentDocuments ──

  describe("getFulfillmentDocuments", () => {
    it("returns empty array when no shipment_id", async () => {
      const service = createService()
      const docs = await service.getFulfillmentDocuments({})

      expect(docs).toEqual([])
    })

    it("returns label document when label_url is present", async () => {
      const service = createService()
      const docs = await service.getFulfillmentDocuments({
        shipment_id: "SHP123",
        label_url: "https://example.com/label.pdf",
      })

      expect(docs).toHaveLength(1)
      expect(docs[0].type).toBe("label")
      expect(docs[0].url).toBe("https://example.com/label.pdf")
    })
  })

  // ── getReturnDocuments ──

  describe("getReturnDocuments", () => {
    it("delegates to getFulfillmentDocuments", async () => {
      const service = createService()
      const docs = await service.getReturnDocuments({
        shipment_id: "SHP456",
        label_url: "https://example.com/return.pdf",
      })

      expect(docs).toHaveLength(1)
      expect(docs[0].name).toContain("postnord-label-SHP456")
    })
  })
})
