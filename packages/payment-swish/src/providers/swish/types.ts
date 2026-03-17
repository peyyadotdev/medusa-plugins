export type SwishEnvironment = "test" | "production"

export type SwishOptions = {
  certificatePath?: string
  certificateBase64?: string
  certificatePassword?: string
  callbackUrl: string
  payeeAlias: string
  environment: SwishEnvironment
}

export type SwishPaymentRequest = {
  payeePaymentReference: string
  callbackUrl: string
  payerAlias?: string
  payeeAlias: string
  amount: string
  currency: "SEK"
  message?: string
}

export type SwishPaymentResponse = {
  id: string
  payeePaymentReference: string
  paymentReference: string
  callbackUrl: string
  payerAlias: string
  payeeAlias: string
  amount: number
  currency: "SEK"
  message: string
  status: SwishPaymentStatus
  dateCreated: string
  datePaid?: string
  errorCode?: string
  errorMessage?: string
}

export type SwishPaymentStatus =
  | "CREATED"
  | "PAID"
  | "DECLINED"
  | "ERROR"
  | "CANCELLED"

export type SwishCallback = {
  id: string
  payeePaymentReference: string
  paymentReference: string
  callbackUrl: string
  payerAlias: string
  payeeAlias: string
  amount: number
  currency: "SEK"
  message: string
  status: SwishPaymentStatus
  dateCreated: string
  datePaid?: string
  errorCode?: string
  errorMessage?: string
  originalPaymentReference?: string
}

export type SwishRefundRequest = {
  originalPaymentReference: string
  callbackUrl: string
  payerAlias: string
  payeeAlias?: string
  amount: string
  currency: "SEK"
  message?: string
  payerPaymentReference?: string
}

export type SwishRefundResponse = {
  id: string
  originalPaymentReference: string
  payerPaymentReference?: string
  callbackUrl: string
  payerAlias: string
  payeeAlias?: string
  amount: number
  currency: "SEK"
  message: string
  status: SwishPaymentStatus
  dateCreated: string
  datePaid?: string
  errorCode?: string
  errorMessage?: string
}

export type SwishApiError = {
  errorCode: string
  errorMessage: string
  additionalInformation?: string
}
