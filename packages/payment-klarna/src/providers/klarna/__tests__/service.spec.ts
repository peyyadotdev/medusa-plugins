import { describe, it, expect, vi } from "vitest"
import KlarnaProviderService from "../service"

vi.mock("../client", () => {
  class KlarnaClient {
    createOrder = vi.fn()
    getOrder = vi.fn()
    updateOrder = vi.fn()
    getManagedOrder = vi.fn()
    acknowledgeOrder = vi.fn()
    captureOrder = vi.fn()
    refundOrder = vi.fn()
    cancelOrder = vi.fn()
    extendAuthorizationTime = vi.fn()
  }
  class KlarnaRequestError extends Error {
    public statusCode: number
    public apiError?: { error_code: string; error_messages: string[] }
    constructor(message: string, statusCode: number, apiError?: any) {
      super(message)
      this.name = "KlarnaRequestError"
      this.statusCode = statusCode
      this.apiError = apiError
    }
  }
  return { KlarnaClient, KlarnaRequestError }
})

function createService(optionsOverride = {}) {
  const container = {
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  }

  const options = {
    username: "K12345_abcdef",
    password: "test-secret",
    region: "eu" as const,
    environment: "playground" as const,
    ...optionsOverride,
  }

  const service = new KlarnaProviderService(container as any, options)
  return { service, container }
}

function getClient(service: KlarnaProviderService) {
  return (service as any).client
}

describe("KlarnaProviderService", () => {
  // ── validateOptions ──

  describe("validateOptions", () => {
    it("throws when username is missing", () => {
      expect(() =>
        KlarnaProviderService.validateOptions({
          password: "secret",
          region: "eu",
        })
      ).toThrow("username")
    })

    it("throws when password is missing", () => {
      expect(() =>
        KlarnaProviderService.validateOptions({
          username: "K12345",
          region: "eu",
        })
      ).toThrow("password")
    })

    it("throws when region is missing", () => {
      expect(() =>
        KlarnaProviderService.validateOptions({
          username: "K12345",
          password: "secret",
        })
      ).toThrow("region")
    })

    it("throws when region is invalid", () => {
      expect(() =>
        KlarnaProviderService.validateOptions({
          username: "K12345",
          password: "secret",
          region: "xx",
        })
      ).toThrow("region")
    })

    it("passes with valid options", () => {
      expect(() =>
        KlarnaProviderService.validateOptions({
          username: "K12345",
          password: "secret",
          region: "eu",
        })
      ).not.toThrow()
    })

    it("accepts all valid regions", () => {
      for (const region of ["eu", "na", "oc"]) {
        expect(() =>
          KlarnaProviderService.validateOptions({
            username: "K12345",
            password: "secret",
            region,
          })
        ).not.toThrow()
      }
    })
  })

  // ── initiatePayment ──

  describe("initiatePayment", () => {
    it("creates a Klarna checkout order and returns session data", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.createOrder.mockResolvedValue({
        order_id: "klarna-order-123",
        status: "checkout_incomplete",
        html_snippet: "<div>klarna checkout</div>",
      })

      const result = await service.initiatePayment({
        amount: 199,
        currency_code: "SEK",
        data: { session_id: "sess-001" },
      })

      expect(result.id).toBe("klarna-order-123")
      expect(result.data).toMatchObject({
        klarna_order_id: "klarna-order-123",
        html_snippet: "<div>klarna checkout</div>",
        session_id: "sess-001",
        currency_code: "SEK",
      })
    })

    it("converts amount to minor units", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.createOrder.mockResolvedValue({
        order_id: "x",
        html_snippet: "",
      })

      await service.initiatePayment({
        amount: 99.99,
        currency_code: "SEK",
        data: { session_id: "s1" },
      })

      expect(client.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          order_amount: 9999,
          purchase_currency: "SEK",
          purchase_country: "SE",
          merchant_reference1: "s1",
        })
      )
    })

    it("resolves country from currency code", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.createOrder.mockResolvedValue({
        order_id: "x",
        html_snippet: "",
      })

      await service.initiatePayment({
        amount: 100,
        currency_code: "NOK",
        data: { session_id: "s1" },
      })

      expect(client.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({ purchase_country: "NO" })
      )
    })

    it("throws on Klarna API error", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.createOrder.mockRejectedValue(new Error("Bad Request"))

      await expect(
        service.initiatePayment({
          amount: 100,
          currency_code: "SEK",
          data: { session_id: "s1" },
        })
      ).rejects.toThrow("Failed to create Klarna checkout")
    })
  })

  // ── authorizePayment ──

  describe("authorizePayment", () => {
    it("returns authorized when checkout is complete", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.getOrder.mockResolvedValue({
        order_id: "klarna-123",
        status: "checkout_complete",
      })
      client.acknowledgeOrder.mockResolvedValue(undefined)

      const result = await service.authorizePayment({
        data: { klarna_order_id: "klarna-123" },
      })

      expect(result.status).toBe("authorized")
      expect(result.data).toMatchObject({ klarna_status: "checkout_complete" })
      expect(client.acknowledgeOrder).toHaveBeenCalledWith("klarna-123")
    })

    it("returns pending when checkout is incomplete", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.getOrder.mockResolvedValue({
        order_id: "klarna-123",
        status: "checkout_incomplete",
      })

      const result = await service.authorizePayment({
        data: { klarna_order_id: "klarna-123" },
      })

      expect(result.status).toBe("pending")
    })

    it("returns error when klarna_order_id is missing", async () => {
      const { service } = createService()
      const result = await service.authorizePayment({ data: {} })
      expect(result.status).toBe("error")
    })

    it("returns error on API failure", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.getOrder.mockRejectedValue(new Error("Network error"))

      const result = await service.authorizePayment({
        data: { klarna_order_id: "klarna-123" },
      })

      expect(result.status).toBe("error")
    })

    it("still authorizes if acknowledge fails", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.getOrder.mockResolvedValue({
        order_id: "klarna-123",
        status: "checkout_complete",
      })
      client.acknowledgeOrder.mockRejectedValue(new Error("Already acknowledged"))

      const result = await service.authorizePayment({
        data: { klarna_order_id: "klarna-123" },
      })

      expect(result.status).toBe("authorized")
    })
  })

  // ── getWebhookActionAndData ──

  describe("getWebhookActionAndData", () => {
    it("returns authorized for checkout_complete push", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.getOrder.mockResolvedValue({
        order_id: "klarna-123",
        status: "checkout_complete",
        merchant_reference1: "sess-001",
        purchase_currency: "SEK",
        order_amount: 19900,
      })
      client.acknowledgeOrder.mockResolvedValue(undefined)

      const result = await service.getWebhookActionAndData({
        data: { order_id: "klarna-123" },
        rawData: JSON.stringify({ order_id: "klarna-123" }),
        headers: {},
      })

      expect(result.action).toBe("authorized")
      expect(result.data?.session_id).toBe("sess-001")
    })

    it("returns not_supported for incomplete checkout", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.getOrder.mockResolvedValue({
        order_id: "klarna-123",
        status: "checkout_incomplete",
      })

      const result = await service.getWebhookActionAndData({
        data: { order_id: "klarna-123" },
        rawData: JSON.stringify({ order_id: "klarna-123" }),
        headers: {},
      })

      expect(result.action).toBe("not_supported")
    })

    it("returns not_supported when order_id is missing", async () => {
      const { service } = createService()
      const result = await service.getWebhookActionAndData({
        data: {},
        rawData: "{}",
        headers: {},
      })

      expect(result.action).toBe("not_supported")
    })

    it("returns failed on API error", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.getOrder.mockRejectedValue(new Error("API error"))

      const result = await service.getWebhookActionAndData({
        data: { order_id: "klarna-123" },
        rawData: JSON.stringify({ order_id: "klarna-123" }),
        headers: {},
      })

      expect(result.action).toBe("failed")
    })
  })

  // ── capturePayment ──

  describe("capturePayment", () => {
    it("fetches managed order and captures the remaining amount", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.getManagedOrder.mockResolvedValue({
        order_id: "klarna-123",
        status: "AUTHORIZED",
        remaining_authorized_amount: 19900,
      })
      client.captureOrder.mockResolvedValue(undefined)

      const result = await service.capturePayment({
        data: {
          klarna_order_id: "klarna-123",
          currency_code: "SEK",
        },
      })

      expect(client.getManagedOrder).toHaveBeenCalledWith("klarna-123")
      expect(client.captureOrder).toHaveBeenCalledWith("klarna-123", {
        captured_amount: 19900,
      })
      expect(result.data).toMatchObject({
        klarna_captured: true,
        captured_amount: 19900,
      })
    })

    it("throws when klarna_order_id is missing", async () => {
      const { service } = createService()
      await expect(
        service.capturePayment({ data: {} })
      ).rejects.toThrow("Missing klarna_order_id")
    })

    it("throws on Klarna API error", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.getManagedOrder.mockResolvedValue({
        remaining_authorized_amount: 10000,
      })
      client.captureOrder.mockRejectedValue(new Error("Capture failed"))

      await expect(
        service.capturePayment({
          data: { klarna_order_id: "klarna-123", currency_code: "SEK" },
        })
      ).rejects.toThrow("Failed to capture")
    })
  })

  // ── refundPayment ──

  describe("refundPayment", () => {
    it("refunds with correct minor unit amount", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.refundOrder.mockResolvedValue(undefined)

      const result = await service.refundPayment({
        data: {
          klarna_order_id: "klarna-123",
          currency_code: "SEK",
        },
        amount: 50,
      })

      expect(client.refundOrder).toHaveBeenCalledWith("klarna-123", {
        refunded_amount: 5000,
      })
      expect(result.data).toMatchObject({ last_refund_amount: 5000 })
    })

    it("handles partial refunds", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.refundOrder.mockResolvedValue(undefined)

      await service.refundPayment({
        data: {
          klarna_order_id: "klarna-123",
          currency_code: "SEK",
        },
        amount: 25.50,
      })

      expect(client.refundOrder).toHaveBeenCalledWith("klarna-123", {
        refunded_amount: 2550,
      })
    })

    it("throws when klarna_order_id is missing", async () => {
      const { service } = createService()
      await expect(
        service.refundPayment({ data: {}, amount: 50 })
      ).rejects.toThrow("Missing klarna_order_id")
    })
  })

  // ── cancelPayment ──

  describe("cancelPayment", () => {
    it("cancels the Klarna order", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.cancelOrder.mockResolvedValue(undefined)

      const result = await service.cancelPayment({
        data: { klarna_order_id: "klarna-123" },
      })

      expect(client.cancelOrder).toHaveBeenCalledWith("klarna-123")
      expect(result.data).toMatchObject({ klarna_status: "CANCELLED" })
    })

    it("warns but returns data if cancel fails", async () => {
      const { service, container } = createService()
      const client = getClient(service)
      client.cancelOrder.mockRejectedValue(new Error("already captured"))

      const result = await service.cancelPayment({
        data: { klarna_order_id: "klarna-123" },
      })

      expect(container.logger.warn).toHaveBeenCalled()
      expect(result.data).toMatchObject({ klarna_order_id: "klarna-123" })
    })

    it("returns data when no klarna_order_id", async () => {
      const { service } = createService()
      const result = await service.cancelPayment({ data: { foo: "bar" } })
      expect(result.data).toMatchObject({ foo: "bar" })
    })
  })

  // ── deletePayment ──

  describe("deletePayment", () => {
    it("attempts to cancel the Klarna order", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.cancelOrder.mockResolvedValue(undefined)

      await service.deletePayment({
        data: { klarna_order_id: "klarna-123" },
      })

      expect(client.cancelOrder).toHaveBeenCalledWith("klarna-123")
    })

    it("silently ignores cancel failures", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.cancelOrder.mockRejectedValue(new Error("expired"))

      const result = await service.deletePayment({
        data: { klarna_order_id: "klarna-123" },
      })

      expect(result.data).toMatchObject({ klarna_order_id: "klarna-123" })
    })

    it("returns data when no klarna_order_id", async () => {
      const { service } = createService()
      const result = await service.deletePayment({ data: { some: "data" } })
      expect(result.data).toMatchObject({ some: "data" })
    })
  })

  // ── getPaymentStatus ──

  describe("getPaymentStatus", () => {
    it("maps AUTHORIZED to authorized", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.getManagedOrder.mockResolvedValue({ status: "AUTHORIZED" })

      const result = await service.getPaymentStatus({
        data: { klarna_order_id: "klarna-123" },
      })
      expect(result.status).toBe("authorized")
    })

    it("maps CAPTURED to captured", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.getManagedOrder.mockResolvedValue({ status: "CAPTURED" })

      const result = await service.getPaymentStatus({
        data: { klarna_order_id: "klarna-123" },
      })
      expect(result.status).toBe("captured")
    })

    it("maps PART_CAPTURED to captured", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.getManagedOrder.mockResolvedValue({ status: "PART_CAPTURED" })

      const result = await service.getPaymentStatus({
        data: { klarna_order_id: "klarna-123" },
      })
      expect(result.status).toBe("captured")
    })

    it("maps CANCELLED to canceled", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.getManagedOrder.mockResolvedValue({ status: "CANCELLED" })

      const result = await service.getPaymentStatus({
        data: { klarna_order_id: "klarna-123" },
      })
      expect(result.status).toBe("canceled")
    })

    it("maps EXPIRED to error", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.getManagedOrder.mockResolvedValue({ status: "EXPIRED" })

      const result = await service.getPaymentStatus({
        data: { klarna_order_id: "klarna-123" },
      })
      expect(result.status).toBe("error")
    })

    it("returns pending when no klarna_order_id", async () => {
      const { service } = createService()
      const result = await service.getPaymentStatus({ data: {} })
      expect(result.status).toBe("pending")
    })

    it("returns pending on API failure", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.getManagedOrder.mockRejectedValue(new Error("fail"))

      const result = await service.getPaymentStatus({
        data: { klarna_order_id: "klarna-123" },
      })
      expect(result.status).toBe("pending")
    })
  })

  // ── retrievePayment ──

  describe("retrievePayment", () => {
    it("fetches and merges Klarna order data", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.getManagedOrder.mockResolvedValue({
        order_id: "klarna-123",
        status: "AUTHORIZED",
        order_amount: 19900,
      })

      const result = await service.retrievePayment({
        data: { klarna_order_id: "klarna-123" },
      })

      expect(result.data).toMatchObject({
        klarna_order_id: "klarna-123",
        klarna_order: expect.objectContaining({ status: "AUTHORIZED" }),
      })
    })

    it("returns input data when no klarna_order_id", async () => {
      const { service } = createService()
      const result = await service.retrievePayment({
        data: { some: "data" },
      })
      expect(result.data).toMatchObject({ some: "data" })
    })
  })

  // ── updatePayment ──

  describe("updatePayment", () => {
    it("updates Klarna order with new amount in minor units", async () => {
      const { service } = createService()
      const client = getClient(service)
      client.updateOrder.mockResolvedValue({})

      await service.updatePayment({
        data: { klarna_order_id: "klarna-123", session_id: "sess-001" },
        amount: 299.50,
        currency_code: "SEK",
      })

      expect(client.updateOrder).toHaveBeenCalledWith("klarna-123", {
        order_amount: 29950,
        order_tax_amount: 0,
        order_lines: [
          expect.objectContaining({
            name: "Order",
            total_amount: 29950,
          }),
        ],
      })
    })

    it("returns data when no klarna_order_id", async () => {
      const { service } = createService()
      const result = await service.updatePayment({
        data: { foo: "bar" },
        amount: 100,
        currency_code: "SEK",
      })
      expect(result.data).toMatchObject({ foo: "bar" })
    })
  })

  // ── Account holder methods ──

  describe("createAccountHolder", () => {
    it("returns existing account holder id if present", async () => {
      const { service } = createService()
      const result = await service.createAccountHolder({
        context: {
          account_holder: { data: { id: "ah-123" } },
          customer: { id: "cust-1", email: "test@test.com" },
        },
      } as any)

      expect(result.id).toBe("ah-123")
    })

    it("creates account holder from customer data", async () => {
      const { service } = createService()
      const result = await service.createAccountHolder({
        context: {
          account_holder: {},
          customer: {
            id: "cust-1",
            email: "test@test.com",
            first_name: "Test",
            last_name: "User",
          },
        },
      } as any)

      expect(result.id).toBe("cust-1")
      expect(result.data).toMatchObject({ email: "test@test.com" })
    })

    it("throws when customer is missing", async () => {
      const { service } = createService()
      await expect(
        service.createAccountHolder({
          context: { account_holder: {} },
        } as any)
      ).rejects.toThrow("Missing customer data")
    })
  })

  describe("savePaymentMethod", () => {
    it("returns token data", async () => {
      const { service } = createService()
      const result = await service.savePaymentMethod({
        context: {
          account_holder: { data: { id: "ah-123" } },
        },
        data: { token_id: "kt_abc" },
      } as any)

      expect(result.id).toBe("kt_abc")
      expect(result.data).toMatchObject({ account_holder_id: "ah-123" })
    })

    it("throws when account holder is missing", async () => {
      const { service } = createService()
      await expect(
        service.savePaymentMethod({
          context: { account_holder: {} },
          data: {},
        } as any)
      ).rejects.toThrow("Missing account holder ID")
    })
  })

  describe("listPaymentMethods", () => {
    it("returns empty array when no account holder", async () => {
      const { service } = createService()
      const result = await service.listPaymentMethods({
        context: { account_holder: {} },
      } as any)
      expect(result).toEqual([])
    })

    it("returns empty array for valid account holder", async () => {
      const { service } = createService()
      const result = await service.listPaymentMethods({
        context: { account_holder: { data: { id: "ah-123" } } },
      } as any)
      expect(result).toEqual([])
    })
  })
})
