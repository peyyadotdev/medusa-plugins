import type {
  QliroEnvironment,
  QliroCreateCheckoutOrderRequest,
  QliroCreateCheckoutOrderResponse,
  QliroGetOrderResponse,
  QliroUpdateCheckoutOrderRequest,
  QliroCapturePaymentRequest,
  QliroCapturePaymentResponse,
  QliroRefundPaymentRequest,
  QliroRefundPaymentResponse,
  QliroCancelOrderRequest,
  QliroCancelOrderResponse,
  QliroApiError,
} from "./types"

const BASE_URLS: Record<QliroEnvironment, string> = {
  sandbox: "https://checkout-api.sandbox.qliro.com",
  production: "https://checkout-api.qliro.com",
}

export class QliroClient {
  private baseUrl: string
  private apiKey: string
  private merchantId: string

  constructor(options: {
    apiKey: string
    merchantId: string
    environment: QliroEnvironment
  }) {
    this.baseUrl = BASE_URLS[options.environment]
    this.apiKey = options.apiKey
    this.merchantId = options.merchantId
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      "X-Merchant-Id": this.merchantId,
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      let errorData: QliroApiError | undefined
      try {
        errorData = (await response.json()) as QliroApiError
      } catch {
        // Response body may not be JSON
      }

      const message = errorData?.ErrorMessage ?? response.statusText
      throw new QliroRequestError(
        `Qliro API error (${response.status}): ${message}`,
        response.status,
        errorData
      )
    }

    if (response.status === 204) {
      return undefined as T
    }

    return (await response.json()) as T
  }

  // ── Checkout API ──

  async createCheckoutOrder(
    data: QliroCreateCheckoutOrderRequest
  ): Promise<QliroCreateCheckoutOrderResponse> {
    return this.request<QliroCreateCheckoutOrderResponse>(
      "POST",
      "/v1/checkout/order",
      data
    )
  }

  async getCheckoutOrder(
    orderId: number
  ): Promise<QliroGetOrderResponse> {
    return this.request<QliroGetOrderResponse>(
      "GET",
      `/v1/checkout/order/${orderId}`
    )
  }

  async updateCheckoutOrder(
    data: QliroUpdateCheckoutOrderRequest
  ): Promise<void> {
    await this.request<void>("PUT", "/v1/checkout/order", data)
  }

  // ── Order Management API ──

  async capturePayment(
    data: QliroCapturePaymentRequest
  ): Promise<QliroCapturePaymentResponse> {
    return this.request<QliroCapturePaymentResponse>(
      "POST",
      "/v1/ordermanagement/capture",
      data
    )
  }

  async refundPayment(
    data: QliroRefundPaymentRequest
  ): Promise<QliroRefundPaymentResponse> {
    return this.request<QliroRefundPaymentResponse>(
      "POST",
      "/v1/ordermanagement/refund",
      data
    )
  }

  async cancelOrder(
    data: QliroCancelOrderRequest
  ): Promise<QliroCancelOrderResponse> {
    return this.request<QliroCancelOrderResponse>(
      "POST",
      "/v1/ordermanagement/cancel",
      data
    )
  }
}

export class QliroRequestError extends Error {
  public statusCode: number
  public apiError?: QliroApiError

  constructor(
    message: string,
    statusCode: number,
    apiError?: QliroApiError
  ) {
    super(message)
    this.name = "QliroRequestError"
    this.statusCode = statusCode
    this.apiError = apiError
  }
}
