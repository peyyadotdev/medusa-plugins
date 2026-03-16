import type {
  KlarnaEnvironment,
  KlarnaRegion,
  KlarnaCreateOrderRequest,
  KlarnaCreateOrderResponse,
  KlarnaGetOrderResponse,
  KlarnaUpdateOrderRequest,
  KlarnaManagedOrder,
  KlarnaCaptureRequest,
  KlarnaRefundRequest,
  KlarnaApiError,
} from "./types"

const BASE_URLS: Record<KlarnaEnvironment, Record<KlarnaRegion, string>> = {
  playground: {
    eu: "https://api.playground.klarna.com",
    na: "https://api-na.playground.klarna.com",
    oc: "https://api-oc.playground.klarna.com",
  },
  production: {
    eu: "https://api.klarna.com",
    na: "https://api-na.klarna.com",
    oc: "https://api-oc.klarna.com",
  },
}

export class KlarnaClient {
  private baseUrl: string
  private authHeader: string

  constructor(options: {
    username: string
    password: string
    region: KlarnaRegion
    environment: KlarnaEnvironment
  }) {
    this.baseUrl = BASE_URLS[options.environment][options.region]
    const credentials = Buffer.from(
      `${options.username}:${options.password}`
    ).toString("base64")
    this.authHeader = `Basic ${credentials}`
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: this.authHeader,
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      let errorData: KlarnaApiError | undefined
      try {
        errorData = (await response.json()) as KlarnaApiError
      } catch {
        // Response body may not be JSON
      }

      const message = errorData?.error_messages?.join("; ") ?? response.statusText
      throw new KlarnaRequestError(
        `Klarna API error (${response.status}): ${message}`,
        response.status,
        errorData
      )
    }

    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return undefined as T
    }

    return (await response.json()) as T
  }

  // ── Checkout API v3 ──

  async createOrder(
    data: KlarnaCreateOrderRequest
  ): Promise<KlarnaCreateOrderResponse> {
    return this.request<KlarnaCreateOrderResponse>(
      "POST",
      "/checkout/v3/orders",
      data
    )
  }

  async getOrder(orderId: string): Promise<KlarnaGetOrderResponse> {
    return this.request<KlarnaGetOrderResponse>(
      "GET",
      `/checkout/v3/orders/${orderId}`
    )
  }

  async updateOrder(
    orderId: string,
    data: KlarnaUpdateOrderRequest
  ): Promise<KlarnaGetOrderResponse> {
    return this.request<KlarnaGetOrderResponse>(
      "POST",
      `/checkout/v3/orders/${orderId}`,
      data
    )
  }

  // ── Order Management API ──

  async getManagedOrder(orderId: string): Promise<KlarnaManagedOrder> {
    return this.request<KlarnaManagedOrder>(
      "GET",
      `/ordermanagement/v1/orders/${orderId}`
    )
  }

  async acknowledgeOrder(orderId: string): Promise<void> {
    await this.request<void>(
      "POST",
      `/ordermanagement/v1/orders/${orderId}/acknowledge`
    )
  }

  async captureOrder(
    orderId: string,
    data: KlarnaCaptureRequest
  ): Promise<void> {
    await this.request<void>(
      "POST",
      `/ordermanagement/v1/orders/${orderId}/captures`,
      data
    )
  }

  async refundOrder(
    orderId: string,
    data: KlarnaRefundRequest
  ): Promise<void> {
    await this.request<void>(
      "POST",
      `/ordermanagement/v1/orders/${orderId}/refunds`,
      data
    )
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this.request<void>(
      "POST",
      `/ordermanagement/v1/orders/${orderId}/cancel`
    )
  }

  async extendAuthorizationTime(orderId: string): Promise<void> {
    await this.request<void>(
      "POST",
      `/ordermanagement/v1/orders/${orderId}/extend-authorization-time`
    )
  }
}

export class KlarnaRequestError extends Error {
  public statusCode: number
  public apiError?: KlarnaApiError

  constructor(
    message: string,
    statusCode: number,
    apiError?: KlarnaApiError
  ) {
    super(message)
    this.name = "KlarnaRequestError"
    this.statusCode = statusCode
    this.apiError = apiError
  }
}
