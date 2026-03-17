import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { KlarnaClient } from "../../../../../providers/klarna/client"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const settingsService = req.scope.resolve("pluginSettings")
  const settings = await settingsService.getDecryptedSettings("klarna")

  if (!settings?.username || !settings?.password || !settings?.region) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Klarna settings are not configured. Save settings first."
    )
  }

  const client = new KlarnaClient({
    username: settings.username as string,
    password: settings.password as string,
    region: settings.region as "eu" | "na" | "oc",
    environment: (settings.environment as "playground" | "production") || "playground",
  })

  try {
    await client.getOrder("test-connection-probe")
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 401 || status === 403) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "Klarna authentication failed. Check your username and password."
      )
    }
    // 404 means credentials work but order doesn't exist -- that's a success
    if (status !== 404) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Klarna connection test failed: ${(err as Error).message}`
      )
    }
  }

  await settingsService.markVerified("klarna")

  return res.json({ success: true, message: "Klarna connection verified" })
}
