import {
  MiddlewareRoute,
  authenticate,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { z } from "zod"

export const SaveSettingsSchema = z.object({
  category: z.string().min(1),
  display_name: z.string().min(1),
  settings: z.record(z.unknown()),
})

export type SaveSettingsSchema = z.infer<typeof SaveSettingsSchema>

export const pluginSettingsMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/plugin-settings",
    method: "GET",
    middlewares: [authenticate("user", ["session", "bearer"])],
  },
  {
    matcher: "/admin/plugin-settings/:providerId",
    method: "GET",
    middlewares: [authenticate("user", ["session", "bearer"])],
  },
  {
    matcher: "/admin/plugin-settings/:providerId",
    method: "POST",
    middlewares: [
      authenticate("user", ["session", "bearer"]),
      validateAndTransformBody(SaveSettingsSchema),
    ],
  },
  {
    matcher: "/admin/plugin-settings/:providerId",
    method: "DELETE",
    middlewares: [authenticate("user", ["session", "bearer"])],
  },
]
