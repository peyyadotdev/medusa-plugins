import { AbstractFulfillmentProviderService, MedusaError } from "@medusajs/framework/utils"
import type {
  Logger,
  FulfillmentOption,
  CalculatedShippingOptionPrice,
  CreateFulfillmentResult,
  FulfillmentItemDTO,
  FulfillmentOrderDTO,
  FulfillmentDTO,
} from "@medusajs/framework/types"
import { PostNordClient } from "./client"
import type {
  PostNordOptions,
  PostNordFulfillmentOption,
  PostNordServiceId,
  PostNordRecipient,
  PostNordParcelDimensions,
} from "./types"

type InjectedDependencies = {
  logger: Logger
  pluginSettings?: {
    getDecryptedSettings: (id: string) => Promise<Record<string, unknown> | null>
    markVerified: (id: string) => Promise<void>
  }
}

const TRACKING_URL_BASE = "https://tracking.postnord.com/tracking?id="

const FULFILLMENT_OPTIONS: PostNordFulfillmentOption[] = [
  {
    id: "mypack_home",
    name: "PostNord MyPack Home",
    is_return: false,
    requires_pickup_point: false,
    max_weight_kg: 20,
  },
  {
    id: "mypack_collect",
    name: "PostNord MyPack Collect",
    is_return: false,
    requires_pickup_point: true,
    max_weight_kg: 20,
  },
  {
    id: "parcel",
    name: "PostNord Parcel",
    is_return: false,
    requires_pickup_point: false,
    max_weight_kg: 30,
  },
  {
    id: "pallet",
    name: "PostNord Pallet",
    is_return: false,
    requires_pickup_point: false,
    max_weight_kg: 1000,
  },
  {
    id: "return",
    name: "PostNord Return",
    is_return: true,
    requires_pickup_point: false,
    max_weight_kg: 20,
  },
]

const SERVICE_MAP = new Map(FULFILLMENT_OPTIONS.map((o) => [o.id, o]))

class PostNordFulfillmentService extends AbstractFulfillmentProviderService {
  static identifier = "postnord"

  protected logger_: Logger
  protected options_: PostNordOptions
  protected client: PostNordClient
  private settingsService_: InjectedDependencies["pluginSettings"]
  private cachedConfig_: PostNordOptions | null = null
  private configCacheExpiry_ = 0

  static validateOptions(options: Record<any, any>) {
    if (!options.apiKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PostNord: apiKey is required in provider options."
      )
    }
    if (!options.customerNumber) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PostNord: customerNumber is required in provider options."
      )
    }
    if (!options.senderAddress) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PostNord: senderAddress is required in provider options."
      )
    }
    const sa = options.senderAddress
    if (!sa.name || !sa.street || !sa.postalCode || !sa.city || !sa.countryCode) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PostNord: senderAddress must include name, street, postalCode, city, and countryCode."
      )
    }
  }

  constructor(container: InjectedDependencies, options: PostNordOptions) {
    super()
    this.logger_ = container.logger
    this.options_ = options
    try {
      this.settingsService_ = container.pluginSettings
    } catch {
      this.settingsService_ = undefined
    }
    this.client = new PostNordClient({
      apiKey: options.apiKey,
      customerNumber: options.customerNumber,
      environment: options.environment ?? "test",
    })
  }

  private async getEffectiveConfig(): Promise<PostNordOptions> {
    if (!this.settingsService_) return this.options_

    const now = Date.now()
    if (this.cachedConfig_ && now < this.configCacheExpiry_) {
      return this.cachedConfig_
    }

    try {
      const dbSettings = await this.settingsService_.getDecryptedSettings("postnord")
      if (dbSettings?.apiKey && dbSettings?.customerNumber) {
        this.cachedConfig_ = {
          ...this.options_,
          ...(dbSettings as unknown as Partial<PostNordOptions>),
        }
        this.configCacheExpiry_ = now + 60_000
        return this.cachedConfig_
      }
    } catch (err) {
      this.logger_.warn(`Failed to load PostNord settings from DB: ${err}`)
    }

    return this.options_
  }

  private async getClient(): Promise<PostNordClient> {
    const config = await this.getEffectiveConfig()
    if (
      config.apiKey !== this.options_.apiKey ||
      config.customerNumber !== this.options_.customerNumber ||
      config.environment !== this.options_.environment
    ) {
      return new PostNordClient({
        apiKey: config.apiKey,
        customerNumber: config.customerNumber,
        environment: config.environment ?? "test",
      })
    }
    return this.client
  }

  // ── Available shipping options ──

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return FULFILLMENT_OPTIONS.map((o) => ({
      id: o.id,
      name: o.name,
      is_return: o.is_return,
      requires_pickup_point: o.requires_pickup_point,
      max_weight_kg: o.max_weight_kg,
    }))
  }

  // ── Validate fulfillment data (recipient, weight, service constraints) ──

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const serviceId = optionData.id as PostNordServiceId | undefined
    const service = serviceId ? SERVICE_MAP.get(serviceId) : undefined

    if (!service) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `PostNord: unknown service "${serviceId}".`
      )
    }

    if (service.requires_pickup_point && !data.service_point_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `PostNord: service "${serviceId}" requires a service_point_id.`
      )
    }

    const weightGrams = Number(data.weight_grams ?? context.weight_grams ?? 0)
    if (weightGrams > service.max_weight_kg * 1000) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `PostNord: weight ${weightGrams}g exceeds max ${service.max_weight_kg}kg for "${serviceId}".`
      )
    }

    return {
      ...data,
      service_id: serviceId,
      weight_grams: weightGrams,
    }
  }

  // ── Validate option data structure ──

  async validateOption(data: Record<string, unknown>): Promise<boolean> {
    const serviceId = data.id as string | undefined
    if (!serviceId) return false
    return SERVICE_MAP.has(serviceId as PostNordServiceId)
  }

  // ── Price calculation ──

  async canCalculate(data: Record<string, unknown>): Promise<boolean> {
    const serviceId = data.id as string | undefined
    return serviceId ? SERVICE_MAP.has(serviceId as PostNordServiceId) : false
  }

  async calculatePrice(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<CalculatedShippingOptionPrice> {
    const serviceId = (optionData.id ?? data.service_id) as string
    const shippingAddress = context.shipping_address as
      | Record<string, unknown>
      | undefined

    if (!shippingAddress?.postal_code || !shippingAddress?.country_code) {
      this.logger_.warn(
        "PostNord calculatePrice: missing shipping address, returning 0"
      )
      return {
        calculated_amount: 0,
        is_calculated_price_tax_inclusive: true,
      }
    }

    try {
      const rate = await this.client.getRate({
        serviceId,
        fromPostalCode: this.options_.senderAddress.postalCode,
        fromCountryCode: this.options_.senderAddress.countryCode,
        toPostalCode: shippingAddress.postal_code as string,
        toCountryCode: shippingAddress.country_code as string,
        weight_grams: Number(data.weight_grams ?? 1000),
      })

      return {
        calculated_amount: rate.price,
        is_calculated_price_tax_inclusive: true,
      }
    } catch (error) {
      this.logger_.error(
        `PostNord calculatePrice failed: ${(error as Error).message}`
      )
      return {
        calculated_amount: 0,
        is_calculated_price_tax_inclusive: true,
      }
    }
  }

  // ── Create fulfillment (book shipment) ──

  async createFulfillment(
    data: Record<string, unknown>,
    items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>
  ): Promise<CreateFulfillmentResult> {
    const serviceId = (data.service_id ?? data.id) as string

    const deliveryAddress = fulfillment.delivery_address
    const shippingAddress = deliveryAddress
      ? {
          first_name: deliveryAddress.first_name,
          last_name: deliveryAddress.last_name,
          company: deliveryAddress.company,
          address_1: deliveryAddress.address_1,
          address_2: deliveryAddress.address_2,
          city: deliveryAddress.city,
          country_code: deliveryAddress.country_code,
          postal_code: deliveryAddress.postal_code,
          phone: deliveryAddress.phone,
        }
      : (data.shipping_address as Record<string, unknown> | undefined)

    if (!shippingAddress) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PostNord: shipping address is required to create a fulfillment."
      )
    }

    const recipientAddress: PostNordRecipient = {
      name: [shippingAddress.first_name, shippingAddress.last_name]
        .filter(Boolean)
        .join(" ") || (shippingAddress.company as string) || "Recipient",
      street: [shippingAddress.address_1, shippingAddress.address_2]
        .filter(Boolean)
        .join(", "),
      postalCode: shippingAddress.postal_code as string,
      city: shippingAddress.city as string,
      countryCode: shippingAddress.country_code as string,
      phone: shippingAddress.phone as string | undefined,
    }

    const totalWeight = Number(data.weight_grams ?? 1000)

    const parcels: PostNordParcelDimensions[] = [
      {
        weight_grams: totalWeight,
        ...(data.length_cm && { length_cm: Number(data.length_cm) }),
        ...(data.width_cm && { width_cm: Number(data.width_cm) }),
        ...(data.height_cm && { height_cm: Number(data.height_cm) }),
      },
    ]

    const shipment = await this.client.createShipment({
      serviceId,
      senderAddress: this.options_.senderAddress,
      recipientAddress,
      parcels,
      reference: fulfillment.id,
      servicePointId: data.service_point_id as string | undefined,
    })

    this.logger_.info(
      `PostNord shipment created: ${shipment.shipmentId} (tracking: ${shipment.trackingNumber})`
    )

    return {
      data: {
        shipment_id: shipment.shipmentId,
        booking_ref: shipment.bookingRef,
        tracking_number: shipment.trackingNumber,
        label_url: shipment.labelUrl,
        parcels: shipment.parcels,
      },
      labels: [
        {
          tracking_number: shipment.trackingNumber,
          tracking_url: `${TRACKING_URL_BASE}${shipment.trackingNumber}`,
          label_url: shipment.labelUrl ?? "",
        },
      ],
    }
  }

  // ── Create return fulfillment ──

  async createReturnFulfillment(
    fulfillment: Record<string, unknown>
  ): Promise<CreateFulfillmentResult> {
    const data = fulfillment.data as Record<string, unknown> | undefined
    const deliveryAddress = fulfillment.delivery_address as
      | Record<string, unknown>
      | undefined

    const shippingAddress = deliveryAddress ?? data?.shipping_address as
      | Record<string, unknown>
      | undefined

    const recipientName = shippingAddress
      ? [shippingAddress.first_name, shippingAddress.last_name]
          .filter(Boolean)
          .join(" ")
      : "Customer"

    const recipientAddress: PostNordRecipient = shippingAddress
      ? {
          name: recipientName || "Customer",
          street: [shippingAddress.address_1, shippingAddress.address_2]
            .filter(Boolean)
            .join(", "),
          postalCode: shippingAddress.postal_code as string,
          city: shippingAddress.city as string,
          countryCode: shippingAddress.country_code as string,
          phone: shippingAddress.phone as string | undefined,
        }
      : {
          name: "Customer",
          street: "",
          postalCode: "",
          city: "",
          countryCode: this.options_.senderAddress.countryCode,
        }

    const weightGrams = Number(data?.weight_grams ?? 1000)

    const returnShipment = await this.client.getReturnLabel({
      senderAddress: this.options_.senderAddress,
      recipientAddress,
      weight_grams: weightGrams,
      reference: data?.reference as string | undefined,
    })

    this.logger_.info(
      `PostNord return label created: ${returnShipment.shipmentId} (tracking: ${returnShipment.trackingNumber})`
    )

    return {
      data: {
        shipment_id: returnShipment.shipmentId,
        booking_ref: returnShipment.bookingRef,
        tracking_number: returnShipment.trackingNumber,
        label_url: returnShipment.labelUrl,
        is_return: true,
      },
      labels: [
        {
          tracking_number: returnShipment.trackingNumber,
          tracking_url: `${TRACKING_URL_BASE}${returnShipment.trackingNumber}`,
          label_url: returnShipment.labelUrl ?? "",
        },
      ],
    }
  }

  // ── Cancel fulfillment ──

  async cancelFulfillment(data: Record<string, unknown>): Promise<any> {
    const shipmentId = data.shipment_id as string | undefined

    if (!shipmentId) {
      this.logger_.warn("PostNord cancelFulfillment: no shipment_id in data")
      return
    }

    try {
      await this.client.cancelShipment(shipmentId)
      this.logger_.info(`PostNord shipment cancelled: ${shipmentId}`)
    } catch (error) {
      this.logger_.error(
        `PostNord cancelFulfillment failed: ${(error as Error).message}`
      )
      throw error
    }
  }

  // ── Documents ──

  async getFulfillmentDocuments(
    data: Record<string, unknown>
  ): Promise<never[]> {
    return [] as never[]
  }

  async getReturnDocuments(
    data: Record<string, unknown>
  ): Promise<never[]> {
    return [] as never[]
  }

  async getShipmentDocuments(
    data: Record<string, unknown>
  ): Promise<never[]> {
    return [] as never[]
  }

  async retrieveDocuments(
    fulfillmentData: Record<string, unknown>,
    documentType: string
  ): Promise<void> {
    // PostNord labels are returned inline in createFulfillment via the labels array.
    // For on-demand retrieval, the label_url in fulfillment data can be used directly.
  }
}

export default PostNordFulfillmentService
