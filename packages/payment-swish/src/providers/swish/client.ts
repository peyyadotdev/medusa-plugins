import * as https from "https"
import * as fs from "fs"
import type {
  SwishEnvironment,
  SwishPaymentRequest,
  SwishPaymentResponse,
  SwishRefundRequest,
  SwishRefundResponse,
  SwishApiError,
} from "./types"

const BASE_URLS: Record<SwishEnvironment, string> = {
  test: "https://mss.cpc.getswish.net/swish-cpcapi/api/v2",
  production: "https://cpc.getswish.net/swish-cpcapi/api/v2",
}

export class SwishClient {
  private baseUrl: string
  private agent: https.Agent

  constructor(options: {
    certificatePath: string
    certificatePassword?: string
    environment: SwishEnvironment
  }) {
    this.baseUrl = BASE_URLS[options.environment]

    const certBuffer = fs.readFileSync(options.certificatePath)
    const ext = options.certificatePath.toLowerCase()

    if (ext.endsWith(".p12") || ext.endsWith(".pfx")) {
      this.agent = new https.Agent({
        pfx: certBuffer,
        passphrase: options.certificatePassword,
      })
    } else {
      this.agent = new https.Agent({
        cert: certBuffer,
        key: certBuffer,
        passphrase: options.certificatePassword,
      })
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<{ status: number; headers: Record<string, string>; data: T }> {
    const url = new URL(`${this.baseUrl}${path}`)

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname,
          method,
          agent: this.agent,
          headers: {
            "Content-Type": "application/json",
            ...(body ? { "Content-Length": Buffer.byteLength(JSON.stringify(body)).toString() } : {}),
          },
        },
        (res) => {
          let data = ""
          res.on("data", (chunk) => (data += chunk))
          res.on("end", () => {
            const status = res.statusCode ?? 0
            const headers: Record<string, string> = {}
            for (const [key, value] of Object.entries(res.headers)) {
              if (typeof value === "string") {
                headers[key] = value
              }
            }

            if (status >= 400) {
              let errorData: SwishApiError[] | undefined
              try {
                errorData = JSON.parse(data) as SwishApiError[]
              } catch {
                // Response body may not be JSON
              }
              const message = errorData?.[0]?.errorMessage ?? `HTTP ${status}`
              reject(new SwishRequestError(message, status, errorData))
              return
            }

            let parsed: T = undefined as T
            if (data && status !== 201) {
              try {
                parsed = JSON.parse(data) as T
              } catch {
                // No JSON body (e.g. 201 with Location header)
              }
            }

            resolve({ status, headers, data: parsed })
          })
        }
      )

      req.on("error", reject)

      if (body) {
        req.write(JSON.stringify(body))
      }
      req.end()
    })
  }

  /**
   * POST /paymentrequests -- returns Location header with the payment request ID.
   * Swish returns 201 with no body; the ID is extracted from the Location header.
   */
  async createPaymentRequest(
    payload: SwishPaymentRequest
  ): Promise<{ id: string; token?: string }> {
    const { headers } = await this.request<void>(
      "POST",
      "/paymentrequests",
      payload
    )

    const location = headers["location"] ?? ""
    const id = location.split("/").pop() ?? ""
    const token = headers["paymentrequesttoken"]

    return { id, token }
  }

  async getPaymentRequest(id: string): Promise<SwishPaymentResponse> {
    const { data } = await this.request<SwishPaymentResponse>(
      "GET",
      `/paymentrequests/${id}`
    )
    return data
  }

  /**
   * PATCH /paymentrequests/{id} -- cancel a CREATED payment request.
   * Swish expects an array with a single op: replace status with "cancelled".
   */
  async cancelPaymentRequest(id: string): Promise<void> {
    await this.request<void>("PATCH", `/paymentrequests/${id}`, [
      { op: "replace", path: "/status", value: "cancelled" },
    ])
  }

  async createRefund(
    payload: SwishRefundRequest
  ): Promise<{ id: string }> {
    const { headers } = await this.request<void>(
      "POST",
      "/refunds",
      payload
    )

    const location = headers["location"] ?? ""
    const id = location.split("/").pop() ?? ""
    return { id }
  }

  async getRefund(id: string): Promise<SwishRefundResponse> {
    const { data } = await this.request<SwishRefundResponse>(
      "GET",
      `/refunds/${id}`
    )
    return data
  }
}

export class SwishRequestError extends Error {
  public statusCode: number
  public apiErrors?: SwishApiError[]

  constructor(
    message: string,
    statusCode: number,
    apiErrors?: SwishApiError[]
  ) {
    super(message)
    this.name = "SwishRequestError"
    this.statusCode = statusCode
    this.apiErrors = apiErrors
  }
}
