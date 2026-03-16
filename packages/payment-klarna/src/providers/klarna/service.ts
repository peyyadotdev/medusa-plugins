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
  PaymentActions,
  CreateAccountHolderInput,
  CreateAccountHolderOutput,
  SavePaymentMethodInput,
  SavePaymentMethodOutput,
  ListPaymentMethodsInput,
  ListPaymentMethodsOutput,
} from "@medusajs/framework/types"
import { KlarnaClient, KlarnaRequestError } from "./client"
import { toMinorUnits, fromMinorUnits } from "./currency"
import type {
  KlarnaOptions,
  KlarnaOrderManagementStatus,
  KlarnaRegion,
} from "./types"

type InjectedDependencies = {
  logger: Logger
}

const VALID_REGIONS: KlarnaRegion[] = ["eu", "na", "oc"]

class KlarnaProviderService extends AbstractPaymentProvider<KlarnaOptions> {
  static identifier = "klarna"

  protected logger_: Logger
  protected options_: KlarnaOptions
  protected client: KlarnaClient

  // ── Phase 4.1: validateOptions ──

  static validateOptions(options: Record<string, unknown>) {
    if (!options.username) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Klarna requires `username` in provider options."
      )
    }
    if (!options.password) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Klarna requires `password` in provider options."
      )
    }
    if (!options.region || !VALID_REGIONS.includes(options.region as KlarnaRegion)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Klarna requires a valid \`region\` (${VALID_REGIONS.join(", ")}) in provider options.`
      )
    }
  }

  constructor(container: InjectedDependencies, options: KlarnaOptions) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options
    this.client = new KlarnaClient({
      username: options.username,
      password: options.password,
      region: options.region,
      environment: options.environment ?? "playground",
    })
  }

  // ── Phase 4.2: initiatePayment ──

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const { amount, currency_code, data } = input
    const sessionId = (data?.session_id as string) ?? ""

    const orderAmount = toMinorUnits(Number(amount), currency_code)
    const country = this.resolveCountry(currency_code)

    try {
      const response = await this.client.createOrder({
        purchase_country: country,
        purchase_currency: currency_code.toUpperCase(),
        order_amount: orderAmount,
        order_tax_amount: 0,
        order_lines: [
          {
            name: "Order",
            quantity: 1,
            unit_price: orderAmount,
            total_amount: orderAmount,
            total_tax_amount: 0,
          },
        ],
        merchant_reference1: sessionId,
        merchant_urls: {
          confirmation: (data?.confirmation_url as string) ?? "",
          push: (data?.push_url as string) ?? "",
        },
      })

      return {
        id: response.order_id,
        data: {
          klarna_order_id: response.order_id,
          html_snippet: response.html_snippet,
          session_id: sessionId,
          currency_code: currency_code.toUpperCase(),
        },
      }
    } catch (error) {
      throw this.buildError("Failed to create Klarna checkout", error as Error)
    }
  }

  // ── Phase 4.3: authorizePayment ──

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const klarnaOrderId = input.data?.klarna_order_id as string

    if (!klarnaOrderId) {
      return {
        data: input.data as Record<string, unknown>,
        status: "error",
      }
    }

    try {
      const order = await this.client.getOrder(klarnaOrderId)

      if (order.status === "checkout_complete") {
        try {
          await this.client.acknowledgeOrder(klarnaOrderId)
        } catch (ackError) {
          this.logger_.warn(
            `Klarna: could not acknowledge order ${klarnaOrderId}: ${(ackError as Error).message}`
          )
        }

        return {
          data: {
            ...(input.data as Record<string, unknown>),
            klarna_status: order.status,
          },
          status: "authorized",
        }
      }

      return {
        data: {
          ...(input.data as Record<string, unknown>),
          klarna_status: order.status,
        },
        status: "pending",
      }
    } catch (error) {
      this.logger_.error(
        `Failed to authorize Klarna order ${klarnaOrderId}`,
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
    const { data, rawData } = payload

    let webhookBody: { order_id?: string }
    try {
      webhookBody =
        typeof rawData === "string"
          ? JSON.parse(rawData)
          : typeof rawData === "object" && rawData !== null && !Buffer.isBuffer(rawData)
            ? rawData
            : JSON.parse(rawData.toString())
    } catch {
      webhookBody = data as { order_id?: string }
    }

    const orderId = webhookBody.order_id ?? (data as Record<string, unknown>)?.order_id as string

    if (!orderId) {
      this.logger_.warn("Klarna push notification missing order_id")
      return { action: "not_supported" as PaymentActions }
    }

    try {
      const order = await this.client.getOrder(orderId)

      if (order.status === "checkout_complete") {
        try {
          await this.client.acknowledgeOrder(orderId)
        } catch {
          // Already acknowledged or transient failure
        }

        const sessionId = order.merchant_reference1 ?? ""
        const currency = order.purchase_currency?.toLowerCase() ?? "sek"
        const medusaAmount = fromMinorUnits(order.order_amount, currency)

        return {
          action: "authorized" as PaymentActions,
          data: {
            session_id: sessionId,
            amount: new BigNumber(medusaAmount),
          },
        }
      }

      return { action: "not_supported" as PaymentActions }
    } catch (error) {
      this.logger_.error(
        `Failed to process Klarna push for order ${orderId}`,
        error as Error
      )
      return {
        action: "failed" as PaymentActions,
        data: {
          session_id: "",
          amount: new BigNumber(0),
        },
      }
    }
  }

  // ── Phase 4.5: capturePayment ──

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    const paymentData = input.data as Record<string, unknown>
    const klarnaOrderId = paymentData?.klarna_order_id as string

    if (!klarnaOrderId) {
      throw this.buildError(
        "Missing klarna_order_id for capture",
        new Error("Missing identifier")
      )
    }

    try {
      const order = await this.client.getManagedOrder(klarnaOrderId)
      const captureAmount = order.remaining_authorized_amount

      await this.client.captureOrder(klarnaOrderId, {
        captured_amount: captureAmount,
      })

      return {
        data: {
          ...paymentData,
          klarna_captured: true,
          captured_amount: captureAmount,
        },
      }
    } catch (error) {
      throw this.buildError("Failed to capture Klarna payment", error as Error)
    }
  }

  // ── Phase 4.6: refundPayment ──

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    const paymentData = input.data as Record<string, unknown>
    const klarnaOrderId = paymentData?.klarna_order_id as string

    if (!klarnaOrderId) {
      throw this.buildError(
        "Missing klarna_order_id for refund",
        new Error("Missing identifier")
      )
    }

    const currency = (paymentData?.currency_code as string) ?? "sek"
    const refundAmount = toMinorUnits(Number(input.amount), currency)

    try {
      await this.client.refundOrder(klarnaOrderId, {
        refunded_amount: refundAmount,
      })

      return {
        data: {
          ...paymentData,
          last_refund_amount: refundAmount,
        },
      }
    } catch (error) {
      throw this.buildError("Failed to refund Klarna payment", error as Error)
    }
  }

  // ── Phase 4.7: cancelPayment, deletePayment, getPaymentStatus, retrievePayment, updatePayment ──

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    const paymentData = input.data as Record<string, unknown>
    const klarnaOrderId = paymentData?.klarna_order_id as string

    if (klarnaOrderId) {
      try {
        await this.client.cancelOrder(klarnaOrderId)
      } catch (error) {
        this.logger_.warn(
          `Klarna: could not cancel order ${klarnaOrderId} (may already be captured): ${(error as Error).message}`
        )
      }
    }

    return {
      data: {
        ...paymentData,
        klarna_status: "CANCELLED",
      },
    }
  }

  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    const paymentData = input.data as Record<string, unknown>
    const klarnaOrderId = paymentData?.klarna_order_id as string

    if (klarnaOrderId) {
      try {
        await this.client.cancelOrder(klarnaOrderId)
      } catch {
        // Order may already be processed or expired
      }
    }

    return { data: paymentData }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const klarnaOrderId = (input.data as Record<string, unknown>)
      ?.klarna_order_id as string

    if (!klarnaOrderId) {
      return { status: "pending" }
    }

    try {
      const order = await this.client.getManagedOrder(klarnaOrderId)
      return { status: this.mapKlarnaStatusToMedusa(order.status) }
    } catch {
      return { status: "pending" }
    }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    const klarnaOrderId = (input.data as Record<string, unknown>)
      ?.klarna_order_id as string

    if (!klarnaOrderId) {
      return { data: input.data as Record<string, unknown> }
    }

    try {
      const order = await this.client.getManagedOrder(klarnaOrderId)
      return {
        data: {
          ...(input.data as Record<string, unknown>),
          klarna_order: order,
        },
      }
    } catch (error) {
      throw this.buildError("Failed to retrieve Klarna order", error as Error)
    }
  }

  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    const { amount, currency_code, data } = input
    const paymentData = data as Record<string, unknown>
    const klarnaOrderId = paymentData?.klarna_order_id as string

    if (!klarnaOrderId) {
      return { data: paymentData }
    }

    const orderAmount = toMinorUnits(Number(amount), currency_code)

    try {
      await this.client.updateOrder(klarnaOrderId, {
        order_amount: orderAmount,
        order_tax_amount: 0,
        order_lines: [
          {
            name: "Order",
            quantity: 1,
            unit_price: orderAmount,
            total_amount: orderAmount,
            total_tax_amount: 0,
          },
        ],
      })

      return { data: paymentData }
    } catch (error) {
      throw this.buildError("Failed to update Klarna checkout", error as Error)
    }
  }

  // ── Phase 4.8: Account holder methods ──

  async createAccountHolder(
    input: CreateAccountHolderInput
  ): Promise<CreateAccountHolderOutput> {
    const { context } = input
    const accountHolder = context.account_holder

    if (accountHolder?.data?.id) {
      return { id: accountHolder.data.id as string }
    }

    const customer = context.customer
    if (!customer) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Missing customer data for Klarna account holder."
      )
    }

    return {
      id: customer.id,
      data: {
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
      },
    }
  }

  async savePaymentMethod(
    input: SavePaymentMethodInput
  ): Promise<SavePaymentMethodOutput> {
    const accountHolderId = input.context?.account_holder?.data?.id as string

    if (!accountHolderId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Missing account holder ID for saving payment method."
      )
    }

    const tokenId = (input.data?.token_id as string) ?? `kt_${Date.now()}`
    return {
      id: tokenId,
      data: {
        token_id: tokenId,
        account_holder_id: accountHolderId,
      },
    }
  }

  async listPaymentMethods(
    input: ListPaymentMethodsInput
  ): Promise<ListPaymentMethodsOutput> {
    const accountHolderId = input.context?.account_holder?.data?.id as string

    if (!accountHolderId) {
      return []
    }

    return []
  }

  // ── Helpers ──

  private mapKlarnaStatusToMedusa(
    status: KlarnaOrderManagementStatus
  ): "authorized" | "captured" | "pending" | "canceled" | "error" {
    switch (status) {
      case "AUTHORIZED":
        return "authorized"
      case "CAPTURED":
      case "PART_CAPTURED":
        return "captured"
      case "CANCELLED":
        return "canceled"
      case "EXPIRED":
      case "CLOSED":
        return "error"
      default:
        return "pending"
    }
  }

  private resolveCountry(currencyCode: string): string {
    const map: Record<string, string> = {
      sek: "SE",
      nok: "NO",
      dkk: "DK",
      eur: "FI",
      gbp: "GB",
      usd: "US",
      aud: "AU",
      nzd: "NZ",
    }
    return map[currencyCode.toLowerCase()] ?? "SE"
  }

  protected buildError(message: string, error: Error): Error {
    const detail =
      error instanceof KlarnaRequestError
        ? error.apiError?.error_messages?.join("; ") ?? error.message
        : error.message
    return new Error(`${message}: ${detail}`)
  }
}

export default KlarnaProviderService
