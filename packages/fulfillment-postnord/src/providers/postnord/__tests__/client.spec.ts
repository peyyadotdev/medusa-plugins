import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { PostNordClient, PostNordRequestError } from "../client"

const defaultClientOpts = {
  apiKey: "test-key",
  customerNumber: "9999999999",
  environment: "test" as const,
}

describe("PostNordClient", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function mockFetch(status: number, body: unknown) {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? "OK" : "Error",
      json: () => Promise.resolve(body),
    })
  }

  // ── createShipment ──

  describe("createShipment", () => {
    it("creates a shipment and returns parsed response", async () => {
      const client = new PostNordClient(defaultClientOpts)

      mockFetch(200, {
        createShipmentResponse: {
          shipments: [
            {
              shipmentId: "SHP-001",
              items: [
                {
                  itemId: "ITEM-001",
                  trackingInformation: {
                    trackingId: "TRACK-001",
                    trackingUrl: "https://tracking.postnord.com/...",
                  },
                },
              ],
            },
          ],
          bookingRef: "BOOK-001",
          labelPrintout: { href: "https://labels.postnord.com/label.pdf" },
        },
      })

      const result = await client.createShipment({
        serviceId: "mypack_home",
        senderAddress: {
          name: "Sender",
          street: "Street 1",
          postalCode: "11111",
          city: "Stockholm",
          countryCode: "SE",
        },
        recipientAddress: {
          name: "Recipient",
          street: "Street 2",
          postalCode: "22222",
          city: "Gothenburg",
          countryCode: "SE",
        },
        parcels: [{ weight_grams: 2000 }],
      })

      expect(result.shipmentId).toBe("SHP-001")
      expect(result.bookingRef).toBe("BOOK-001")
      expect(result.trackingNumber).toBe("TRACK-001")
      expect(result.labelUrl).toBe("https://labels.postnord.com/label.pdf")
      expect(result.parcels).toHaveLength(1)
    })
  })

  // ── cancelShipment ──

  describe("cancelShipment", () => {
    it("returns success on 204", async () => {
      const client = new PostNordClient(defaultClientOpts)

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        statusText: "No Content",
        json: () => Promise.resolve(undefined),
      })

      const result = await client.cancelShipment("SHP-001")
      expect(result.success).toBe(true)
    })
  })

  // ── findServicePoints ──

  describe("findServicePoints", () => {
    it("parses service points from API response", async () => {
      const client = new PostNordClient(defaultClientOpts)

      mockFetch(200, {
        servicePointInformationResponse: {
          servicePoints: [
            {
              servicePointId: "SP-001",
              name: "ICA Maxi",
              deliveryAddress: {
                streetName: "Kungsgatan",
                streetNumber: "10",
                postalCode: "11143",
                city: "Stockholm",
                countryCode: "SE",
              },
              coordinate: {
                northing: 59.3326,
                easting: 18.0649,
              },
              openingHours: {
                postalServices: [
                  {
                    openDay: "Monday",
                    openFrom: "08:00",
                    openTo: "21:00",
                  },
                ],
              },
              routeDistance: 250,
            },
          ],
        },
      })

      const points = await client.findServicePoints({
        postalCode: "11143",
        countryCode: "SE",
        limit: 5,
      })

      expect(points).toHaveLength(1)
      expect(points[0].servicePointId).toBe("SP-001")
      expect(points[0].name).toBe("ICA Maxi")
      expect(points[0].street).toBe("Kungsgatan 10")
      expect(points[0].coordinates.latitude).toBe(59.3326)
      expect(points[0].openingHours).toHaveLength(1)
      expect(points[0].distance).toBe(250)
    })

    it("returns empty array when no service points", async () => {
      const client = new PostNordClient(defaultClientOpts)

      mockFetch(200, {
        servicePointInformationResponse: {
          servicePoints: [],
        },
      })

      const points = await client.findServicePoints({
        postalCode: "99999",
        countryCode: "SE",
      })

      expect(points).toEqual([])
    })
  })

  // ── getTracking ──

  describe("getTracking", () => {
    it("parses tracking events from API response", async () => {
      const client = new PostNordClient(defaultClientOpts)

      mockFetch(200, {
        TrackingInformationResponse: {
          shipments: [
            {
              shipmentId: "SHP-001",
              statusText: {
                header: "In transit",
                body: "Your parcel is on the way",
              },
              estimatedTimeOfArrival: "2025-01-15T12:00:00Z",
              items: [
                {
                  itemId: "ITEM-001",
                  events: [
                    {
                      eventCode: "09",
                      eventDescription: "Out for delivery",
                      location: { displayName: "Stockholm" },
                      eventTime: "2025-01-15T08:00:00Z",
                    },
                    {
                      eventCode: "EN",
                      eventDescription: "Arrived at sorting facility",
                      location: { displayName: "Malmö" },
                      eventTime: "2025-01-14T14:00:00Z",
                    },
                  ],
                },
              ],
            },
          ],
        },
      })

      const tracking = await client.getTracking("TRACK-001")

      expect(tracking.carrier).toBe("postnord")
      expect(tracking.status).toBe("In transit")
      expect(tracking.estimatedDelivery).toBe("2025-01-15T12:00:00Z")
      expect(tracking.events).toHaveLength(2)
      expect(tracking.events[0].status).toBe("out_for_delivery")
      expect(tracking.events[1].status).toBe("in_transit")
    })

    it("returns unknown status when no shipments found", async () => {
      const client = new PostNordClient(defaultClientOpts)

      mockFetch(200, {
        TrackingInformationResponse: {
          shipments: [],
        },
      })

      const tracking = await client.getTracking("NONEXISTENT")

      expect(tracking.status).toBe("unknown")
      expect(tracking.events).toEqual([])
    })
  })

  // ── Error handling ──

  describe("error handling", () => {
    it("throws PostNordRequestError on API failure", async () => {
      const client = new PostNordClient(defaultClientOpts)

      mockFetch(400, {
        code: "INVALID_REQUEST",
        message: "Invalid postal code format",
      })

      await expect(
        client.findServicePoints({
          postalCode: "invalid",
          countryCode: "SE",
        })
      ).rejects.toThrow(PostNordRequestError)
    })

    it("includes status code in error", async () => {
      const client = new PostNordClient(defaultClientOpts)

      mockFetch(401, {
        code: "UNAUTHORIZED",
        message: "Invalid API key",
      })

      try {
        await client.findServicePoints({
          postalCode: "11143",
          countryCode: "SE",
        })
      } catch (error) {
        expect(error).toBeInstanceOf(PostNordRequestError)
        expect((error as PostNordRequestError).statusCode).toBe(401)
      }
    })
  })

  // ── getRate ──

  describe("getRate", () => {
    it("returns price and currency", async () => {
      const client = new PostNordClient(defaultClientOpts)

      mockFetch(200, {
        priceResponse: {
          prices: [{ amount: 89, currencyCode: "SEK" }],
        },
        transitTimeResponse: {
          transitTimes: [{ transitTimeInDays: 2 }],
        },
      })

      const rate = await client.getRate({
        serviceId: "mypack_home",
        fromPostalCode: "11122",
        fromCountryCode: "SE",
        toPostalCode: "41301",
        toCountryCode: "SE",
        weight_grams: 2000,
      })

      expect(rate.price).toBe(89)
      expect(rate.currency).toBe("SEK")
      expect(rate.estimatedDeliveryDays).toBe(2)
    })
  })

  // ── URL construction ──

  describe("URL construction", () => {
    it("uses test base URL for test environment", async () => {
      const client = new PostNordClient({ ...defaultClientOpts, environment: "test" })

      mockFetch(200, {
        servicePointInformationResponse: { servicePoints: [] },
      })

      await client.findServicePoints({
        postalCode: "11143",
        countryCode: "SE",
      })

      const callUrl = (globalThis.fetch as any).mock.calls[0][0] as string
      expect(callUrl).toContain("atapi2.postnord.com")
    })

    it("uses production base URL for production environment", async () => {
      const client = new PostNordClient({
        ...defaultClientOpts,
        environment: "production",
      })

      mockFetch(200, {
        servicePointInformationResponse: { servicePoints: [] },
      })

      await client.findServicePoints({
        postalCode: "11143",
        countryCode: "SE",
      })

      const callUrl = (globalThis.fetch as any).mock.calls[0][0] as string
      expect(callUrl).toContain("api2.postnord.com")
      expect(callUrl).not.toContain("atapi2")
    })

    it("includes apikey as query parameter", async () => {
      const client = new PostNordClient(defaultClientOpts)

      mockFetch(200, {
        servicePointInformationResponse: { servicePoints: [] },
      })

      await client.findServicePoints({
        postalCode: "11143",
        countryCode: "SE",
      })

      const callUrl = (globalThis.fetch as any).mock.calls[0][0] as string
      expect(callUrl).toContain("apikey=test-key")
    })
  })
})
