# @peyya/medusa-payment-qliro

Qliro One checkout provider for [Medusa v2](https://medusajs.com/). Embeds the Qliro One checkout widget in your storefront with full Order Management API support for captures, refunds, and cancellations.

## Features

- Embedded Qliro One checkout (HTML snippet)
- Order Management API (capture, refund, cancel)
- Webhook-driven authorization via checkout status push
- Multi-currency support (SEK, NOK, DKK, EUR)
- Sandbox and production environments

## Installation

```bash
npm install @peyya/medusa-payment-qliro
# or
yarn add @peyya/medusa-payment-qliro
```

## Configuration

Add the provider to your `medusa-config.ts`:

```typescript
import { defineConfig, Modules } from "@medusajs/framework/utils"

module.exports = defineConfig({
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@peyya/medusa-payment-qliro/providers/qliro",
            id: "qliro",
            options: {
              apiKey: process.env.QLIRO_API_KEY,
              merchantId: process.env.QLIRO_MERCHANT_ID,
              environment: process.env.QLIRO_ENV || "sandbox",
            },
          },
        ],
      },
    },
  ],
})
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `QLIRO_API_KEY` | Yes | Your Qliro API key |
| `QLIRO_MERCHANT_ID` | Yes | Your Qliro merchant ID |
| `QLIRO_ENV` | No | `sandbox` (default) or `production` |

## Qliro Sandbox Setup

1. Sign up at [Qliro Developer Portal](https://developers.qliro.com/)
2. Create a test merchant account
3. Obtain your sandbox API key and merchant ID
4. Set the environment variables above

## Storefront Integration

The `initiatePayment` method returns an `html_snippet` in the payment session data. Render this snippet in your checkout page to display the Qliro One checkout widget:

```tsx
// Example: React storefront
function QliroCheckout({ paymentSession }) {
  const snippet = paymentSession.data?.html_snippet

  if (!snippet) return null

  return (
    <div
      dangerouslySetInnerHTML={{ __html: snippet }}
    />
  )
}
```

## Webhook

Qliro sends checkout status updates to:

```
POST /hooks/payment/qliro_qliro
```

This is handled automatically by Medusa's webhook infrastructure. Configure `MerchantCheckoutStatusPushUrl` to point to your Medusa instance's webhook endpoint.

## Payment Flow

```
1. Customer reaches checkout
   → initiatePayment() creates Qliro checkout session
   → Returns HTML snippet for embedding

2. Customer completes checkout in Qliro widget
   → Qliro sends status push webhook

3. Webhook received
   → getWebhookActionAndData() maps Qliro status to Medusa action
   → Medusa authorizes payment and creates order

4. Admin captures payment
   → capturePayment() calls Qliro Order Management API

5. Admin refunds (if needed)
   → refundPayment() calls Qliro refund endpoint
```

## Supported Currencies

| Currency | Country | Minor unit |
|---|---|---|
| SEK | Sweden | öre (1 SEK = 100 öre) |
| NOK | Norway | øre (1 NOK = 100 øre) |
| DKK | Denmark | øre (1 DKK = 100 øre) |
| EUR | Finland | cent (1 EUR = 100 cent) |

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build
```

## License

MIT
