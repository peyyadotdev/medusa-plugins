import type {
  PostNordEnvironment,
  PostNordSenderAddress,
  PostNordRecipient,
  PostNordParcelDimensions,
  PostNordShipmentResponse,
  PostNordCancelShipmentResponse,
  PostNordLabelDocument,
  PostNordTrackingResponse,
  PostNordTrackingEvent,
  PostNordServicePoint,
  PostNordRateResponse,
  PostNordApiError,
  PostNordRawShipmentResponse,
  PostNordRawTrackingResponse,
  PostNordRawServicePointResponse,
} from "./types"

const BASE_URLS: Record<PostNordEnvironment, string> = {
  test: "https://atapi2.postnord.com",
  production: "https://api2.postnord.com",
}

const TRACKING_URL_BASE = "https://tracking.postnord.com/tracking?id="

/**
 * PostNord service code mapping. PostNord uses numeric service codes
 * internally; these map our friendly IDs to the API codes.
 */
const SERVICE_CODES: Record<string, string> = {
  mypack_home: "19",
  mypack_collect: "17",
  parcel: "18",
  pallet: "71",
  return: "28",
}

export class PostNordClient {
  private baseUrl: string
  private apiKey: string
  private customerNumber: string

  constructor(options: {
    apiKey: string
    customerNumber: string
    environment: PostNordEnvironment
  }) {
    this.baseUrl = BASE_URLS[options.environment]
    this.apiKey = options.apiKey
    this.customerNumber = options.customerNumber
  }

  // ── HTTP helpers ──

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    queryParams?: Record<string, string>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`)
    url.searchParams.set("apikey", this.apiKey)

    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        url.searchParams.set(key, value)
      }
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
    }

    if (body) {
      headers["Content-Type"] = "application/json"
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      let errorData: PostNordApiError | undefined
      try {
        errorData = (await response.json()) as PostNordApiError
      } catch {
        // response body may not be JSON
      }

      const message = errorData?.message ?? response.statusText
      throw new PostNordRequestError(
        `PostNord API error (${response.status}): ${message}`,
        response.status,
        errorData
      )
    }

    if (response.status === 204) {
      return undefined as T
    }

    return (await response.json()) as T
  }

  // ── Shipment API ──

  async createShipment(params: {
    serviceId: string
    senderAddress: PostNordSenderAddress
    recipientAddress: PostNordRecipient
    parcels: PostNordParcelDimensions[]
    reference?: string
    servicePointId?: string
  }): Promise<PostNordShipmentResponse> {
    const serviceCode = SERVICE_CODES[params.serviceId] ?? params.serviceId

    const shipmentPayload = {
      shipment: {
        service: { code: serviceCode },
        parties: {
          sender: {
            name: params.senderAddress.name,
            address: {
              streetName: params.senderAddress.street,
              postalCode: params.senderAddress.postalCode,
              city: params.senderAddress.city,
              countryCode: params.senderAddress.countryCode,
            },
          },
          receiver: {
            name: params.recipientAddress.name,
            address: {
              streetName: params.recipientAddress.street,
              postalCode: params.recipientAddress.postalCode,
              city: params.recipientAddress.city,
              countryCode: params.recipientAddress.countryCode,
            },
            contact: {
              ...(params.recipientAddress.phone && {
                sms: params.recipientAddress.phone,
              }),
              ...(params.recipientAddress.email && {
                email: params.recipientAddress.email,
              }),
            },
          },
          ...(params.servicePointId && {
            deliveryPoint: { id: params.servicePointId },
          }),
        },
        parcels: params.parcels.map((p) => ({
          weight: { value: String(p.weight_grams / 1000), unit: "kg" },
          ...(p.length_cm &&
            p.width_cm &&
            p.height_cm && {
              dimensions: {
                length: { value: String(p.length_cm), unit: "cm" },
                width: { value: String(p.width_cm), unit: "cm" },
                height: { value: String(p.height_cm), unit: "cm" },
              },
            }),
        })),
        customerNumber: this.customerNumber,
        ...(params.reference && { reference: params.reference }),
      },
    }

    const raw = await this.request<PostNordRawShipmentResponse>(
      "POST",
      "/rest/shipment/v5/shipments",
      shipmentPayload
    )

    const shipment = raw.createShipmentResponse.shipments[0]
    return {
      shipmentId: shipment.shipmentId,
      bookingRef: raw.createShipmentResponse.bookingRef,
      trackingNumber:
        shipment.items[0]?.trackingInformation?.trackingId ?? "",
      labelUrl: raw.createShipmentResponse.labelPrintout?.href,
      parcels: shipment.items.map((item) => ({
        parcelId: item.itemId,
        trackingNumber: item.trackingInformation?.trackingId ?? "",
      })),
    }
  }

  async cancelShipment(
    shipmentId: string
  ): Promise<PostNordCancelShipmentResponse> {
    await this.request<void>("DELETE", `/rest/shipment/v5/shipments/${shipmentId}`)
    return { success: true }
  }

  // ── Label / Transport Solutions API ──

  async getLabel(shipmentId: string): Promise<PostNordLabelDocument> {
    const raw = await this.request<{ href: string }>(
      "GET",
      `/rest/shipment/v5/shipments/${shipmentId}/labels`,
      undefined,
      { paperSize: "A4" }
    )

    return {
      url: raw.href,
      format: "pdf",
    }
  }

  async getReturnLabel(params: {
    senderAddress: PostNordSenderAddress
    recipientAddress: PostNordRecipient
    weight_grams: number
    reference?: string
  }): Promise<PostNordShipmentResponse> {
    return this.createShipment({
      serviceId: "return",
      senderAddress: params.recipientAddress as PostNordSenderAddress,
      recipientAddress: {
        name: params.senderAddress.name,
        street: params.senderAddress.street,
        postalCode: params.senderAddress.postalCode,
        city: params.senderAddress.city,
        countryCode: params.senderAddress.countryCode,
      },
      parcels: [{ weight_grams: params.weight_grams }],
      reference: params.reference,
    })
  }

  // ── Tracking API ──

  async getTracking(trackingNumber: string): Promise<PostNordTrackingResponse> {
    const raw = await this.request<PostNordRawTrackingResponse>(
      "GET",
      "/rest/ntt/v1/trackandtrace/findByIdentifier.json",
      undefined,
      { id: trackingNumber, locale: "en" }
    )

    const shipment = raw.TrackingInformationResponse.shipments[0]
    if (!shipment) {
      return {
        trackingNumber,
        carrier: "postnord",
        trackingUrl: `${TRACKING_URL_BASE}${trackingNumber}`,
        status: "unknown",
        events: [],
      }
    }

    const events: PostNordTrackingEvent[] =
      shipment.items
        ?.flatMap((item) =>
          (item.events ?? []).map((e) => ({
            eventCode: e.eventCode,
            eventDescription: e.eventDescription,
            location: e.location?.displayName ?? "",
            timestamp: e.eventTime,
            status: mapTrackingStatus(e.eventCode),
          }))
        )
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ) ?? []

    return {
      trackingNumber,
      carrier: "postnord",
      trackingUrl: `${TRACKING_URL_BASE}${trackingNumber}`,
      status: shipment.statusText?.header ?? "unknown",
      estimatedDelivery: shipment.estimatedTimeOfArrival ?? undefined,
      events,
    }
  }

  // ── ServicePoint API ──

  async findServicePoints(params: {
    postalCode: string
    countryCode: string
    limit?: number
    streetName?: string
    streetNumber?: string
  }): Promise<PostNordServicePoint[]> {
    const queryParams: Record<string, string> = {
      countryCode: params.countryCode,
      postalCode: params.postalCode,
      numberOfServicePoints: String(params.limit ?? 10),
    }

    if (params.streetName) {
      queryParams.streetName = params.streetName
    }
    if (params.streetNumber) {
      queryParams.streetNumber = params.streetNumber
    }

    const raw = await this.request<PostNordRawServicePointResponse>(
      "GET",
      "/rest/businesslocation/v5/servicepoints/findNearestByAddress.json",
      undefined,
      queryParams
    )

    return (
      raw.servicePointInformationResponse?.servicePoints?.map((sp) => ({
        servicePointId: sp.servicePointId,
        name: sp.name,
        street: [sp.deliveryAddress?.streetName, sp.deliveryAddress?.streetNumber]
          .filter(Boolean)
          .join(" "),
        postalCode: sp.deliveryAddress?.postalCode ?? "",
        city: sp.deliveryAddress?.city ?? "",
        countryCode: sp.deliveryAddress?.countryCode ?? "",
        coordinates: {
          latitude: sp.coordinate?.northing ?? 0,
          longitude: sp.coordinate?.easting ?? 0,
        },
        openingHours:
          sp.openingHours?.postalServices?.map((oh) => ({
            day: oh.openDay,
            openFrom: oh.openFrom,
            openTo: oh.openTo,
          })) ?? [],
        distance: sp.routeDistance,
      })) ?? []
    )
  }

  // ── Rate / Transit Time API ──

  async getRate(params: {
    serviceId: string
    fromPostalCode: string
    fromCountryCode: string
    toPostalCode: string
    toCountryCode: string
    weight_grams: number
  }): Promise<PostNordRateResponse> {
    const serviceCode = SERVICE_CODES[params.serviceId] ?? params.serviceId

    const queryParams: Record<string, string> = {
      serviceCode,
      fromPostalCode: params.fromPostalCode,
      fromCountryCode: params.fromCountryCode,
      toPostalCode: params.toPostalCode,
      toCountryCode: params.toCountryCode,
      weightInGrams: String(params.weight_grams),
    }

    const raw = await this.request<{
      priceResponse?: {
        prices?: { amount: number; currencyCode: string }[]
      }
      transitTimeResponse?: {
        transitTimes?: { transitTimeInDays: number }[]
      }
    }>(
      "GET",
      "/rest/transport/v1/prices/price.json",
      undefined,
      queryParams
    )

    const priceEntry = raw.priceResponse?.prices?.[0]

    return {
      price: priceEntry?.amount ?? 0,
      currency: priceEntry?.currencyCode ?? "SEK",
      estimatedDeliveryDays:
        raw.transitTimeResponse?.transitTimes?.[0]?.transitTimeInDays,
    }
  }
}

function mapTrackingStatus(
  eventCode: string
): PostNordTrackingEvent["status"] {
  const delivered = ["01", "DL"]
  const outForDelivery = ["09", "OD"]
  const exception = ["62", "EX", "RF"]
  const returned = ["RET"]

  if (delivered.some((c) => eventCode.startsWith(c))) return "delivered"
  if (outForDelivery.some((c) => eventCode.startsWith(c)))
    return "out_for_delivery"
  if (exception.some((c) => eventCode.startsWith(c))) return "exception"
  if (returned.some((c) => eventCode.startsWith(c))) return "returned"
  return "in_transit"
}

export class PostNordRequestError extends Error {
  public statusCode: number
  public apiError?: PostNordApiError

  constructor(
    message: string,
    statusCode: number,
    apiError?: PostNordApiError
  ) {
    super(message)
    this.name = "PostNordRequestError"
    this.statusCode = statusCode
    this.apiError = apiError
  }
}
