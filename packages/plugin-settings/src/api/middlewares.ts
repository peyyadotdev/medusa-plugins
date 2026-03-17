import { defineMiddlewares } from "@medusajs/framework/http"
import { pluginSettingsMiddlewares } from "./admin/plugin-settings/middlewares"

export default defineMiddlewares({
  routes: [...pluginSettingsMiddlewares],
})
