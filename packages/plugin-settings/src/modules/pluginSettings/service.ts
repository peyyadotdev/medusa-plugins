import { MedusaService } from "@medusajs/framework/utils"
import PluginSetting from "./models/plugin-setting"
import { encrypt, decrypt } from "./utils/crypto"

type SettingsPayload = Record<string, unknown>

class PluginSettingsModuleService extends MedusaService({
  PluginSetting,
}) {
  private getEncryptionKey(): string {
    const key = process.env.PLUGIN_SETTINGS_ENCRYPTION_KEY
    if (!key) {
      throw new Error(
        "PLUGIN_SETTINGS_ENCRYPTION_KEY environment variable is required"
      )
    }
    return key
  }

  async getDecryptedSettings(
    providerId: string
  ): Promise<SettingsPayload | null> {
    const [settings] = await this.listPluginSettings({
      provider_id: providerId,
    })

    if (!settings?.length) {
      return null
    }

    const setting = settings[0] ?? (settings as unknown)
    const record = Array.isArray(setting) ? setting[0] : setting
    if (!record || !(record as Record<string, unknown>).settings_data) {
      return null
    }

    try {
      const decrypted = decrypt(
        (record as Record<string, unknown>).settings_data as string,
        this.getEncryptionKey()
      )
      return JSON.parse(decrypted) as SettingsPayload
    } catch {
      return null
    }
  }

  async saveSettings(
    providerId: string,
    category: string,
    displayName: string,
    settings: SettingsPayload
  ): Promise<Record<string, unknown>> {
    const encryptedData = encrypt(
      JSON.stringify(settings),
      this.getEncryptionKey()
    )

    const [existing] = await this.listPluginSettings({
      provider_id: providerId,
    })

    const existingRecord = Array.isArray(existing) && existing.length > 0
      ? (existing[0] as Record<string, unknown>)
      : null

    if (existingRecord?.id) {
      const updated = await this.updatePluginSettings({
        id: existingRecord.id as string,
        settings_data: encryptedData,
        display_name: displayName,
        category,
        is_configured: true,
        is_verified: false,
        verified_at: null,
      })
      return updated as unknown as Record<string, unknown>
    }

    const created = await this.createPluginSettings({
      provider_id: providerId,
      category,
      display_name: displayName,
      settings_data: encryptedData,
      is_configured: true,
      is_verified: false,
    })
    return created as unknown as Record<string, unknown>
  }

  async markVerified(providerId: string): Promise<void> {
    const [existing] = await this.listPluginSettings({
      provider_id: providerId,
    })

    const record = Array.isArray(existing) && existing.length > 0
      ? (existing[0] as Record<string, unknown>)
      : null

    if (record?.id) {
      await this.updatePluginSettings({
        id: record.id as string,
        is_verified: true,
        verified_at: new Date(),
      })
    }
  }

  async markUnverified(providerId: string): Promise<void> {
    const [existing] = await this.listPluginSettings({
      provider_id: providerId,
    })

    const record = Array.isArray(existing) && existing.length > 0
      ? (existing[0] as Record<string, unknown>)
      : null

    if (record?.id) {
      await this.updatePluginSettings({
        id: record.id as string,
        is_verified: false,
        verified_at: null,
      })
    }
  }
}

export default PluginSettingsModuleService
