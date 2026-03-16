export type KlarnaRegion = "eu" | "na" | "oc"

export type KlarnaEnvironment = "playground" | "production"

export type KlarnaOptions = {
  username: string
  password: string
  region: KlarnaRegion
  environment: KlarnaEnvironment
}

// ── Checkout API v3 ──

export type KlarnaOrderLine = {
  type?: "physical" | "discount" | "shipping_fee" | "sales_tax" | "digital" | "gift_card" | "store_credit" | "surcharge"
  name: string
  quantity: number
  unit_price: number
  total_amount: number
  total_tax_amount: number
  tax_rate?: number
  reference?: string
}

export type KlarnaAddress = {
  given_name?: string
  family_name?: string
  email?: string
  street_address?: string
  postal_code?: string
  city?: string
  country?: string
  phone?: string
}

export type KlarnaCreateOrderRequest = {
  purchase_country: string
  purchase_currency: string
  locale?: string
  order_amount: number
  order_tax_amount: number
  order_lines: KlarnaOrderLine[]
  merchant_reference1?: string
  merchant_reference2?: string
  merchant_urls: {
    terms?: string
    checkout?: string
    confirmation?: string
    push?: string
  }
  billing_address?: KlarnaAddress
  shipping_address?: KlarnaAddress
}

export type KlarnaCreateOrderResponse = {
  order_id: string
  status: KlarnaCheckoutStatus
  html_snippet: string
  purchase_country: string
  purchase_currency: string
  order_amount: number
  merchant_reference1?: string
}

export type KlarnaCheckoutStatus =
  | "checkout_incomplete"
  | "checkout_complete"

export type KlarnaGetOrderResponse = {
  order_id: string
  status: KlarnaCheckoutStatus
  purchase_country: string
  purchase_currency: string
  order_amount: number
  order_tax_amount: number
  order_lines: KlarnaOrderLine[]
  merchant_reference1?: string
  merchant_reference2?: string
  html_snippet: string
  billing_address?: KlarnaAddress
  shipping_address?: KlarnaAddress
  started_at?: string
  completed_at?: string
}

export type KlarnaUpdateOrderRequest = {
  order_amount: number
  order_tax_amount: number
  order_lines: KlarnaOrderLine[]
  purchase_country?: string
  purchase_currency?: string
  merchant_reference1?: string
}

// ── Order Management API ──

export type KlarnaOrderManagementStatus =
  | "AUTHORIZED"
  | "PART_CAPTURED"
  | "CAPTURED"
  | "CANCELLED"
  | "EXPIRED"
  | "CLOSED"

export type KlarnaManagedOrder = {
  order_id: string
  status: KlarnaOrderManagementStatus
  order_amount: number
  original_order_amount: number
  captured_amount: number
  refunded_amount: number
  remaining_authorized_amount: number
  purchase_currency: string
  merchant_reference1?: string
  merchant_reference2?: string
  captures?: KlarnaCapture[]
  refunds?: KlarnaRefund[]
}

export type KlarnaCapture = {
  capture_id: string
  captured_amount: number
  captured_at: string
}

export type KlarnaRefund = {
  refund_id: string
  refunded_amount: number
  refunded_at: string
}

export type KlarnaCaptureRequest = {
  captured_amount: number
  description?: string
  order_lines?: KlarnaOrderLine[]
}

export type KlarnaRefundRequest = {
  refunded_amount: number
  description?: string
  order_lines?: KlarnaOrderLine[]
}

// ── Webhook / Push ──

export type KlarnaPushPayload = {
  order_id: string
}

// ── Customer Token ──

export type KlarnaCustomerTokenResponse = {
  token_id: string
  status: "ACTIVE" | "CANCELLED"
  payment_method_type: string
}

// ── API Errors ──

export type KlarnaApiError = {
  error_code: string
  error_messages: string[]
  correlation_id: string
}
