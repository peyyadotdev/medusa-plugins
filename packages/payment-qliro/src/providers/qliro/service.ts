import {
  AbstractPaymentProvider,
  MedusaError,
} from "@medusajs/framework/utils"
import { BigNumber } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/framework/types"
import type {
  InitiatePaymentInput,
  InitiatePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  ProviderWebhookPayload,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { QliroClient, QliroRequestError } from "./client"
import { toMinorUnits, fromMinorUnits } from "./currency"
import type { QliroOptions, QliroCheckoutStatusPushPayload } from "./types"

type InjectedDependencies = {
  logger: Logger
  pluginSettings?: {
    getDecryptedSettings: (id: string) => Promise<Record<string, unknown> | null>
    markVerified: (id: string) => Promise<void>
  }
}

class QliroProviderService extends AbstractPaymentProvider<QliroOptions> {
  static identifier = "qliro"

  protected logger_: Logger
  protected options_: QliroOptions
  protected client: QliroClient
  private settingsService_: InjectedDependencies["pluginSettings"]
  private cachedConfig_: QliroOptions | null = null
  private configCacheExpiry_ = 0

  static validateOptions(options: Record<any, any>) {
    if (!options.apiKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Qliro API key is required in the provider's options."
      )
    }
    if (!options.merchantId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Qliro merchant ID is required in the provider's options."
      )
    }
  }

  constructor(container: InjectedDependencies, options: QliroOptions) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options
    try {
      this.settingsService_ = container.pluginSettings
    } catch {
      this.settingsService_ = undefined
    }
    this.client = new QliroClient({
      apiKey: options.apiKey,
      merchantId: options.merchantId,
      environment: options.environment ?? "sandbox",
    })
  }

  private async getEffectiveConfig(): Promise<QliroOptions> {
    if (!this.settingsService_) return this.options_

    const now = Date.now()
    if (this.cachedConfig_ && now < this.configCacheExpiry_) {
      return this.cachedConfig_
    }

    try {
      const dbSettings = await this.settingsService_.getDecryptedSettings("qliro")
      if (dbSettings?.apiKey && dbSettings?.merchantId) {
        this.cachedConfig_ = {
          ...this.options_,
          ...(dbSettings as unknown as Partial<QliroOptions>),
        }
        this.configCacheExpiry_ = now + 60_000
        return this.cachedConfig_
      }
    } catch (err) {
      this.logger_.warn(`Failed to load Qliro settings from DB: ${err}`)
    }

    return this.options_
  }

  private async getClient(): Promise<QliroClient> {
    const config = await this.getEffectiveConfig()
    if (
      config.apiKey !== this.options_.apiKey ||
      config.merchantId !== this.options_.merchantId ||
      config.environment !== this.options_.environment
    ) {
      return new QliroClient({
        apiKey: config.apiKey,
        merchantId: config.merchantId,
        environment: config.environment ?? "sandbox",
      })
    }
    return this.client
  }

  // ── Phase 4.2: initiatePayment ──

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const { amount, currency_code, data } = input
    const sessionId = data?.session_id as string

    const totalPrice = toMinorUnits(
      Number(amount),
      currency_code
    )

    const country = this.resolveCountry(currency_code)

    try {
      const response = await this.client.createCheckoutOrder({
        MerchantReference: sessionId,
        Currency: currency_code.toUpperCase(),
        Country: country,
        OrderItems: [
          {
            MerchantReference: sessionId,
            Description: "Order",
            Quantity: 1,
            PricePerItemIncVat: totalPrice,
            PricePerItemExVat: totalPrice,
            Type: "Product",
          },
        ],
        MerchantConfirmationUrl:
          (data?.confirmation_url as string) ?? "",
        MerchantCheckoutStatusPushUrl:
          (data?.webhook_url as string) ?? "",
      })

      return {
        id: String(response.OrderId),
        data: {
          qliro_order_id: response.OrderId,
          merchant_reference: response.MerchantReference,
          html_snippet: response.HtmlSnippet,
          session_id: sessionId,
        },
      }
    } catch (error) {
      throw this.buildError("Failed to create Qliro checkout", error as Error)
    }
  }

  // ── Phase 4.3: authorizePayment ──

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const qliroOrderId = input.data?.qliro_order_id as number

    if (!qliroOrderId) {
      return {
        data: input.data as Record<string, unknown>,
        status: "error",
      }
    }

    try {
      const order = await this.client.getCheckoutOrder(qliroOrderId)

      const status = this.mapQliroStatusToMedusa(order.Status)

      return {
        data: {
          ...input.data as Record<string, unknown>,
          qliro_status: order.Status,
          payment_transaction_id:
            (input.data as Record<string, unknown>)?.payment_transaction_id,
        },
        status,
      }
    } catch (error) {
      this.logger_.error(
        `Failed to authorize Qliro order ${qliroOrderId}`,
        error as Error
      )
      return {
        data: input.data as Record<string, unknown>,
        status: "error",
      }
    }
  }

  // ── Phase 4.4: getWebhookActionAndData ──

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const { data } = payload
    const webhookData = data as unknown as QliroCheckoutStatusPushPayload

    if (!webhookData?.MerchantReference || !webhookData?.Status) {
      this.logger_.warn("Qliro webhook missing required fields")
      return { action: "not_supported" }
    }

    const sessionId = webhookData.MerchantReference

    try {
      switch (webhookData.Status) {
        case "Completed":
          return {
            action: "authorized",
            data: {
              session_id: sessionId,
              amount: await this.getOrderAmount(webhookData.OrderId),
            },
          }

        case "Refused":
        case "Cancelled":
          return {
            action: "failed",
            data: {
              session_id: sessionId,
              amount: new BigNumber(0),
            },
          }

        case "InProcess":
        case "OnHold":
          return { action: "not_supported" }

        default:
          return { action: "not_supported" }
      }
    } catch (error) {
      this.logger_.error("Failed to process Qliro webhook", error as Error)
      return {
        action: "failed",
        data: {
          session_id: sessionId,
          amount: new BigNumber(0),
        },
      }
    }
  }

  // ── Phase 4.5: capturePayment, refundPayment, cancelPayment ──

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    const paymentData = input.data as Record<string, unknown>
    const transactionId = paymentData?.payment_transaction_id as string
    const qliroOrderId = paymentData?.qliro_order_id as number

    if (!transactionId && !qliroOrderId) {
      throw this.buildError(
        "Missing payment_transaction_id or qliro_order_id for capture",
        new Error("Missing identifiers")
      )
    }

    try {
      const txId = transactionId ?? String(qliroOrderId)

      const order = await this.client.getCheckoutOrder(qliroOrderId)
      const captureAmount = order.TotalPrice

      const result = await this.client.capturePayment({
        PaymentTransactionId: txId,
        RequestId: this.generateRequestId(),
        Amount: captureAmount,
      })

      return {
        data: {
          ...paymentData,
          payment_transaction_id: result.PaymentTransactionId,
          capture_status: result.Status,
        },
      }
    } catch (error) {
      throw this.buildError("Failed to capture Qliro payment", error as Error)
    }
  }

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    const paymentData = input.data as Record<string, unknown>
    const transactionId = paymentData?.payment_transaction_id as string

    if (!transactionId) {
      throw this.buildError(
        "Missing payment_transaction_id for refund",
        new Error("Missing identifier")
      )
    }

    const refundAmount = toMinorUnits(
      Number(input.amount),
      this.getCurrencyFromData(paymentData)
    )

    try {
      const result = await this.client.refundPayment({
        PaymentTransactionId: transactionId,
        RequestId: this.generateRequestId(),
        Amount: refundAmount,
      })

      return {
        data: {
          ...paymentData,
          refund_status: result.Status,
        },
      }
    } catch (error) {
      throw this.buildError("Failed to refund Qliro payment", error as Error)
    }
  }

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    const paymentData = input.data as Record<string, unknown>
    const transactionId = paymentData?.payment_transaction_id as string

    if (!transactionId) {
      return { data: paymentData }
    }

    try {
      await this.client.cancelOrder({
        PaymentTransactionId: transactionId,
        RequestId: this.generateRequestId(),
      })

      return {
        data: {
          ...paymentData,
          qliro_status: "Cancelled",
        },
      }
    } catch (error) {
      throw this.buildError("Failed to cancel Qliro order", error as Error)
    }
  }

  // ── Phase 4.6: deletePayment, getPaymentStatus, retrievePayment, updatePayment ──

  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    const paymentData = input.data as Record<string, unknown>
    const transactionId = paymentData?.payment_transaction_id as string

    if (transactionId) {
      try {
        await this.client.cancelOrder({
          PaymentTransactionId: transactionId,
          RequestId: this.generateRequestId(),
        })
      } catch (error) {
        this.logger_.warn(
          `Failed to release Qliro order on delete: ${(error as Error).message}`
        )
      }
    }

    return { data: paymentData }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const qliroOrderId = (input.data as Record<string, unknown>)
      ?.qliro_order_id as number

    if (!qliroOrderId) {
      return { status: "pending" }
    }

    try {
      const order = await this.client.getCheckoutOrder(qliroOrderId)
      return { status: this.mapQliroStatusToMedusa(order.Status) }
    } catch (error) {
      this.logger_.error(
        `Failed to get Qliro order status for ${qliroOrderId}`,
        error as Error
      )
      return { status: "error" }
    }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    const qliroOrderId = (input.data as Record<string, unknown>)
      ?.qliro_order_id as number

    if (!qliroOrderId) {
      return { data: input.data as Record<string, unknown> }
    }

    try {
      const order = await this.client.getCheckoutOrder(qliroOrderId)
      return {
        data: {
          ...(input.data as Record<string, unknown>),
          qliro_order: order,
        },
      }
    } catch (error) {
      throw this.buildError("Failed to retrieve Qliro order", error as Error)
    }
  }

  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    const { amount, currency_code, data } = input
    const paymentData = data as Record<string, unknown>
    const qliroOrderId = paymentData?.qliro_order_id as number

    if (!qliroOrderId) {
      return { data: paymentData }
    }

    const totalPrice = toMinorUnits(Number(amount), currency_code)

    try {
      await this.client.updateCheckoutOrder({
        OrderId: qliroOrderId,
        OrderItems: [
          {
            MerchantReference:
              (paymentData?.session_id as string) ?? "",
            Description: "Order",
            Quantity: 1,
            PricePerItemIncVat: totalPrice,
            PricePerItemExVat: totalPrice,
            Type: "Product",
          },
        ],
      })

      return { data: paymentData }
    } catch (error) {
      throw this.buildError("Failed to update Qliro checkout", error as Error)
    }
  }

  // ── Helpers ──

  private mapQliroStatusToMedusa(
    status: string
  ): "authorized" | "captured" | "pending" | "canceled" | "error" {
    switch (status) {
      case "Completed":
        return "authorized"
      case "Cancelled":
        return "canceled"
      case "Refused":
        return "error"
      case "InProcess":
      case "OnHold":
      default:
        return "pending"
    }
  }

  private async getOrderAmount(orderId: number): Promise<BigNumber> {
    try {
      const order = await this.client.getCheckoutOrder(orderId)
      const currency = order.Currency?.toLowerCase() ?? "sek"
      return new BigNumber(fromMinorUnits(order.TotalPrice, currency))
    } catch {
      return new BigNumber(0)
    }
  }

  private resolveCountry(currencyCode: string): string {
    const map: Record<string, string> = {
      sek: "SE",
      nok: "NO",
      dkk: "DK",
      eur: "FI",
    }
    return map[currencyCode.toLowerCase()] ?? "SE"
  }

  private getCurrencyFromData(
    data: Record<string, unknown>
  ): string {
    return (data?.currency_code as string) ?? "sek"
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }

  protected buildError(message: string, error: Error): Error {
    const detail =
      error instanceof QliroRequestError
        ? error.apiError?.ErrorMessage ?? error.message
        : error.message
    return new Error(`${message}: ${detail}`)
  }
}

export default QliroProviderService
