import { defineMiddlewares, authenticate } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/plugin-settings/klarna/verify",
      method: "POST",
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
  ],
})
