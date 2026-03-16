import {
  AbstractPaymentProvider,
  BigNumber,
  MedusaError,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  PaymentActions,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { SwishClient } from "./client"
import type {
  SwishOptions,
  SwishCallback,
  SwishPaymentStatus,
} from "./types"

type InjectedDependencies = {
  logger: Logger
}

class SwishProviderService extends AbstractPaymentProvider<SwishOptions> {
  static identifier = "swish"

  protected logger_: Logger
  protected options_: SwishOptions
  protected client_: SwishClient

  static validateOptions(options: Record<any, any>) {
    if (!options.certificatePath) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Swish requires `certificatePath` in provider options."
      )
    }
    if (!options.callbackUrl) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Swish requires `callbackUrl` in provider options."
      )
    }
    if (!options.payeeAlias) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Swish requires `payeeAlias` in provider options."
      )
    }
  }

  constructor(container: InjectedDependencies, options: SwishOptions) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options
    this.client_ = new SwishClient({
      certificatePath: options.certificatePath,
      certificatePassword: options.certificatePassword,
      environment: options.environment,
    })
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const { amount, currency_code, context, data } = input
    return this.createSwishRequest(amount, currency_code, context, data)
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    return {
      status: PaymentSessionStatus.PENDING,
      data: input.data ?? {},
    }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const callback = JSON.parse(
      typeof payload.rawData === "string"
        ? payload.rawData
        : payload.rawData.toString()
    ) as SwishCallback

    if (callback.originalPaymentReference) {
      return {
        action: "not_supported" as PaymentActions,
        data: {
          session_id: callback.payeePaymentReference ?? "",
          amount: new BigNumber(callback.amount),
        },
      }
    }

    const sessionId = callback.payeePaymentReference
    const amount = callback.amount

    const actionMap: Record<SwishPaymentStatus, PaymentActions> = {
      PAID: "authorized",
      DECLINED: "failed",
      ERROR: "failed",
      CANCELLED: "failed",
      CREATED: "not_supported",
    }

    const action: PaymentActions = actionMap[callback.status] ?? "not_supported"

    return {
      action,
      data: {
        session_id: sessionId,
        amount: new BigNumber(amount),
      },
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    const swishId = input.data?.swish_id as string
    if (!swishId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Missing swish_id for refund. Was the payment initiated?"
      )
    }

    const payment = await this.client_.getPaymentRequest(swishId)
    if (!payment.paymentReference) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Payment has no paymentReference yet. Was the payment completed?"
      )
    }

    const swishAmount = Number(input.amount).toFixed(2)

    const { id: refundId } = await this.client_.createRefund({
      originalPaymentReference: payment.paymentReference,
      callbackUrl: this.options_.callbackUrl,
      payerAlias: this.options_.payeeAlias,
      amount: swishAmount,
      currency: "SEK",
      message: "Refund",
    })

    return {
      data: {
        ...input.data,
        refund_id: refundId,
        refund_amount: swishAmount,
      },
    }
  }

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    const swishId = input.data?.swish_id as string
    if (swishId) {
      try {
        await this.client_.cancelPaymentRequest(swishId)
      } catch (error) {
        this.logger_.warn(
          `Swish: could not cancel payment request ${swishId} (may already be processed): ${error}`
        )
      }
    }
    return { data: input.data ?? {} }
  }

  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    const swishId = input.data?.swish_id as string
    if (swishId) {
      try {
        await this.client_.cancelPaymentRequest(swishId)
      } catch {
        // Old request may already be processed
      }
    }
    return { data: input.data ?? {} }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const swishId = input.data?.swish_id as string
    if (!swishId) {
      return { status: PaymentSessionStatus.PENDING }
    }

    try {
      const payment = await this.client_.getPaymentRequest(swishId)
      return { status: this.mapSwishStatus(payment.status) }
    } catch {
      return { status: PaymentSessionStatus.PENDING }
    }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    const swishId = input.data?.swish_id as string
    if (!swishId) {
      return { data: input.data ?? {} }
    }

    try {
      const payment = await this.client_.getPaymentRequest(swishId)
      return {
        data: {
          ...input.data,
          swish_status: payment.status,
          swish_payment_reference: payment.paymentReference,
        },
      }
    } catch {
      return { data: input.data ?? {} }
    }
  }

  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    const oldId = input.data?.swish_id as string
    if (oldId) {
      try {
        await this.client_.cancelPaymentRequest(oldId)
      } catch {
        // Old request may already be processed
      }
    }

    const { amount, currency_code, context, data } = input
    const result = await this.createSwishRequest(amount, currency_code, context, data)
    return { data: result.data }
  }

  private async createSwishRequest(
    amount: unknown,
    currencyCode: string,
    context?: Record<string, unknown>,
    data?: Record<string, unknown>
  ): Promise<InitiatePaymentOutput> {
    const sessionId = (context as Record<string, unknown>)?.session_id as string ?? ""
    const swishAmount = Number(amount).toFixed(2)

    const { id, token } = await this.client_.createPaymentRequest({
      payeePaymentReference: sessionId,
      callbackUrl: this.options_.callbackUrl,
      payerAlias: (data?.payer_alias as string) ?? undefined,
      payeeAlias: this.options_.payeeAlias,
      amount: swishAmount,
      currency: "SEK",
      message: ((data?.message as string) ?? "").slice(0, 50) || undefined,
    })

    return {
      id,
      data: {
        swish_id: id,
        token,
        session_id: sessionId,
        swish_amount: swishAmount,
        currency_code: currencyCode,
      },
    }
  }

  private mapSwishStatus(status: SwishPaymentStatus): PaymentSessionStatus {
    switch (status) {
      case "PAID":
        return PaymentSessionStatus.AUTHORIZED
      case "CREATED":
        return PaymentSessionStatus.PENDING
      case "DECLINED":
      case "ERROR":
      case "CANCELLED":
        return PaymentSessionStatus.ERROR
      default:
        return PaymentSessionStatus.PENDING
    }
  }
}

export default SwishProviderService
