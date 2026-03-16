# Payments — Category Plan

Swedish and Nordic payment providers for Medusa v2. Each provider is an independent npm package implementing `AbstractPaymentProvider`.

## Providers

| Provider | Package | Status | Priority |
|----------|---------|--------|----------|
| **Swish** | `@peyya/medusa-payment-swish` | Planned | P1 — Most used Swedish payment |
| **Klarna** | `@peyya/medusa-payment-klarna` | Planned | P1 — Dominant in Nordics |
| **Qliro** | `@peyya/medusa-payment-qliro` | Planned | P2 — Growing Swedish checkout |
| **Trustly** | `@peyya/medusa-payment-trustly` | Planned | P3 — Bank transfer alternative |

## Architecture Pattern

All payment providers follow the same pattern:

```
packages/payment-{name}/
├── src/
│   └── providers/
│       └── {name}/
│           ├── service.ts          # extends AbstractPaymentProvider<Options>
│           ├── index.ts            # ModuleProvider(Modules.PAYMENT, { services: [...] })
│           └── types.ts            # Provider-specific options and types
├── package.json
├── tsconfig.json
└── README.md
```

### Provider Service Structure

```typescript
import { AbstractPaymentProvider, MedusaError } from "@medusajs/framework/utils"

type Options = {
  apiKey: string
  webhookSecret: string
  environment?: "production" | "test"
}

class SwishProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "swish"
  protected client: SwishClient

  static validateOptions(options: Record<any, any>) { /* ... */ }
  constructor(container, options) { /* initialize client */ }

  // Core payment lifecycle
  async initiatePayment(input) { /* ... */ }
  async authorizePayment(input) { /* ... */ }
  async capturePayment(input) { /* ... */ }
  async refundPayment(input) { /* ... */ }
  async cancelPayment(input) { /* ... */ }
  async deletePayment(input) { /* ... */ }
  async updatePayment(input) { /* ... */ }
  async retrievePayment(input) { /* ... */ }
  async getPaymentStatus(input) { /* ... */ }

  // Webhook handling
  async getWebhookActionAndData(payload) { /* ... */ }

  // Account holder methods (v2.5.0+)
  async createAccountHolder(input) { /* ... */ }
  async deleteAccountHolder(input) { /* ... */ }
  async updateAccountHolder(input) { /* ... */ }
  async retrieveAccountHolder(input) { /* ... */ }
  async savePaymentMethod(input) { /* ... */ }
  async listPaymentMethods(input) { /* ... */ }
}
```

### Consumer Configuration

```typescript
// medusa-config.ts in consumer application
module.exports = defineConfig({
  plugins: [
    { resolve: "@peyya/medusa-payment-swish", options: {} },
  ],
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@peyya/medusa-payment-swish/providers/swish",
            id: "swish",
            options: {
              apiKey: process.env.SWISH_API_KEY,
              webhookSecret: process.env.SWISH_WEBHOOK_SECRET,
              environment: process.env.SWISH_ENV || "test",
            },
          },
        ],
      },
    },
  ],
})
```

## Provider-Specific Considerations

### Swish

- **Flow type:** Asynchronous (customer confirms in Swish app)
- **Currency:** SEK only
- **Amount format:** SEK, no decimals in Swish API (100.00 SEK = "100")
- **Webhook:** Swish sends callback to configured URL on payment status change
- **Certificate auth:** Swish uses client certificates, not API keys
- **Key challenge:** Certificate management, async payment flow
- **Detailed plan:** [docs/providers/swish.md](../providers/swish.md)

### Klarna

- **Flow type:** Redirect (customer completes on Klarna's page) + Klarna Checkout widget
- **Currencies:** SEK, NOK, DKK, EUR
- **Amount format:** Minor units (cents) — 100.00 SEK = 10000
- **Webhook:** Klarna sends push notifications for order events
- **Auth:** API credentials (username/password)
- **Key challenge:** Klarna Checkout vs Klarna Payments distinction, redirect flow, multi-currency
- **Detailed plan:** [docs/providers/klarna.md](../providers/klarna.md)

### Qliro

- **Flow type:** Redirect / embedded checkout
- **Currencies:** SEK, NOK, DKK, EUR
- **Amount format:** Minor units
- **Auth:** API key + merchant ID
- **Key challenge:** Qliro One checkout integration, order management API
- **Detailed plan:** [docs/providers/qliro.md](../providers/qliro.md)

### Trustly

- **Flow type:** Redirect to bank login
- **Currencies:** SEK, EUR, NOK, DKK
- **Amount format:** Standard decimal
- **Auth:** Signature-based with RSA keys
- **Key challenge:** Bank-to-bank transfer, signature verification
- **Detailed plan:** [docs/providers/trustly.md](../providers/trustly.md)

## Shared Patterns

### Currency Conversion

Medusa stores amounts as-is (49.99 = 49.99). Providers may use minor units (cents).

```typescript
// Shared utility — each provider imports as needed
function toMinorUnits(amount: number, currency: string): number { /* ... */ }
function fromMinorUnits(amount: number, currency: string): number { /* ... */ }
```

### Webhook URL Pattern

Medusa's built-in webhook route: `POST /hooks/payment/{identifier}_{id}`

| Provider | Webhook URL |
|----------|------------|
| Swish | `/hooks/payment/swish_swish` |
| Klarna | `/hooks/payment/klarna_klarna` |
| Qliro | `/hooks/payment/qliro_qliro` |
| Trustly | `/hooks/payment/trustly_trustly` |

### session_id Linking

All providers MUST store `session_id` in the payment's metadata during `initiatePayment`, and return it in `getWebhookActionAndData`. This links webhook events to the correct Medusa payment session.

## Testing Strategy

- Unit tests for each provider method with mocked third-party APIs
- Integration tests against provider sandbox/test environments
- Shared test utilities for common payment flows (initiate → authorize → capture → refund)
