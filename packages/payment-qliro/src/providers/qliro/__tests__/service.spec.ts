import { describe, it, expect, vi, beforeEach } from "vitest"
import { BigNumber } from "@medusajs/framework/utils"
import QliroProviderService from "../service"
import { QliroClient } from "../client"

vi.mock("../client", () => {
  const QliroClient = vi.fn()
  QliroClient.prototype.createCheckoutOrder = vi.fn()
  QliroClient.prototype.getCheckoutOrder = vi.fn()
  QliroClient.prototype.updateCheckoutOrder = vi.fn()
  QliroClient.prototype.capturePayment = vi.fn()
  QliroClient.prototype.refundPayment = vi.fn()
  QliroClient.prototype.cancelOrder = vi.fn()
  return { QliroClient, QliroRequestError: Error }
})

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  activity: vi.fn(),
  progress: vi.fn(),
  failure: vi.fn(),
  success: vi.fn(),
  should: vi.fn(),
  level: "info",
}

const defaultOptions = {
  apiKey: "test-api-key",
  merchantId: "test-merchant",
  environment: "sandbox" as const,
}

function createService() {
  return new (QliroProviderService as any)(
    { logger: mockLogger },
    defaultOptions
  ) as InstanceType<typeof QliroProviderService>
}

function getClient(service: any): QliroClient {
  return service.client
}

describe("QliroProviderService", () => {
  let service: InstanceType<typeof QliroProviderService>
  let client: QliroClient

  beforeEach(() => {
    vi.clearAllMocks()
    service = createService()
    client = getClient(service)
  })

  // ── validateOptions ──

  describe("validateOptions", () => {
    it("throws when apiKey is missing", () => {
      expect(() =>
        QliroProviderService.validateOptions({
          merchantId: "m1",
        })
      ).toThrow("API key is required")
    })

    it("throws when merchantId is missing", () => {
      expect(() =>
        QliroProviderService.validateOptions({
          apiKey: "ak",
        })
      ).toThrow("merchant ID is required")
    })

    it("passes with valid options", () => {
      expect(() =>
        QliroProviderService.validateOptions({
          apiKey: "ak",
          merchantId: "m1",
        })
      ).not.toThrow()
    })
  })

  // ── initiatePayment ──

  describe("initiatePayment", () => {
    it("creates a Qliro checkout order and returns snippet", async () => {
      vi.mocked(client.createCheckoutOrder).mockResolvedValue({
        OrderId: 12345,
        MerchantReference: "sess_abc",
        HtmlSnippet: "<div>checkout</div>",
      })

      const result = await service.initiatePayment({
        amount: 199,
        currency_code: "sek",
        data: { session_id: "sess_abc" },
        context: {},
      } as any)

      expect(client.createCheckoutOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          MerchantReference: "sess_abc",
          Currency: "SEK",
          Country: "SE",
        })
      )

      expect(result.id).toBe("12345")
      expect(result.data).toEqual(
        expect.objectContaining({
          qliro_order_id: 12345,
          html_snippet: "<div>checkout</div>",
          session_id: "sess_abc",
        })
      )
    })

    it("throws on Qliro API error", async () => {
      vi.mocked(client.createCheckoutOrder).mockRejectedValue(
        new Error("Bad request")
      )

      await expect(
        service.initiatePayment({
          amount: 100,
          currency_code: "sek",
          data: { session_id: "sess_1" },
          context: {},
        } as any)
      ).rejects.toThrow("Failed to create Qliro checkout")
    })
  })

  // ── authorizePayment ──

  describe("authorizePayment", () => {
    it("returns authorized when Qliro order is Completed", async () => {
      vi.mocked(client.getCheckoutOrder).mockResolvedValue({
        OrderId: 123,
        MerchantReference: "sess_1",
        Status: "Completed",
        Country: "SE",
        Currency: "SEK",
        TotalPrice: 19900,
        OrderItems: [],
      })

      const result = await service.authorizePayment({
        data: { qliro_order_id: 123 },
      } as any)

      expect(result.status).toBe("authorized")
    })

    it("returns pending when Qliro order is InProcess", async () => {
      vi.mocked(client.getCheckoutOrder).mockResolvedValue({
        OrderId: 123,
        MerchantReference: "sess_1",
        Status: "InProcess",
        Country: "SE",
        Currency: "SEK",
        TotalPrice: 19900,
        OrderItems: [],
      })

      const result = await service.authorizePayment({
        data: { qliro_order_id: 123 },
      } as any)

      expect(result.status).toBe("pending")
    })

    it("returns error when qliro_order_id is missing", async () => {
      const result = await service.authorizePayment({
        data: {},
      } as any)

      expect(result.status).toBe("error")
    })
  })

  // ── getWebhookActionAndData ──

  describe("getWebhookActionAndData", () => {
    it("returns authorized on Completed status", async () => {
      vi.mocked(client.getCheckoutOrder).mockResolvedValue({
        OrderId: 100,
        MerchantReference: "sess_1",
        Status: "Completed",
        Country: "SE",
        Currency: "SEK",
        TotalPrice: 19900,
        OrderItems: [],
      })

      const result = await service.getWebhookActionAndData({
        data: {
          OrderId: 100,
          MerchantReference: "sess_1",
          Status: "Completed",
        },
        rawData: "{}",
        headers: {},
      })

      expect(result.action).toBe("authorized")
      expect(result.data?.session_id).toBe("sess_1")
    })

    it("returns failed on Refused status", async () => {
      const result = await service.getWebhookActionAndData({
        data: {
          OrderId: 100,
          MerchantReference: "sess_1",
          Status: "Refused",
        },
        rawData: "{}",
        headers: {},
      })

      expect(result.action).toBe("failed")
      expect(result.data?.session_id).toBe("sess_1")
    })

    it("returns not_supported on InProcess status", async () => {
      const result = await service.getWebhookActionAndData({
        data: {
          OrderId: 100,
          MerchantReference: "sess_1",
          Status: "InProcess",
        },
        rawData: "{}",
        headers: {},
      })

      expect(result.action).toBe("not_supported")
    })

    it("returns not_supported when payload is missing fields", async () => {
      const result = await service.getWebhookActionAndData({
        data: {},
        rawData: "{}",
        headers: {},
      })

      expect(result.action).toBe("not_supported")
    })
  })

  // ── capturePayment ──

  describe("capturePayment", () => {
    it("captures payment via Order Management API", async () => {
      vi.mocked(client.getCheckoutOrder).mockResolvedValue({
        OrderId: 123,
        MerchantReference: "sess_1",
        Status: "Completed",
        Country: "SE",
        Currency: "SEK",
        TotalPrice: 19900,
        OrderItems: [],
      })
      vi.mocked(client.capturePayment).mockResolvedValue({
        PaymentTransactionId: "txn_1",
        RequestId: "req_1",
        Status: "Captured",
      })

      const result = await service.capturePayment({
        data: {
          payment_transaction_id: "txn_1",
          qliro_order_id: 123,
          currency_code: "sek",
        },
      } as any)

      expect(client.getCheckoutOrder).toHaveBeenCalledWith(123)
      expect(client.capturePayment).toHaveBeenCalledWith(
        expect.objectContaining({
          PaymentTransactionId: "txn_1",
          Amount: 19900,
        })
      )
      expect(result.data).toEqual(
        expect.objectContaining({
          capture_status: "Captured",
        })
      )
    })
  })

  // ── refundPayment ──

  describe("refundPayment", () => {
    it("refunds payment via Order Management API", async () => {
      vi.mocked(client.refundPayment).mockResolvedValue({
        PaymentTransactionId: "txn_1",
        RequestId: "req_1",
        Status: "Refunded",
      })

      const result = await service.refundPayment({
        amount: 50,
        data: {
          payment_transaction_id: "txn_1",
          currency_code: "sek",
        },
      } as any)

      expect(client.refundPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          PaymentTransactionId: "txn_1",
          Amount: 5000,
        })
      )
      expect(result.data).toEqual(
        expect.objectContaining({
          refund_status: "Refunded",
        })
      )
    })

    it("throws when payment_transaction_id is missing", async () => {
      await expect(
        service.refundPayment({
          amount: 50,
          data: { currency_code: "sek" },
        } as any)
      ).rejects.toThrow("Missing payment_transaction_id")
    })
  })

  // ── cancelPayment ──

  describe("cancelPayment", () => {
    it("cancels order via Order Management API", async () => {
      vi.mocked(client.cancelOrder).mockResolvedValue({
        PaymentTransactionId: "txn_1",
        RequestId: "req_1",
        Status: "Cancelled",
      })

      const result = await service.cancelPayment({
        data: { payment_transaction_id: "txn_1" },
      } as any)

      expect(client.cancelOrder).toHaveBeenCalled()
      expect(result.data).toEqual(
        expect.objectContaining({
          qliro_status: "Cancelled",
        })
      )
    })

    it("returns data unchanged when no transaction ID", async () => {
      const result = await service.cancelPayment({
        data: { foo: "bar" },
      } as any)

      expect(client.cancelOrder).not.toHaveBeenCalled()
      expect(result.data).toEqual({ foo: "bar" })
    })
  })

  // ── deletePayment ──

  describe("deletePayment", () => {
    it("releases Qliro order when transaction ID exists", async () => {
      vi.mocked(client.cancelOrder).mockResolvedValue({
        PaymentTransactionId: "txn_1",
        RequestId: "req_1",
        Status: "Cancelled",
      })

      const result = await service.deletePayment({
        data: { payment_transaction_id: "txn_1" },
      } as any)

      expect(client.cancelOrder).toHaveBeenCalled()
      expect(result.data).toEqual(
        expect.objectContaining({
          payment_transaction_id: "txn_1",
        })
      )
    })

    it("logs warning on cancel failure but still returns data", async () => {
      vi.mocked(client.cancelOrder).mockRejectedValue(
        new Error("Already cancelled")
      )

      const result = await service.deletePayment({
        data: { payment_transaction_id: "txn_1" },
      } as any)

      expect(mockLogger.warn).toHaveBeenCalled()
      expect(result.data).toBeDefined()
    })
  })

  // ── getPaymentStatus ──

  describe("getPaymentStatus", () => {
    it("returns authorized for Completed order", async () => {
      vi.mocked(client.getCheckoutOrder).mockResolvedValue({
        OrderId: 123,
        MerchantReference: "sess_1",
        Status: "Completed",
        Country: "SE",
        Currency: "SEK",
        TotalPrice: 19900,
        OrderItems: [],
      })

      const result = await service.getPaymentStatus({
        data: { qliro_order_id: 123 },
      } as any)

      expect(result.status).toBe("authorized")
    })

    it("returns pending when no order ID", async () => {
      const result = await service.getPaymentStatus({
        data: {},
      } as any)

      expect(result.status).toBe("pending")
    })
  })

  // ── retrievePayment ──

  describe("retrievePayment", () => {
    it("fetches full Qliro order", async () => {
      vi.mocked(client.getCheckoutOrder).mockResolvedValue({
        OrderId: 123,
        MerchantReference: "sess_1",
        Status: "Completed",
        Country: "SE",
        Currency: "SEK",
        TotalPrice: 19900,
        OrderItems: [],
      })

      const result = await service.retrievePayment({
        data: { qliro_order_id: 123 },
      } as any)

      expect(result.data).toEqual(
        expect.objectContaining({
          qliro_order: expect.objectContaining({
            OrderId: 123,
          }),
        })
      )
    })
  })

  // ── updatePayment ──

  describe("updatePayment", () => {
    it("updates Qliro checkout with new cart data", async () => {
      vi.mocked(client.updateCheckoutOrder).mockResolvedValue(undefined)

      const result = await service.updatePayment({
        amount: 299,
        currency_code: "sek",
        data: { qliro_order_id: 123, session_id: "sess_1" },
        context: {},
      } as any)

      expect(client.updateCheckoutOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          OrderId: 123,
          OrderItems: expect.arrayContaining([
            expect.objectContaining({
              PricePerItemIncVat: 29900,
            }),
          ]),
        })
      )

      expect(result.data).toEqual(
        expect.objectContaining({
          qliro_order_id: 123,
        })
      )
    })

    it("returns data unchanged when no order ID", async () => {
      const result = await service.updatePayment({
        amount: 100,
        currency_code: "sek",
        data: { session_id: "sess_1" },
        context: {},
      } as any)

      expect(client.updateCheckoutOrder).not.toHaveBeenCalled()
      expect(result.data).toEqual({ session_id: "sess_1" })
    })
  })
})
