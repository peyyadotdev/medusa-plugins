import PluginSettingsModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const PLUGIN_SETTINGS_MODULE = "pluginSettings"

export default Module(PLUGIN_SETTINGS_MODULE, {
  service: PluginSettingsModuleService,
})
