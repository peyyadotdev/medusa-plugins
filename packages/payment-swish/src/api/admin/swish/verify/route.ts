import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { SwishClient } from "../../../../providers/swish/client"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const settingsService = req.scope.resolve("pluginSettings")
  const settings = await settingsService.getDecryptedSettings("swish")

  if (!settings?.certificateBase64 && !settings?.certificatePath) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No Swish certificate configured. Complete the certificate setup first."
    )
  }

  if (!settings?.payeeAlias) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Swish number (payeeAlias) is not configured."
    )
  }

  const environment =
    (settings.environment as "test" | "production") || "test"

  const client = new SwishClient({
    certificateBase64: settings.certificateBase64 as string | undefined,
    certificatePath: settings.certificatePath as string | undefined,
    certificatePassword: settings.certificatePassword as string | undefined,
    environment,
  })

  try {
    await client.getPaymentRequest("nonexistent-id-for-connection-test")
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status

    // 404 = cert works but no payment found -- connection is valid
    if (status === 404 || status === 400) {
      await settingsService.markVerified("swish")
      return res.json({
        success: true,
        message: "Swish mTLS connection verified.",
      })
    }

    // 401/403 = cert rejected
    if (status === 401 || status === 403) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "Swish certificate authentication failed. Check your certificate."
      )
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Swish connection test failed: ${(err as Error).message}`
    )
  }

  await settingsService.markVerified("swish")

  return res.json({
    success: true,
    message: "Swish mTLS connection verified.",
  })
}
