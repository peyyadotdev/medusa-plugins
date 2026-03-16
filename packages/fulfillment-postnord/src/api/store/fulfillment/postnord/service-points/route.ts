import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PostNordClient } from "../../../../../providers/postnord/client"

/**
 * GET /store/fulfillment/postnord/service-points
 *
 * Query params:
 *   postal_code (required) - postal code to search near
 *   country     (required) - ISO country code (e.g. "SE")
 *   limit       (optional) - max results, default 10
 *   street      (optional) - street name for more precise results
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const postalCode = req.query.postal_code as string | undefined
  const country = req.query.country as string | undefined
  const limit = req.query.limit ? Number(req.query.limit) : 10
  const street = req.query.street as string | undefined

  if (!postalCode || !country) {
    res.status(400).json({
      message: "postal_code and country query parameters are required.",
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
    const servicePoints = await client.findServicePoints({
      postalCode,
      countryCode: country,
      limit,
      streetName: street,
    })

    res.json({ service_points: servicePoints })
  } catch (error) {
    const err = error as Error
    res.status(502).json({
      message: `Failed to fetch service points: ${err.message}`,
    })
  }
}
