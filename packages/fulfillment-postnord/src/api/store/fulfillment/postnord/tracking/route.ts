import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PostNordClient } from "../../../../../providers/postnord/client"

/**
 * GET /store/fulfillment/postnord/tracking?tracking_number=XXXXX
 *
 * Returns tracking events, status, and tracking URL for a PostNord shipment.
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const trackingNumber = req.query.tracking_number as string | undefined

  if (!trackingNumber) {
    res.status(400).json({
      message: "tracking_number query parameter is required.",
    })
    return
  }

  const apiKey = process.env.POSTNORD_API_KEY
  const customerNumber = process.env.POSTNORD_CUSTOMER_NUMBER
  const environment =
    (process.env.POSTNORD_ENV as "test" | "production") || "test"

  if (!apiKey || !customerNumber) {
    res.status(500).json({
      message: "PostNord API credentials not configured.",
    })
    return
  }

  const client = new PostNordClient({
    apiKey,
    customerNumber,
    environment,
  })

  try {
    const tracking = await client.getTracking(trackingNumber)
    res.json({ tracking })
  } catch (error) {
    const err = error as Error
    res.status(502).json({
      message: `Failed to fetch tracking: ${err.message}`,
    })
  }
}
