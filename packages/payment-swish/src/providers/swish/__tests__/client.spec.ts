import { describe, it, expect, vi, beforeEach } from "vitest"
import * as https from "https"
import * as fs from "fs"
import { SwishClient, SwishRequestError } from "../client"

vi.mock("fs", () => ({
  readFileSync: vi.fn().mockReturnValue(Buffer.from("fake-cert")),
}))

vi.mock("https", () => {
  const Agent = vi.fn()
  const request = vi.fn()
  return { Agent, request, default: { Agent, request } }
})

function setupMockRequest(
  statusCode: number,
  body: string,
  headers: Record<string, string> = {}
) {
  const mockReq = {
    on: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
  }

  const mockRes = {
    statusCode,
    headers,
    on: vi.fn((event: string, handler: (data?: string) => void) => {
      if (event === "data" && body) handler(body)
      if (event === "end") handler()
      return mockRes
    }),
  }

  vi.mocked(https.request).mockImplementation((_opts, callback) => {
    if (callback) (callback as any)(mockRes)
    return mockReq as any
  })

  return { mockReq, mockRes }
}

describe("SwishClient", () => {
  describe("constructor", () => {
    it("loads P12 cert and creates agent", () => {
      new SwishClient({
        certificatePath: "/certs/test.p12",
        certificatePassword: "secret",
        environment: "test",
      })

      expect(fs.readFileSync).toHaveBeenCalledWith("/certs/test.p12")
      expect(https.Agent).toHaveBeenCalledWith(
        expect.objectContaining({
          pfx: expect.any(Buffer),
          passphrase: "secret",
        })
      )
    })

    it("loads PEM cert", () => {
      new SwishClient({
        certificatePath: "/certs/test.pem",
        environment: "production",
      })

      expect(https.Agent).toHaveBeenCalledWith(
        expect.objectContaining({
          cert: expect.any(Buffer),
          key: expect.any(Buffer),
        })
      )
    })

    it("uses test base URL for test environment", () => {
      const client = new SwishClient({
        certificatePath: "/certs/test.p12",
        environment: "test",
      })
      expect((client as any).baseUrl).toContain("mss.cpc.getswish.net")
    })

    it("uses production base URL for production environment", () => {
      const client = new SwishClient({
        certificatePath: "/certs/prod.p12",
        environment: "production",
      })
      expect((client as any).baseUrl).toContain("cpc.getswish.net")
      expect((client as any).baseUrl).not.toContain("mss.")
    })
  })

  describe("createPaymentRequest", () => {
    it("extracts id from Location header and token", async () => {
      const client = new SwishClient({
        certificatePath: "/certs/test.p12",
        environment: "test",
      })

      setupMockRequest(201, "", {
        location: "https://mss.cpc.getswish.net/swish-cpcapi/api/v2/paymentrequests/ABC123",
        paymentrequesttoken: "tok-xyz",
      })

      const result = await client.createPaymentRequest({
        payeePaymentReference: "sess-1",
        callbackUrl: "https://example.com/hook",
        payeeAlias: "1234567890",
        amount: "100",
        currency: "SEK",
      })

      expect(result.id).toBe("ABC123")
      expect(result.token).toBe("tok-xyz")
    })
  })

  describe("getPaymentRequest", () => {
    it("parses JSON response", async () => {
      const client = new SwishClient({
        certificatePath: "/certs/test.p12",
        environment: "test",
      })

      const responseBody = JSON.stringify({
        id: "ABC123",
        status: "PAID",
        amount: 100,
      })

      setupMockRequest(200, responseBody)

      const result = await client.getPaymentRequest("ABC123")
      expect(result).toMatchObject({ id: "ABC123", status: "PAID" })
    })
  })

  describe("error handling", () => {
    it("throws SwishRequestError on 4xx", async () => {
      const client = new SwishClient({
        certificatePath: "/certs/test.p12",
        environment: "test",
      })

      const errorBody = JSON.stringify([
        { errorCode: "RP03", errorMessage: "Callback URL is missing" },
      ])

      setupMockRequest(422, errorBody)

      await expect(
        client.createPaymentRequest({
          payeePaymentReference: "x",
          callbackUrl: "",
          payeeAlias: "123",
          amount: "100",
          currency: "SEK",
        })
      ).rejects.toThrow(SwishRequestError)
    })
  })

  describe("cancelPaymentRequest", () => {
    it("sends PATCH with cancel payload", async () => {
      const client = new SwishClient({
        certificatePath: "/certs/test.p12",
        environment: "test",
      })

      const { mockReq } = setupMockRequest(200, "")

      await client.cancelPaymentRequest("ABC123")

      expect(mockReq.write).toHaveBeenCalledWith(
        JSON.stringify([
          { op: "replace", path: "/status", value: "cancelled" },
        ])
      )
    })
  })

  describe("createRefund", () => {
    it("extracts refund id from Location header", async () => {
      const client = new SwishClient({
        certificatePath: "/certs/test.p12",
        environment: "test",
      })

      setupMockRequest(201, "", {
        location: "https://mss.cpc.getswish.net/swish-cpcapi/api/v2/refunds/REF456",
      })

      const result = await client.createRefund({
        originalPaymentReference: "ref-abc",
        callbackUrl: "https://example.com/hook",
        payerAlias: "1234567890",
        amount: "50",
        currency: "SEK",
      })

      expect(result.id).toBe("REF456")
    })
  })
})
