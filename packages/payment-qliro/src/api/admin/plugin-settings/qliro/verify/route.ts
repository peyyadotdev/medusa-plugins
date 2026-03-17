import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { QliroClient } from "../../../../../providers/qliro/client"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const settingsService = req.scope.resolve("pluginSettings")
  const settings = await settingsService.getDecryptedSettings("qliro")

  if (!settings?.apiKey || !settings?.merchantId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Qliro settings are not configured. Save settings first."
    )
  }

  const client = new QliroClient({
    apiKey: settings.apiKey as string,
    merchantId: settings.merchantId as string,
    environment:
      (settings.environment as "sandbox" | "production") || "sandbox",
  })

  try {
    await client.getCheckoutOrder("test-connection-probe")
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 401 || status === 403) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "Qliro authentication failed. Check your API key and merchant ID."
      )
    }
    if (status !== 404 && status !== 400) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Qliro connection test failed: ${(err as Error).message}`
      )
    }
  }

  await settingsService.markVerified("qliro")

  return res.json({ success: true, message: "Qliro connection verified" })
}
