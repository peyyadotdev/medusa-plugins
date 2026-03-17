import { model } from "@medusajs/framework/utils"

const PluginSetting = model.define("plugin_setting", {
  id: model.id().primaryKey(),
  provider_id: model.text().searchable(),
  category: model.text(),
  display_name: model.text(),
  settings_data: model.text(),
  is_configured: model.boolean().default(false),
  is_verified: model.boolean().default(false),
  verified_at: model.dateTime().nullable(),
})

export default PluginSetting
