import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const settingsService = req.scope.resolve("pluginSettings")
  const category = req.query.category as string | undefined

  const filters: Record<string, unknown> = {}
  if (category) {
    filters.category = category
  }

  const settings = await settingsService.listPluginSettings(filters)

  const sanitized = (Array.isArray(settings) ? settings : []).map(
    (s: Record<string, unknown>) => ({
      id: s.id,
      provider_id: s.provider_id,
      category: s.category,
      display_name: s.display_name,
      is_configured: s.is_configured,
      is_verified: s.is_verified,
      verified_at: s.verified_at,
      created_at: s.created_at,
      updated_at: s.updated_at,
    })
  )

  return res.json({ settings: sanitized })
}
