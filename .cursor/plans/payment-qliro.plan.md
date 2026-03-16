---
name: Payment Qliro
overview: Build @peyya/medusa-payment-qliro -- Swedish checkout platform with embedded Qliro One checkout and Order Management API.
todos:
  - id: qliro-scaffold
    content: "Phase 1: Scaffold packages/payment-qliro/ -- package.json, tsconfig, directory structure"
    status: pending
  - id: qliro-types
    content: "Phase 2: Define QliroOptions, QliroCheckoutOrder, QliroCallback types"
    status: pending
  - id: qliro-client
    content: "Phase 3: Implement Qliro API client (Qliro One Checkout API, Order Management API)"
    status: pending
  - id: qliro-validate
    content: "Phase 4.1: Implement static validateOptions -- require apiKey, merchantId"
    status: pending
  - id: qliro-initiate
    content: "Phase 4.2: Implement initiatePayment -- create Qliro checkout session, return checkout snippet/URL"
    status: pending
  - id: qliro-authorize
    content: "Phase 4.3: Implement authorizePayment -- verify Qliro order completion status"
    status: pending
  - id: qliro-webhook
    content: "Phase 4.4: Implement getWebhookActionAndData -- handle Qliro checkout callbacks"
    status: pending
  - id: qliro-lifecycle
    content: "Phase 4.5: Implement capturePayment, refundPayment, cancelPayment via Order Management API"
    status: pending
  - id: qliro-remaining
    content: "Phase 4.6: Implement deletePayment, getPaymentStatus, retrievePayment, updatePayment"
    status: pending
  - id: qliro-export
    content: "Phase 5: Create index.ts with ModuleProvider export"
    status: pending
  - id: qliro-tests
    content: "Phase 6: Write Vitest unit tests with mocked Qliro API"
    status: pending
  - id: qliro-readme
    content: "Phase 7: Write README and verify build"
    status: pending
isProject: false
---

# Payment Qliro

P2 priority. Growing Swedish checkout platform competing with Klarna. Embedded checkout widget (Qliro One) with multi-currency support.

**Docs:** [docs/plugins/payments.md](docs/plugins/payments.md), [docs/providers/payment-qliro.md](docs/providers/payment-qliro.md)
**Package:** `@peyya/medusa-payment-qliro` in `packages/payment-qliro/`

---

## Phase 1 -- Scaffold

```
packages/payment-qliro/
  src/providers/qliro/
    service.ts       # QliroProviderService extends AbstractPaymentProvider
    index.ts         # ModuleProvider export
    types.ts         # QliroOptions, Qliro API types
    client.ts        # Qliro One API client
    currency.ts      # Minor unit conversion (shared pattern with Klarna)
  package.json
  tsconfig.json
  README.md
```

### package.json

```json
{
  "name": "@peyya/medusa-payment-qliro",
  "version": "0.0.1",
  "description": "Qliro One checkout provider for Medusa v2",
  "keywords": ["medusa-v2", "medusa-plugin-integration", "medusa-plugin-payment"],
  "exports": {
    ".": "./dist/index.js",
    "./providers/*": "./dist/providers/*/index.js"
  },
  "devDependencies": {
    "@medusajs/framework": "^2.5.0",
    "@medusajs/medusa": "^2.5.0",
    "@medusajs/cli": "^2.5.0",
    "@swc/core": "^1.5.7"
  },
  "peerDependencies": {
    "@medusajs/framework": "^2.5.0",
    "@medusajs/medusa": "^2.5.0"
  }
}
```

---

## Phase 2 -- Types

```typescript
type QliroOptions = {
  apiKey: string
  merchantId: string
  environment: "sandbox" | "production"
}

type QliroCheckoutOrder = {
  orderId: string
  merchantReference: string    // Our session_id
  totalPrice: number           // Minor units
  currency: string
  orderItems: QliroOrderItem[]
  merchantCheckoutStatusPushUrl: string  // Webhook URL
}
```

Currencies: SEK, NOK, DKK, EUR. Amount format: minor units (same as Klarna).

---

## Phase 3 -- Qliro API Client

- **Auth:** API key in `Authorization` header
- **Endpoints:**
  - Sandbox: `https://checkout-api.sandbox.qliro.com`
  - Production: `https://checkout-api.qliro.com`
- **APIs:**
  - Qliro One Checkout API -- create/get checkout session
  - Order Management API -- capture, refund, cancel

---

## Phase 4 -- Provider Service

```
class QliroProviderService extends AbstractPaymentProvider<QliroOptions>
  static identifier = "qliro"
```


| Method                     | Qliro behavior                                                     |
| -------------------------- | ------------------------------------------------------------------ |
| `validateOptions` (static) | Require `apiKey`, `merchantId`                                     |
| `initiatePayment`          | Create Qliro checkout; return checkout HTML snippet for storefront |
| `authorizePayment`         | Verify Qliro order completed; return authorized                    |
| `getWebhookActionAndData`  | Handle Qliro checkout status push; map to Medusa actions           |
| `capturePayment`           | Call Qliro capture with amount in minor units                      |
| `refundPayment`            | Call Qliro refund API                                              |
| `cancelPayment`            | Call Qliro cancel (pre-capture only)                               |
| `deletePayment`            | Release Qliro order                                                |
| `getPaymentStatus`         | Fetch Qliro order status                                           |
| `retrievePayment`          | Fetch full Qliro order                                             |
| `updatePayment`            | Update Qliro checkout with new cart data                           |


session_id stored in Qliro's `merchantReference` field.

---

## Phase 5 -- Consumer Configuration

```typescript
module.exports = defineConfig({
  modules: [{
    resolve: "@medusajs/medusa/payment",
    options: {
      providers: [{
        resolve: "@peyya/medusa-payment-qliro/providers/qliro",
        id: "qliro",
        options: {
          apiKey: process.env.QLIRO_API_KEY,
          merchantId: process.env.QLIRO_MERCHANT_ID,
          environment: process.env.QLIRO_ENV || "sandbox",
        },
      }],
    },
  }],
})
```

Webhook route: `POST /hooks/payment/qliro_qliro`

---

## Phase 6 -- Tests and README

- Unit tests for all provider methods with mocked Qliro API
- Currency conversion tests (SEK, EUR, NOK, DKK)
- README with installation, config, Qliro sandbox setup guide, storefront widget integration

