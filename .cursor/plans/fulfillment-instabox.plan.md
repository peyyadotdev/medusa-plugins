---
name: Fulfillment Instabox
overview: Build @peyya/medusa-fulfillment-instabox -- locker-based delivery with same/next-day options and return-via-locker for Sweden.
todos:
  - id: instabox-scaffold
    content: "Phase 1: Scaffold packages/fulfillment-instabox/ -- package.json, tsconfig, directory structure"
    status: pending
  - id: instabox-types
    content: "Phase 2: Define InstaboxOptions, shipment/locker types"
    status: pending
  - id: instabox-client
    content: "Phase 3: Implement Instabox API client (Shipment API, Locker API)"
    status: pending
  - id: instabox-validate
    content: "Phase 4.1: Implement validateOptions -- require API credentials"
    status: pending
  - id: instabox-options
    content: "Phase 4.2: Implement getFulfillmentOptions -- locker delivery, express locker"
    status: pending
  - id: instabox-validate-data
    content: "Phase 4.3: Implement validateFulfillmentData -- validate locker availability, parcel size"
    status: pending
  - id: instabox-price
    content: "Phase 4.4: Implement calculatePrice"
    status: pending
  - id: instabox-create
    content: "Phase 4.5: Implement createFulfillment -- create shipment, get locker code"
    status: pending
  - id: instabox-return
    content: "Phase 4.6: Implement createReturnFulfillment -- return via locker"
    status: pending
  - id: instabox-cancel-docs
    content: "Phase 4.7: Implement cancelFulfillment, getFulfillmentDocuments"
    status: pending
  - id: instabox-locker
    content: "Phase 5: Add locker location lookup API route"
    status: pending
  - id: instabox-export
    content: "Phase 6: Create index.ts with ModuleProvider export"
    status: pending
  - id: instabox-tests
    content: "Phase 7: Write Vitest unit tests and README"
    status: pending
isProject: false
---

# Fulfillment Instabox

P2 priority. Locker-based delivery network across Sweden. Same/next-day options. Return parcels via locker.

**Docs:** [docs/plugins/fulfillment.md](docs/plugins/fulfillment.md), [docs/providers/fulfillment-instabox.md](docs/providers/fulfillment-instabox.md)
**Package:** `@peyya/medusa-fulfillment-instabox` in `packages/fulfillment-instabox/`

---

## Phase 1 -- Scaffold

```
packages/fulfillment-instabox/
  src/providers/instabox/
    service.ts       # InstaboxFulfillmentService extends AbstractFulfillmentProvider
    index.ts         # ModuleProvider export
    types.ts         # InstaboxOptions, shipment/locker types
    client.ts        # Instabox Merchant API client
  src/api/
    store/fulfillment/instabox/
      lockers/
        route.ts     # GET /store/fulfillment/instabox/lockers
  package.json
  tsconfig.json
  README.md
```

---

## Phase 2 -- Types

```typescript
type InstaboxOptions = {
  apiKey: string
  merchantId: string
  environment: "test" | "production"
}

type InstaboxService = "locker_standard" | "locker_express"

type InstaboxLocker = {
  id: string
  name: string
  address: { street: string; postalCode: string; city: string }
  coordinates: { lat: number; lng: number }
  availableSlots: number
  openingHours: string
}
```

---

## Phase 3 -- Instabox API Client

- **Auth:** API key + merchant ID
- **APIs:**
  - **Shipment API** -- create/cancel shipments
  - **Locker API** -- find lockers, check availability
- **Key feature:** Each shipment gets a unique locker code the customer uses to open the locker

---

## Phase 4 -- Provider Service

```
class InstaboxFulfillmentService extends AbstractFulfillmentProvider
  static identifier = "instabox"
```

| Method                      | Instabox behavior                                                    |
| --------------------------- | -------------------------------------------------------------------- |
| `validateOptions` (static)  | Require `apiKey`, `merchantId`                                       |
| `getFulfillmentOptions`     | Return locker standard + locker express options                      |
| `validateFulfillmentData`   | Validate locker availability and parcel size constraints             |
| `calculatePrice`            | Price based on service tier (standard vs express)                    |
| `createFulfillment`         | Create shipment; return tracking number + locker code for customer   |
| `createReturnFulfillment`   | Generate return-via-locker shipment                                  |
| `cancelFulfillment`         | Cancel shipment if not yet delivered                                 |
| `getFulfillmentDocuments`   | Retrieve shipping label                                              |

### Locker capacity

`validateFulfillmentData` must check the selected locker has available slots. Locker assignment may happen at creation time rather than validation time -- implementation depends on Instabox API behavior.

---

## Phase 5 -- Locker Lookup

```
GET /store/fulfillment/instabox/lockers?postal_code=12345&limit=10
```

Returns available lockers with slot availability. Same standardized format as PostNord/DHL/Budbee pickup point responses.

---

## Phase 6 -- Consumer Configuration

```typescript
module.exports = defineConfig({
  modules: [{
    resolve: "@medusajs/medusa/fulfillment",
    options: {
      providers: [{
        resolve: "@peyya/medusa-fulfillment-instabox/providers/instabox",
        id: "instabox",
        options: {
          apiKey: process.env.INSTABOX_API_KEY,
          merchantId: process.env.INSTABOX_MERCHANT_ID,
          environment: process.env.INSTABOX_ENV || "test",
        },
      }],
    },
  }],
})
```

---

## Phase 7 -- Tests and README

- Locker availability validation
- Shipment creation with locker code
- Return-via-locker flow
- Locker lookup API with mock data
- README with config, locker integration guide for storefronts
