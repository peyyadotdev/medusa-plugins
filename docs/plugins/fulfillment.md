# Fulfillment — Category Plan

Nordic shipping and delivery providers for Medusa v2. Each provider is an independent npm package implementing `AbstractFulfillmentProvider`.

## Providers

| Provider | Package | Status | Priority |
|----------|---------|--------|----------|
| **PostNord** | `@peyya/medusa-fulfillment-postnord` | Planned | P1 — Swedish postal service |
| **DHL** | `@peyya/medusa-fulfillment-dhl` | Planned | P1 — Major Nordic carrier |
| **Budbee** | `@peyya/medusa-fulfillment-budbee` | Planned | P2 — Last-mile delivery |
| **Instabox** | `@peyya/medusa-fulfillment-instabox` | Planned | P2 — Locker delivery |

## Architecture Pattern

All fulfillment providers follow the Medusa Module Provider pattern:

```
packages/fulfillment-{name}/
├── src/
│   └── providers/
│       └── {name}/
│           ├── service.ts          # extends AbstractFulfillmentProvider
│           ├── index.ts            # ModuleProvider(Modules.FULFILLMENT, { services: [...] })
│           └── types.ts            # Provider-specific options and types
├── package.json
├── tsconfig.json
└── README.md
```

### Provider Service Structure

The `AbstractFulfillmentProvider` requires implementing:

```typescript
import { AbstractFulfillmentProvider } from "@medusajs/framework/utils"

class PostNordProviderService extends AbstractFulfillmentProvider {
  static identifier = "postnord"

  // Validate provider options at startup
  static validateOptions(options: Record<any, any>) { /* ... */ }

  // Get available shipping options (service types)
  async getFulfillmentOptions(): Promise<Record<string, unknown>[]> { /* ... */ }

  // Validate a specific fulfillment option
  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<Record<string, unknown>> { /* ... */ }

  // Validate an option for a specific context (e.g., weight, dimensions)
  async validateOption(data: Record<string, unknown>): Promise<boolean> { /* ... */ }

  // Check if the provider can calculate shipping rates
  async canCalculate(data: Record<string, unknown>): Promise<boolean> { /* ... */ }

  // Calculate shipping price for a given option and cart context
  async calculatePrice(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<number> { /* ... */ }

  // Create a fulfillment (book shipment, generate label)
  async createFulfillment(
    data: Record<string, unknown>,
    items: Record<string, unknown>[],
    order: Record<string, unknown>,
    fulfillment: Record<string, unknown>
  ): Promise<Record<string, unknown>> { /* ... */ }

  // Cancel a fulfillment
  async cancelFulfillment(fulfillment: Record<string, unknown>): Promise<Record<string, unknown>> { /* ... */ }

  // Create a return fulfillment (return label)
  async createReturnFulfillment(fulfillment: Record<string, unknown>): Promise<Record<string, unknown>> { /* ... */ }

  // Get shipment documents (labels, customs docs)
  async getFulfillmentDocuments(data: Record<string, unknown>): Promise<Record<string, unknown>[]> { /* ... */ }

  // Get return documents (return labels)
  async getReturnDocuments(data: Record<string, unknown>): Promise<Record<string, unknown>[]> { /* ... */ }
}
```

### Consumer Configuration

```typescript
module.exports = defineConfig({
  plugins: [
    { resolve: "@peyya/medusa-fulfillment-postnord", options: {} },
  ],
  modules: [
    {
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          {
            resolve: "@peyya/medusa-fulfillment-postnord/providers/postnord",
            id: "postnord",
            options: {
              apiKey: process.env.POSTNORD_API_KEY,
              customerNumber: process.env.POSTNORD_CUSTOMER_NUMBER,
              environment: process.env.POSTNORD_ENV || "test",
            },
          },
        ],
      },
    },
  ],
})
```

## Provider-Specific Considerations

### PostNord

- **Services:** MyPack Home, MyPack Collect (pickup point), Parcel, Letter
- **API:** PostNord Shipping API v3 + Booking API
- **Features:** Shipping labels (PDF), tracking, pickup point lookup, return labels
- **Price calculation:** Based on weight, dimensions, zones
- **Swedish focus:** SE domestic + SE→Nordic shipping
- **Key challenge:** Multiple service types with different rules, pickup point integration
- **Detailed plan:** [docs/providers/postnord.md](../providers/postnord.md)

### DHL

- **Services:** DHL Freight (heavy), DHL Parcel (lightweight), DHL Express, DHL Service Point
- **API:** DHL Parcel API + DHL Freight API (separate APIs)
- **Features:** Labels, tracking, service point lookup, customs for international
- **Price calculation:** Weight/volume-based with zones
- **Swedish focus:** DHL Sweden domestic services
- **Key challenge:** Multiple DHL APIs for different service types
- **Detailed plan:** [docs/providers/dhl.md](../providers/dhl.md)

### Budbee

- **Services:** Home delivery (same-day, next-day), Budbee Box (locker)
- **API:** Budbee Integration API
- **Features:** Time-window delivery, real-time tracking, sustainability metrics
- **Coverage:** Stockholm, Gothenburg, Malmö + expanding
- **Key challenge:** Coverage area validation, time-window slots
- **Detailed plan:** [docs/providers/budbee.md](../providers/budbee.md)

### Instabox

- **Services:** Locker delivery, home delivery
- **API:** Instabox Merchant API
- **Features:** Locker lookup, tracking, return via locker
- **Coverage:** Sweden + expanding Nordic
- **Key challenge:** Locker availability, capacity management
- **Detailed plan:** [docs/providers/instabox.md](../providers/instabox.md)

## Shared Features

### Pickup Point / Service Point Lookup

PostNord, DHL, and Instabox all support pickup/service points. Common pattern:

```
Store API route: GET /store/fulfillment/pickup-points?provider=postnord&postal_code=12345
```

Each provider implements a pickup point lookup that returns standardized data (name, address, opening hours, distance).

### Tracking Integration

All providers support shipment tracking. Pattern:

```
Store API route: GET /store/orders/:id/tracking
→ Returns tracking URL and/or tracking events from provider
```

### Label Generation

All providers generate shipping labels (PDF). These are returned from `createFulfillment` and stored in `getFulfillmentDocuments`.

### Return Labels

All providers support return label generation via `createReturnFulfillment` and `getReturnDocuments`.

## Testing Strategy

- Unit tests with mocked carrier APIs
- Integration tests against carrier sandbox environments
- Test scenarios: domestic SE shipment, SE→Nordic, SE→EU, return label, pickup point lookup
