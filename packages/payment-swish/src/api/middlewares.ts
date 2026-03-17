import { defineMiddlewares, authenticate } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/swish/generate-keypair",
      method: "POST",
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/swish/create-certificate",
      method: "POST",
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/swish/verify",
      method: "POST",
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
  ],
})
