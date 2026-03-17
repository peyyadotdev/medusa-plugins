import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import type { SaveSettingsSchema } from "../middlewares"
import savePluginSettingsWorkflow from "../../../../workflows/save-plugin-settings"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { providerId } = req.params
  const settingsService = req.scope.resolve("pluginSettings")

  const settings = await settingsService.getDecryptedSettings(providerId)
  if (!settings) {
    return res.json({ settings: null, is_configured: false })
  }

  const [records] = await settingsService.listPluginSettings({
    provider_id: providerId,
  })
  const record = Array.isArray(records) ? records[0] : records

  return res.json({
    settings,
    is_configured: (record as Record<string, unknown>)?.is_configured ?? false,
    is_verified: (record as Record<string, unknown>)?.is_verified ?? false,
    verified_at: (record as Record<string, unknown>)?.verified_at ?? null,
  })
}

export async function POST(
  req: AuthenticatedMedusaRequest<SaveSettingsSchema>,
  res: MedusaResponse
) {
  const { providerId } = req.params
  const { category, display_name, settings } = req.validatedBody

  const { result } = await savePluginSettingsWorkflow(req.scope).run({
    input: {
      provider_id: providerId,
      category,
      display_name,
      settings,
    },
  })

  return res.json({ setting: result })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { providerId } = req.params
  const settingsService = req.scope.resolve("pluginSettings")

  const [existing] = await settingsService.listPluginSettings({
    provider_id: providerId,
  })

  const record = Array.isArray(existing) && existing.length > 0
    ? (existing[0] as Record<string, unknown>)
    : null

  if (!record?.id) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Settings for provider "${providerId}" not found`
    )
  }

  await settingsService.deletePluginSettings(record.id as string)

  return res.json({ id: record.id, deleted: true })
}
