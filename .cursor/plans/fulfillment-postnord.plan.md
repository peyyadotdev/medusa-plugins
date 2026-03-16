---
name: Fulfillment PostNord
overview: Build @peyya/medusa-fulfillment-postnord -- Nordic postal leader with MyPack Home/Collect, labels, tracking, pickup points, and return labels.
todos:
  - id: postnord-scaffold
    content: "Phase 1: Scaffold packages/fulfillment-postnord/ -- package.json, tsconfig, directory structure"
    status: pending
  - id: postnord-types
    content: "Phase 2: Define PostNordOptions, shipment/tracking/service-point types"
    status: pending
  - id: postnord-client
    content: "Phase 3: Implement PostNord API client (Transport Solutions, Shipment, Tracking, ServicePoint APIs)"
    status: pending
  - id: postnord-validate
    content: "Phase 4.1: Implement validateOptions -- require API key, customer number, sender address"
    status: pending
  - id: postnord-options
    content: "Phase 4.2: Implement getFulfillmentOptions -- MyPack Home, Collect, Return, Pallet"
    status: pending
  - id: postnord-validate-data
    content: "Phase 4.3: Implement validateFulfillmentData and validateOption"
    status: pending
  - id: postnord-price
    content: "Phase 4.4: Implement calculatePrice via PostNord rate API"
    status: pending
  - id: postnord-create
    content: "Phase 4.5: Implement createFulfillment -- book shipment, get tracking number"
    status: pending
  - id: postnord-return
    content: "Phase 4.6: Implement createReturnFulfillment -- generate return labels"
    status: pending
  - id: postnord-cancel
    content: "Phase 4.7: Implement cancelFulfillment"
    status: pending
  - id: postnord-docs
    content: "Phase 4.8: Implement getFulfillmentDocuments and getReturnDocuments (PDF labels)"
    status: pending
  - id: postnord-pickup
    content: "Phase 5: Add pickup point lookup API route (GET /store/fulfillment/postnord/service-points)"
    status: pending
  - id: postnord-tracking
    content: "Phase 6: Implement tracking integration via PostNord Tracking API"
    status: pending
  - id: postnord-export
    content: "Phase 7: Create index.ts with ModuleProvider export"
    status: pending
  - id: postnord-tests
    content: "Phase 8: Write Vitest unit tests and README"
    status: pending
isProject: false
---

# Fulfillment PostNord

P1 priority. Dominant postal/logistics provider in Sweden and the Nordics. Handles everything from letters to pallets.

**Docs:** [docs/plugins/fulfillment.md](docs/plugins/fulfillment.md), [docs/providers/fulfillment-postnord.md](docs/providers/fulfillment-postnord.md)
**Package:** `@peyya/medusa-fulfillment-postnord` in `packages/fulfillment-postnord/`

---

## Phase 1 -- Scaffold

```
packages/fulfillment-postnord/
  src/providers/postnord/
    service.ts       # PostNordFulfillmentService extends AbstractFulfillmentProvider
    index.ts         # ModuleProvider(Modules.FULFILLMENT, { services: [...] })
    types.ts         # PostNordOptions, shipment/tracking types
    client.ts        # PostNord API client
  src/api/
    store/fulfillment/postnord/
      service-points/
        route.ts     # GET /store/fulfillment/postnord/service-points
  package.json
  tsconfig.json
  README.md
```

### package.json

```json
{
  "name": "@peyya/medusa-fulfillment-postnord",
  "version": "0.0.1",
  "description": "PostNord shipping provider for Medusa v2",
  "keywords": ["medusa-v2", "medusa-plugin-integration", "medusa-plugin-shipping"],
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
type PostNordOptions = {
  apiKey: string
  customerNumber: string       // PostNord customer/agreement number
  senderAddress: {
    name: string
    street: string
    postalCode: string
    city: string
    countryCode: string        // "SE"
  }
  environment: "test" | "production"
}

type PostNordService = "mypack_home" | "mypack_collect" | "parcel" | "pallet" | "return"
```

---

## Phase 3 -- PostNord API Client

- **Auth:** API key as query parameter (`apikey=xxx`)
- **APIs:**
  - **Transport Solutions API** -- generate shipping labels (PDF)
  - **Shipment API** -- book shipments, get booking references
  - **Tracking API** -- fetch tracking events
  - **ServicePoint API** -- find pickup points by postcode/coordinates
- **Endpoints:**
  - Production: `https://api2.postnord.com`
  - Test: `https://atapi2.postnord.com`

---

## Phase 4 -- Provider Service

```
class PostNordFulfillmentService extends AbstractFulfillmentProvider
  static identifier = "postnord"
```

### Method implementation map

| Method                      | PostNord behavior                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------- |
| `validateOptions` (static)  | Require `apiKey`, `customerNumber`, `senderAddress`                                 |
| `getFulfillmentOptions`     | Return available services: MyPack Home, MyPack Collect, Parcel, Pallet, Return      |
| `validateFulfillmentData`   | Validate recipient address, weight, dimensions against service rules                |
| `validateOption`            | Validate option data structure                                                      |
| `canCalculate`              | Return true (PostNord supports rate calculation)                                    |
| `calculatePrice`            | Call PostNord rate API with weight, dimensions, zone                                |
| `createFulfillment`         | Book shipment via Shipment API; return tracking number + booking ref                |
| `createReturnFulfillment`   | Generate return label via Transport Solutions API                                   |
| `cancelFulfillment`         | Cancel PostNord shipment booking                                                    |
| `getFulfillmentDocuments`   | Retrieve shipping label PDF from Transport Solutions API                            |
| `getReturnDocuments`        | Retrieve return label PDF                                                           |

### Service types

| Service ID       | Description             | Pickup point required | Weight limit |
| ---------------- | ----------------------- | --------------------- | ------------ |
| `mypack_home`    | Home delivery           | No                    | 20 kg        |
| `mypack_collect` | Pickup point delivery   | Yes                   | 20 kg        |
| `parcel`         | Standard parcel         | No                    | 30 kg        |
| `pallet`         | Pallet delivery         | No                    | 1000 kg      |
| `return`         | Return label            | No                    | 20 kg        |

---

## Phase 5 -- Pickup Point Lookup

Custom API route (not part of AbstractFulfillmentProvider):

```
GET /store/fulfillment/postnord/service-points?postal_code=12345&country=SE&limit=10
```

Response: standardized format with name, address, opening hours, coordinates, distance.

---

## Phase 6 -- Tracking

Fetch tracking events from PostNord Tracking API. Exposed via a pattern consistent with other fulfillment providers:

```
GET /store/orders/:id/tracking
```

Returns tracking URL, carrier name, events list (timestamp, status, location).

---

## Phase 7 -- Consumer Configuration

```typescript
module.exports = defineConfig({
  modules: [{
    resolve: "@medusajs/medusa/fulfillment",
    options: {
      providers: [{
        resolve: "@peyya/medusa-fulfillment-postnord/providers/postnord",
        id: "postnord",
        options: {
          apiKey: process.env.POSTNORD_API_KEY,
          customerNumber: process.env.POSTNORD_CUSTOMER_NUMBER,
          senderAddress: {
            name: "My Store AB",
            street: "Storgatan 1",
            postalCode: "11122",
            city: "Stockholm",
            countryCode: "SE",
          },
          environment: process.env.POSTNORD_ENV || "test",
        },
      }],
    },
  }],
})
```

---

## Phase 8 -- Tests and README

### Unit tests

- `getFulfillmentOptions` -- returns all service types
- `calculatePrice` -- correct rate lookup by weight/zone
- `createFulfillment` -- booking created, tracking number returned
- `getFulfillmentDocuments` -- PDF label retrieved
- `createReturnFulfillment` -- return label generated
- Service point lookup -- correct query params, parsed response
- `validateOptions` -- missing API key throws

### README

- Installation, config with all options
- Available services and their constraints
- Pickup point integration guide for storefronts
- Tracking integration
