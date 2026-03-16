export type QliroEnvironment = "sandbox" | "production"

export type QliroOptions = {
  apiKey: string
  merchantId: string
  environment: QliroEnvironment
}

export type QliroOrderItem = {
  MerchantReference: string
  Description: string
  Quantity: number
  PricePerItemIncVat: number
  PricePerItemExVat: number
  Type:
    | "Product"
    | "Shipping"
    | "Fee"
    | "Discount"
    | "GiftCard"
    | "Rounding"
    | "PhysicalProduct"
    | "DigitalProduct"
}

export type QliroAddress = {
  FirstName?: string
  LastName?: string
  CareOf?: string
  Street?: string
  PostalCode?: string
  City?: string
  Country?: string
}

export type QliroCreateCheckoutOrderRequest = {
  MerchantReference: string
  Currency: string
  Country: string
  Language?: string
  OrderItems: QliroOrderItem[]
  MerchantConfirmationUrl: string
  MerchantCheckoutStatusPushUrl: string
  MerchantTermsUrl?: string
  MerchantNotificationUrl?: string
  BackToStoreUrl?: string
}

export type QliroCreateCheckoutOrderResponse = {
  OrderId: number
  MerchantReference: string
  HtmlSnippet: string
}

export type QliroGetOrderResponse = {
  OrderId: number
  MerchantReference: string
  Status:
    | "InProcess"
    | "OnHold"
    | "Completed"
    | "Refused"
    | "Cancelled"
  Country: string
  Currency: string
  TotalPrice: number
  CustomerEmail?: string
  CustomerMobileNumber?: string
  ShippingAddress?: QliroAddress
  BillingAddress?: QliroAddress
  OrderItems: QliroOrderItem[]
}

export type QliroUpdateCheckoutOrderRequest = {
  OrderId: number
  OrderItems: QliroOrderItem[]
}

/**
 * Qliro sends this payload to MerchantCheckoutStatusPushUrl when
 * the checkout status changes.
 */
export type QliroCheckoutStatusPushPayload = {
  OrderId: number
  MerchantReference: string
  Status:
    | "InProcess"
    | "OnHold"
    | "Completed"
    | "Refused"
    | "Cancelled"
  PaymentTransactionId?: string
}

export type QliroCapturePaymentRequest = {
  PaymentTransactionId: string
  RequestId: string
  Amount: number
}

export type QliroCapturePaymentResponse = {
  PaymentTransactionId: string
  RequestId: string
  Status: string
}

export type QliroRefundPaymentRequest = {
  PaymentTransactionId: string
  RequestId: string
  Amount: number
}

export type QliroRefundPaymentResponse = {
  PaymentTransactionId: string
  RequestId: string
  Status: string
}

export type QliroCancelOrderRequest = {
  PaymentTransactionId: string
  RequestId: string
}

export type QliroCancelOrderResponse = {
  PaymentTransactionId: string
  RequestId: string
  Status: string
}

export type QliroApiError = {
  ErrorCode: string
  ErrorMessage: string
  PropertyErrors?: Record<string, string[]>
}
