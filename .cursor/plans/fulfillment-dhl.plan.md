---
name: Fulfillment DHL
overview: Build @peyya/medusa-fulfillment-dhl -- DHL Express, Parcel, and ServicePoint delivery for Swedish e-commerce with labels, tracking, and service point lookup.
todos:
  - id: dhl-scaffold
    content: "Phase 1: Scaffold packages/fulfillment-dhl/ -- package.json, tsconfig, directory structure"
    status: pending
  - id: dhl-types
    content: "Phase 2: Define DhlOptions, shipment/tracking types for Express and Parcel APIs"
    status: pending
  - id: dhl-client
    content: "Phase 3: Implement DHL API client (Express API, Parcel API, ServicePoint API, Tracking API)"
    status: pending
  - id: dhl-validate
    content: "Phase 4.1: Implement validateOptions -- require API key, account number, site ID"
    status: pending
  - id: dhl-options
    content: "Phase 4.2: Implement getFulfillmentOptions -- Express, Parcel, ServicePoint delivery"
    status: pending
  - id: dhl-validate-data
    content: "Phase 4.3: Implement validateFulfillmentData and validateOption"
    status: pending
  - id: dhl-price
    content: "Phase 4.4: Implement calculatePrice via DHL rate API (weight/volume, zones)"
    status: pending
  - id: dhl-create
    content: "Phase 4.5: Implement createFulfillment -- book DHL shipment, get waybill number"
    status: pending
  - id: dhl-return
    content: "Phase 4.6: Implement createReturnFulfillment -- generate return labels"
    status: pending
  - id: dhl-cancel-docs
    content: "Phase 4.7: Implement cancelFulfillment, getFulfillmentDocuments, getReturnDocuments"
    status: pending
  - id: dhl-service-points
    content: "Phase 5: Add ServicePoint lookup API route"
    status: pending
  - id: dhl-tracking
    content: "Phase 6: Implement tracking integration via DHL Tracking API"
    status: pending
  - id: dhl-export
    content: "Phase 7: Create index.ts with ModuleProvider export"
    status: pending
  - id: dhl-tests
    content: "Phase 8: Write Vitest unit tests and README"
    status: pending
isProject: false
---

# Fulfillment DHL

P1 priority. Major Nordic carrier with Express, Parcel, and ServicePoint delivery. Multiple DHL APIs for different service tiers.

**Docs:** [docs/plugins/fulfillment.md](docs/plugins/fulfillment.md), [docs/providers/fulfillment-dhl.md](docs/providers/fulfillment-dhl.md)
**Package:** `@peyya/medusa-fulfillment-dhl` in `packages/fulfillment-dhl/`

---

## Phase 1 -- Scaffold

```
packages/fulfillment-dhl/
  src/providers/dhl/
    service.ts       # DhlFulfillmentService extends AbstractFulfillmentProvider
    index.ts         # ModuleProvider export
    types.ts         # DhlOptions, shipment types
    client.ts        # DHL API client (Express + Parcel + ServicePoint + Tracking)
  src/api/
    store/fulfillment/dhl/
      service-points/
        route.ts     # GET /store/fulfillment/dhl/service-points
  package.json
  tsconfig.json
  README.md
```

---

## Phase 2 -- Types

```typescript
type DhlOptions = {
  apiKey: string
  accountNumber: string
  siteId: string
  senderAddress: {
    name: string
    street: string
    postalCode: string
    city: string
    countryCode: string
  }
  environment: "sandbox" | "production"
}

type DhlService = "express" | "parcel" | "service_point" | "freight"
```

---

## Phase 3 -- DHL API Client

DHL has separate APIs per service tier:

- **DHL Express API** -- international express shipments
- **DHL Parcel SE API** -- domestic Swedish parcels
- **DHL ServicePoint API** -- find pickup locations
- **DHL Tracking API** -- shipment status

Auth: API key + account number + site ID.

---

## Phase 4 -- Provider Service

```
class DhlFulfillmentService extends AbstractFulfillmentProvider
  static identifier = "dhl"
```

| Method                      | DHL behavior                                                              |
| --------------------------- | ------------------------------------------------------------------------- |
| `validateOptions` (static)  | Require `apiKey`, `accountNumber`, `siteId`                               |
| `getFulfillmentOptions`     | Return Express, Parcel, ServicePoint delivery options                     |
| `validateFulfillmentData`   | Validate against service-specific rules (weight, dimensions, destination) |
| `calculatePrice`            | DHL rate API (weight/volume-based with zone pricing)                      |
| `createFulfillment`         | Book shipment, get waybill number + tracking data                         |
| `createReturnFulfillment`   | Generate DHL return label                                                 |
| `cancelFulfillment`         | Cancel DHL shipment                                                       |
| `getFulfillmentDocuments`   | Retrieve PDF shipping label                                               |
| `getReturnDocuments`        | Retrieve PDF return label                                                 |

---

## Phase 5 -- ServicePoint Lookup

```
GET /store/fulfillment/dhl/service-points?postal_code=12345&country=SE&limit=10
```

Same standardized format as PostNord: name, address, opening hours, coordinates.

---

## Phase 6 -- Consumer Configuration

```typescript
module.exports = defineConfig({
  modules: [{
    resolve: "@medusajs/medusa/fulfillment",
    options: {
      providers: [{
        resolve: "@peyya/medusa-fulfillment-dhl/providers/dhl",
        id: "dhl",
        options: {
          apiKey: process.env.DHL_API_KEY,
          accountNumber: process.env.DHL_ACCOUNT_NUMBER,
          siteId: process.env.DHL_SITE_ID,
          environment: process.env.DHL_ENV || "sandbox",
        },
      }],
    },
  }],
})
```

---

## Phase 7 -- Tests and README

Test scenarios: domestic SE shipment, SE→Nordic, SE→EU, return label, ServicePoint lookup, weight/dimension validation.
