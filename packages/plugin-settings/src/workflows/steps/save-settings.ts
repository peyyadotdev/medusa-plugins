import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

type SaveSettingsInput = {
  provider_id: string
  category: string
  display_name: string
  settings: Record<string, unknown>
}

export const saveSettingsStep = createStep(
  "save-plugin-settings",
  async (input: SaveSettingsInput, { container }) => {
    const settingsService = container.resolve("pluginSettings")

    const [existingRecords] = await settingsService.listPluginSettings({
      provider_id: input.provider_id,
    })

    const previousRecord = Array.isArray(existingRecords) && existingRecords.length > 0
      ? (existingRecords[0] as Record<string, unknown>)
      : null

    const previousData = previousRecord
      ? {
          settings_data: previousRecord.settings_data as string,
          display_name: previousRecord.display_name as string,
          category: previousRecord.category as string,
          is_configured: previousRecord.is_configured as boolean,
          is_verified: previousRecord.is_verified as boolean,
        }
      : null

    const result = await settingsService.saveSettings(
      input.provider_id,
      input.category,
      input.display_name,
      input.settings
    )

    return new StepResponse(result, {
      provider_id: input.provider_id,
      previous_data: previousData,
      was_new: !previousRecord,
      record_id: (result as Record<string, unknown>).id as string,
    })
  },
  async (compensationData, { container }) => {
    if (!compensationData) return

    const settingsService = container.resolve("pluginSettings")
    const { provider_id, previous_data, was_new, record_id } = compensationData as {
      provider_id: string
      previous_data: {
        settings_data: string
        display_name: string
        category: string
        is_configured: boolean
        is_verified: boolean
      } | null
      was_new: boolean
      record_id: string
    }

    if (was_new) {
      await settingsService.deletePluginSettings(record_id)
    } else if (previous_data) {
      await settingsService.updatePluginSettings({
        id: record_id,
        settings_data: previous_data.settings_data,
        display_name: previous_data.display_name,
        category: previous_data.category,
        is_configured: previous_data.is_configured,
        is_verified: previous_data.is_verified,
      })
    }
  }
)
