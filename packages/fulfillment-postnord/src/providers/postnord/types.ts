export type PostNordEnvironment = "test" | "production"

export type PostNordSenderAddress = {
  name: string
  street: string
  postalCode: string
  city: string
  countryCode: string
}

export type PostNordOptions = {
  apiKey: string
  customerNumber: string
  senderAddress: PostNordSenderAddress
  environment: PostNordEnvironment
}

export type PostNordServiceId =
  | "mypack_home"
  | "mypack_collect"
  | "parcel"
  | "pallet"
  | "return"

export type PostNordFulfillmentOption = {
  id: PostNordServiceId
  name: string
  is_return: boolean
  requires_pickup_point: boolean
  max_weight_kg: number
}

// ── Shipment API ──

export type PostNordRecipient = {
  name: string
  street: string
  postalCode: string
  city: string
  countryCode: string
  phone?: string
  email?: string
}

export type PostNordParcelDimensions = {
  weight_grams: number
  length_cm?: number
  width_cm?: number
  height_cm?: number
}

export type PostNordCreateShipmentRequest = {
  serviceId: string
  senderAddress: PostNordSenderAddress
  recipientAddress: PostNordRecipient
  parcels: PostNordParcelDimensions[]
  customerNumber: string
  reference?: string
  servicePointId?: string
}

export type PostNordShipmentResponse = {
  shipmentId: string
  bookingRef: string
  trackingNumber: string
  labelUrl?: string
  parcels: {
    parcelId: string
    trackingNumber: string
  }[]
}

export type PostNordCancelShipmentResponse = {
  success: boolean
}

// ── Transport Solutions API (Labels) ──

export type PostNordLabelDocument = {
  url: string
  format: "pdf" | "zpl"
  data?: string
}

// ── Tracking API ──

export type PostNordTrackingEvent = {
  eventCode: string
  eventDescription: string
  location: string
  timestamp: string
  status: "in_transit" | "delivered" | "exception" | "out_for_delivery" | "returned" | "unknown"
}

export type PostNordTrackingResponse = {
  trackingNumber: string
  carrier: "postnord"
  trackingUrl: string
  status: string
  estimatedDelivery?: string
  events: PostNordTrackingEvent[]
}

// ── ServicePoint API ──

export type PostNordOpeningHours = {
  day: string
  openFrom: string
  openTo: string
}

export type PostNordCoordinates = {
  latitude: number
  longitude: number
}

export type PostNordServicePoint = {
  servicePointId: string
  name: string
  street: string
  postalCode: string
  city: string
  countryCode: string
  coordinates: PostNordCoordinates
  openingHours: PostNordOpeningHours[]
  distance?: number
}

export type PostNordServicePointSearchParams = {
  postalCode: string
  countryCode: string
  limit?: number
  streetName?: string
  streetNumber?: string
}

// ── Rate / Price API ──

export type PostNordRateRequest = {
  serviceId: string
  fromPostalCode: string
  fromCountryCode: string
  toPostalCode: string
  toCountryCode: string
  weight_grams: number
  length_cm?: number
  width_cm?: number
  height_cm?: number
}

export type PostNordRateResponse = {
  price: number
  currency: string
  estimatedDeliveryDays?: number
}

// ── API Error ──

export type PostNordApiError = {
  code: string
  message: string
  details?: string
}

// ── PostNord Raw API Response Shapes ──

export type PostNordRawShipmentResponse = {
  createShipmentResponse: {
    shipments: {
      shipmentId: string
      items: {
        itemId: string
        trackingInformation: {
          trackingId: string
          trackingUrl: string
        }
      }[]
    }[]
    bookingRef: string
    labelPrintout?: {
      href: string
    }
  }
}

export type PostNordRawTrackingResponse = {
  TrackingInformationResponse: {
    shipments: {
      shipmentId: string
      statusText: {
        header: string
        body: string
      }
      deliveryDate?: string
      estimatedTimeOfArrival?: string
      items: {
        itemId: string
        events: {
          eventCode: string
          eventDescription: string
          location: {
            displayName: string
          }
          eventTime: string
        }[]
      }[]
    }[]
  }
}

export type PostNordRawServicePointResponse = {
  servicePointInformationResponse: {
    servicePoints: {
      servicePointId: string
      name: string
      deliveryAddress: {
        streetName: string
        streetNumber: string
        postalCode: string
        city: string
        countryCode: string
      }
      coordinate: {
        northing: number
        easting: number
      }
      openingHours: {
        postalServices: {
          openDay: string
          openFrom: string
          openTo: string
        }[]
      }
      routeDistance?: number
    }[]
  }
}

export type PostNordRawTransitTimeResponse = {
  transitTimeResponse: {
    transitTimes: {
      service: {
        code: string
      }
      deliveryDate: string
      transitTimeInDays: number
    }[]
  }
}
