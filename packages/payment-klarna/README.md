# @peyya/medusa-payment-klarna

Klarna Checkout v3 payment provider for Medusa v2.

Supports redirect-based Klarna Checkout and embedded widget flows with multi-currency support across EU, NA, and OC regions.

## Installation

```bash
npm install @peyya/medusa-payment-klarna
# or
yarn add @peyya/medusa-payment-klarna
```

### Peer Dependencies

- `@medusajs/framework` ^2.5.0
- `@medusajs/medusa` ^2.5.0

## Configuration

Add the plugin and provider to your `medusa-config.ts`:

```typescript
module.exports = defineConfig({
  plugins: [
    { resolve: "@peyya/medusa-payment-klarna", options: {} },
  ],
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@peyya/medusa-payment-klarna/providers/klarna",
            id: "klarna",
            options: {
              username: process.env.KLARNA_USERNAME,
              password: process.env.KLARNA_PASSWORD,
              region: "eu",
              environment: process.env.KLARNA_ENV || "playground",
            },
          },
        ],
      },
    },
  ],
})
```

### Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `username` | `string` | Yes | Klarna API username (e.g., `K12345_abcdef`) |
| `password` | `string` | Yes | Klarna API password |
| `region` | `"eu" \| "na" \| "oc"` | Yes | API region (Europe, North America, Oceania) |
| `environment` | `"playground" \| "production"` | No | Defaults to `"playground"` |

### Environment Variables

```env
KLARNA_USERNAME=K12345_abcdef
KLARNA_PASSWORD=your-klarna-api-password
KLARNA_ENV=playground
```

## Multi-Currency Support

The provider automatically resolves purchase country from currency code:

| Currency | Country |
|----------|---------|
| SEK | SE (Sweden) |
| NOK | NO (Norway) |
| DKK | DK (Denmark) |
| EUR | FI (Finland) |
| GBP | GB (United Kingdom) |
| USD | US (United States) |
| AUD | AU (Australia) |
| NZD | NZ (New Zealand) |

All amounts are converted between Medusa's standard units and Klarna's minor units (e.g., SEK 199.00 becomes 19900 oere).

## Storefront Integration

### Embedded Widget

The `initiatePayment` response includes an `html_snippet` field containing Klarna's checkout widget HTML. Render this snippet in your storefront to embed the Klarna checkout:

```typescript
const session = await sdk.client.fetch("/store/payment-sessions", {
  method: "POST",
  body: { provider_id: "pp_klarna_klarna", /* ... */ },
})

// session.data.html_snippet contains the Klarna Checkout widget HTML
document.getElementById("klarna-container").innerHTML = session.data.html_snippet
```

### Redirect Flow

Alternatively, configure `confirmation_url` and `push_url` in the payment data to use Klarna's redirect-based flow.

## Webhook Setup

Klarna sends push notifications when checkout completes. The webhook URL follows Medusa's convention:

```
POST /hooks/payment/klarna_klarna
```

Configure this URL in your Klarna Merchant Portal or pass it as `push_url` during payment initiation.

## Checkout Flow

1. Customer selects Klarna → `initiatePayment` creates a Klarna Checkout session
2. Customer completes Klarna checkout (widget or redirect)
3. Klarna sends push notification → `getWebhookActionAndData` verifies and authorizes
4. Storefront confirms → `authorizePayment` acknowledges the order with Klarna
5. Admin captures → `capturePayment` calls Klarna capture API
6. Admin refunds (optional) → `refundPayment` calls Klarna refund API

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
