import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PostNordClient } from "../../../../../providers/postnord/client"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const settingsService = req.scope.resolve("pluginSettings")
  const settings = await settingsService.getDecryptedSettings("postnord")

  if (!settings?.apiKey || !settings?.customerNumber) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "PostNord settings are not configured. Save settings first."
    )
  }

  const client = new PostNordClient({
    apiKey: settings.apiKey as string,
    customerNumber: settings.customerNumber as string,
    environment:
      (settings.environment as "test" | "production") || "test",
  })

  try {
    await client.findServicePoints({
      countryCode: "SE",
      postalCode: "11120",
    })
  } catch (err: unknown) {
    const message = (err as Error)?.message || "Unknown error"
    if (message.includes("401") || message.includes("403")) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "PostNord authentication failed. Check your API key."
      )
    }
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `PostNord connection test failed: ${message}`
    )
  }

  await settingsService.markVerified("postnord")

  return res.json({ success: true, message: "PostNord connection verified" })
}
