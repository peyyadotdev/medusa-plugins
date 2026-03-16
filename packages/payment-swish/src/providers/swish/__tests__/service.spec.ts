import { describe, it, expect, vi } from "vitest"
import { PaymentSessionStatus } from "@medusajs/framework/utils"
import SwishProviderService from "../service"
import type { SwishCallback } from "../types"

vi.mock("../client", () => {
  class SwishClient {
    createPaymentRequest = vi.fn()
    getPaymentRequest = vi.fn()
    cancelPaymentRequest = vi.fn()
    createRefund = vi.fn()
    getRefund = vi.fn()
  }
  return { SwishClient }
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
    certificatePath: "/certs/test.p12",
    certificatePassword: "test",
    callbackUrl: "https://example.com/hooks/payment/swish_swish",
    payeeAlias: "1234567890",
    environment: "test" as const,
    ...optionsOverride,
  }

  const service = new SwishProviderService(container as any, options)
  return { service, container }
}

describe("SwishProviderService", () => {
  describe("validateOptions", () => {
    it("throws when certificatePath is missing", () => {
      expect(() =>
        SwishProviderService.validateOptions({
          callbackUrl: "https://example.com",
          payeeAlias: "123",
        })
      ).toThrow("certificatePath")
    })

    it("throws when callbackUrl is missing", () => {
      expect(() =>
        SwishProviderService.validateOptions({
          certificatePath: "/cert.p12",
          payeeAlias: "123",
        })
      ).toThrow("callbackUrl")
    })

    it("throws when payeeAlias is missing", () => {
      expect(() =>
        SwishProviderService.validateOptions({
          certificatePath: "/cert.p12",
          callbackUrl: "https://example.com",
        })
      ).toThrow("payeeAlias")
    })

    it("passes with valid options", () => {
      expect(() =>
        SwishProviderService.validateOptions({
          certificatePath: "/cert.p12",
          callbackUrl: "https://example.com",
          payeeAlias: "1234567890",
        })
      ).not.toThrow()
    })
  })

  describe("initiatePayment", () => {
    it("creates a payment request and returns session data", async () => {
      const { service } = createService()
      const client = (service as any).client_
      client.createPaymentRequest.mockResolvedValue({
        id: "req-123",
        token: "tok-abc",
      })

      const result = await service.initiatePayment({
        amount: 199.5,
        currency_code: "SEK",
        context: { session_id: "sess-001" } as any,
      })

      expect(result.id).toBe("req-123")
      expect(result.data).toMatchObject({
        swish_id: "req-123",
        token: "tok-abc",
        session_id: "sess-001",
        swish_amount: "199.50",
        currency_code: "SEK",
      })

      expect(client.createPaymentRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          payeePaymentReference: "sess-001",
          payeeAlias: "1234567890",
          amount: "199.50",
          currency: "SEK",
        })
      )
    })

    it("preserves öre in decimal amounts", async () => {
      const { service } = createService()
      const client = (service as any).client_
      client.createPaymentRequest.mockResolvedValue({ id: "x", token: "y" })

      await service.initiatePayment({
        amount: 99.99,
        currency_code: "SEK",
        context: {} as any,
      })

      expect(client.createPaymentRequest).toHaveBeenCalledWith(
        expect.objectContaining({ amount: "99.99" })
      )
    })

    it("formats whole amounts with two decimals", async () => {
      const { service } = createService()
      const client = (service as any).client_
      client.createPaymentRequest.mockResolvedValue({ id: "x", token: "y" })

      await service.initiatePayment({
        amount: 100,
        currency_code: "SEK",
        context: {} as any,
      })

      expect(client.createPaymentRequest).toHaveBeenCalledWith(
        expect.objectContaining({ amount: "100.00" })
      )
    })
  })

  describe("authorizePayment", () => {
    it("returns pending status", async () => {
      const { service } = createService()
      const result = await service.authorizePayment({
        data: { swish_id: "req-123" },
      })
      expect(result.status).toBe(PaymentSessionStatus.PENDING)
      expect(result.data).toMatchObject({ swish_id: "req-123" })
    })
  })

  describe("getWebhookActionAndData", () => {
    function makePayload(callback: SwishCallback) {
      return {
        data: {},
        rawData: JSON.stringify(callback),
        headers: {},
      }
    }

    const baseCallback: SwishCallback = {
      id: "cb-1",
      payeePaymentReference: "sess-001",
      paymentReference: "ref-abc",
      callbackUrl: "https://example.com",
      payerAlias: "46701234567",
      payeeAlias: "1234567890",
      amount: 200,
      currency: "SEK",
      message: "Test",
      status: "PAID",
      dateCreated: "2025-01-01T00:00:00Z",
    }

    it("maps PAID to authorized", async () => {
      const { service } = createService()
      const result = await service.getWebhookActionAndData(
        makePayload({ ...baseCallback, status: "PAID" })
      )
      expect(result.action).toBe("authorized")
      expect(result.data?.session_id).toBe("sess-001")
    })

    it("maps DECLINED to failed", async () => {
      const { service } = createService()
      const result = await service.getWebhookActionAndData(
        makePayload({ ...baseCallback, status: "DECLINED" })
      )
      expect(result.action).toBe("failed")
    })

    it("maps ERROR to failed", async () => {
      const { service } = createService()
      const result = await service.getWebhookActionAndData(
        makePayload({ ...baseCallback, status: "ERROR" })
      )
      expect(result.action).toBe("failed")
    })

    it("maps CANCELLED to failed", async () => {
      const { service } = createService()
      const result = await service.getWebhookActionAndData(
        makePayload({ ...baseCallback, status: "CANCELLED" })
      )
      expect(result.action).toBe("failed")
    })

    it("maps CREATED to not_supported", async () => {
      const { service } = createService()
      const result = await service.getWebhookActionAndData(
        makePayload({ ...baseCallback, status: "CREATED" })
      )
      expect(result.action).toBe("not_supported")
    })

    it("returns not_supported for refund callbacks", async () => {
      const { service } = createService()
      const refundCallback: SwishCallback = {
        ...baseCallback,
        status: "PAID",
        originalPaymentReference: "ref-abc",
      }
      const result = await service.getWebhookActionAndData(
        makePayload(refundCallback)
      )
      expect(result.action).toBe("not_supported")
    })
  })

  describe("capturePayment", () => {
    it("is a no-op that returns existing data", async () => {
      const { service } = createService()
      const data = { swish_id: "req-123" }
      const result = await service.capturePayment({ data })
      expect(result.data).toMatchObject(data)
    })
  })

  describe("refundPayment", () => {
    it("fetches paymentReference from Swish API and calls refund", async () => {
      const { service } = createService()
      const client = (service as any).client_
      client.getPaymentRequest.mockResolvedValue({
        paymentReference: "ref-abc",
        status: "PAID",
      })
      client.createRefund.mockResolvedValue({ id: "refund-1" })

      const result = await service.refundPayment({
        data: { swish_id: "req-123" },
        amount: 50.50,
      })

      expect(client.getPaymentRequest).toHaveBeenCalledWith("req-123")
      expect(client.createRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          originalPaymentReference: "ref-abc",
          amount: "50.50",
          currency: "SEK",
        })
      )
      expect(result.data).toMatchObject({
        swish_id: "req-123",
        refund_id: "refund-1",
        refund_amount: "50.50",
      })
    })

    it("throws when swish_id is missing", async () => {
      const { service } = createService()
      await expect(
        service.refundPayment({ data: {}, amount: 50 })
      ).rejects.toThrow("Missing swish_id")
    })

    it("throws when payment has no paymentReference yet", async () => {
      const { service } = createService()
      const client = (service as any).client_
      client.getPaymentRequest.mockResolvedValue({
        paymentReference: undefined,
        status: "CREATED",
      })

      await expect(
        service.refundPayment({ data: { swish_id: "req-123" }, amount: 50 })
      ).rejects.toThrow("no paymentReference")
    })
  })

  describe("cancelPayment", () => {
    it("calls cancel on the Swish API", async () => {
      const { service } = createService()
      const client = (service as any).client_
      client.cancelPaymentRequest.mockResolvedValue(undefined)

      await service.cancelPayment({
        data: { swish_id: "req-123" },
      })

      expect(client.cancelPaymentRequest).toHaveBeenCalledWith("req-123")
    })

    it("warns and returns data if cancel fails", async () => {
      const { service, container } = createService()
      const client = (service as any).client_
      client.cancelPaymentRequest.mockRejectedValue(new Error("already paid"))

      const result = await service.cancelPayment({
        data: { swish_id: "req-123" },
      })

      expect(container.logger.warn).toHaveBeenCalled()
      expect(result.data).toMatchObject({ swish_id: "req-123" })
    })
  })

  describe("getPaymentStatus", () => {
    it("maps PAID to authorized", async () => {
      const { service } = createService()
      const client = (service as any).client_
      client.getPaymentRequest.mockResolvedValue({ status: "PAID" })

      const result = await service.getPaymentStatus({
        data: { swish_id: "req-123" },
      })
      expect(result.status).toBe(PaymentSessionStatus.AUTHORIZED)
    })

    it("maps CREATED to pending", async () => {
      const { service } = createService()
      const client = (service as any).client_
      client.getPaymentRequest.mockResolvedValue({ status: "CREATED" })

      const result = await service.getPaymentStatus({
        data: { swish_id: "req-123" },
      })
      expect(result.status).toBe(PaymentSessionStatus.PENDING)
    })

    it("maps DECLINED to error", async () => {
      const { service } = createService()
      const client = (service as any).client_
      client.getPaymentRequest.mockResolvedValue({ status: "DECLINED" })

      const result = await service.getPaymentStatus({
        data: { swish_id: "req-123" },
      })
      expect(result.status).toBe(PaymentSessionStatus.ERROR)
    })

    it("returns pending when no swish_id", async () => {
      const { service } = createService()
      const result = await service.getPaymentStatus({ data: {} })
      expect(result.status).toBe(PaymentSessionStatus.PENDING)
    })
  })

  describe("retrievePayment", () => {
    it("fetches payment and merges data", async () => {
      const { service } = createService()
      const client = (service as any).client_
      client.getPaymentRequest.mockResolvedValue({
        status: "PAID",
        paymentReference: "ref-abc",
      })

      const result = await service.retrievePayment({
        data: { swish_id: "req-123" },
      })
      expect(result.data).toMatchObject({
        swish_id: "req-123",
        swish_status: "PAID",
        swish_payment_reference: "ref-abc",
      })
    })

    it("returns input data when no swish_id", async () => {
      const { service } = createService()
      const result = await service.retrievePayment({
        data: { some: "data" },
      })
      expect(result.data).toMatchObject({ some: "data" })
    })
  })

  describe("updatePayment", () => {
    it("cancels old request and creates new one", async () => {
      const { service } = createService()
      const client = (service as any).client_
      client.cancelPaymentRequest.mockResolvedValue(undefined)
      client.createPaymentRequest.mockResolvedValue({
        id: "req-new",
        token: "tok-new",
      })

      const result = await service.updatePayment({
        data: { swish_id: "req-old" },
        amount: 300,
        currency_code: "SEK",
        context: { session_id: "sess-002" } as any,
      })

      expect(client.cancelPaymentRequest).toHaveBeenCalledWith("req-old")
      expect(result.data).toMatchObject({ swish_id: "req-new" })
    })

    it("preserves decimal amounts", async () => {
      const { service } = createService()
      const client = (service as any).client_
      client.createPaymentRequest.mockResolvedValue({
        id: "req-new",
        token: "tok-new",
      })

      await service.updatePayment({
        data: {},
        amount: 149.90,
        currency_code: "SEK",
        context: {} as any,
      })

      expect(client.createPaymentRequest).toHaveBeenCalledWith(
        expect.objectContaining({ amount: "149.90" })
      )
    })
  })

  describe("deletePayment", () => {
    it("attempts to cancel the payment request", async () => {
      const { service } = createService()
      const client = (service as any).client_
      client.cancelPaymentRequest.mockResolvedValue(undefined)

      await service.deletePayment({
        data: { swish_id: "req-123" },
      })

      expect(client.cancelPaymentRequest).toHaveBeenCalledWith("req-123")
    })
  })
})
