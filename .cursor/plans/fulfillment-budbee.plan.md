---
name: Fulfillment Budbee
overview: Build @peyya/medusa-fulfillment-budbee -- last-mile delivery with time-window home delivery and Budbee Box locker pickup for Swedish cities.
todos:
  - id: budbee-scaffold
    content: "Phase 1: Scaffold packages/fulfillment-budbee/ -- package.json, tsconfig, directory structure"
    status: pending
  - id: budbee-types
    content: "Phase 2: Define BudbeeOptions, order/box types, delivery time-window types"
    status: pending
  - id: budbee-client
    content: "Phase 3: Implement Budbee API client (Order API, Box API)"
    status: pending
  - id: budbee-validate
    content: "Phase 4.1: Implement validateOptions -- require API key, collection ID"
    status: pending
  - id: budbee-options
    content: "Phase 4.2: Implement getFulfillmentOptions -- home delivery, Budbee Box locker"
    status: pending
  - id: budbee-validate-data
    content: "Phase 4.3: Implement validateFulfillmentData -- validate coverage area, weight"
    status: pending
  - id: budbee-price
    content: "Phase 4.4: Implement calculatePrice"
    status: pending
  - id: budbee-create
    content: "Phase 4.5: Implement createFulfillment -- schedule delivery with time window"
    status: pending
  - id: budbee-cancel-docs
    content: "Phase 4.6: Implement cancelFulfillment, getFulfillmentDocuments"
    status: pending
  - id: budbee-locker
    content: "Phase 5: Add Budbee Box locker lookup API route"
    status: pending
  - id: budbee-export
    content: "Phase 6: Create index.ts with ModuleProvider export"
    status: pending
  - id: budbee-tests
    content: "Phase 7: Write Vitest unit tests and README"
    status: pending
isProject: false
---

# Fulfillment Budbee

P2 priority. Swedish last-mile delivery (now part of Instabee group). Home delivery with time windows + Budbee Box lockers. Coverage: Stockholm, Gothenburg, Malmö + expanding.

**Docs:** [docs/plugins/fulfillment.md](docs/plugins/fulfillment.md), [docs/providers/fulfillment-budbee.md](docs/providers/fulfillment-budbee.md)
**Package:** `@peyya/medusa-fulfillment-budbee` in `packages/fulfillment-budbee/`

---

## Phase 1 -- Scaffold

```
packages/fulfillment-budbee/
  src/providers/budbee/
    service.ts       # BudbeeFulfillmentService extends AbstractFulfillmentProvider
    index.ts         # ModuleProvider export
    types.ts         # BudbeeOptions, order/box types
    client.ts        # Budbee Integration API client
  src/api/
    store/fulfillment/budbee/
      boxes/
        route.ts     # GET /store/fulfillment/budbee/boxes
  package.json
  tsconfig.json
  README.md
```

---

## Phase 2 -- Types

```typescript
type BudbeeOptions = {
  apiKey: string
  collectionId: string       // Budbee collection/pickup point for the merchant
  environment: "test" | "production"
}

type BudbeeService = "home_delivery" | "box_delivery"

type BudbeeTimeWindow = {
  start: string              // ISO 8601
  end: string
  available: boolean
}
```

---

## Phase 3 -- Budbee API Client

- **Auth:** API key in header
- **APIs:**
  - **Order API** -- create/cancel delivery orders
  - **Box API** -- find available Budbee Box lockers
- **Key feature:** Time-window delivery -- customer selects a 1-2 hour delivery window

---

## Phase 4 -- Provider Service

```
class BudbeeFulfillmentService extends AbstractFulfillmentProvider
  static identifier = "budbee"
```

| Method                      | Budbee behavior                                                   |
| --------------------------- | ----------------------------------------------------------------- |
| `validateOptions` (static)  | Require `apiKey`, `collectionId`                                  |
| `getFulfillmentOptions`     | Return home delivery + Budbee Box options                         |
| `validateFulfillmentData`   | Validate coverage area (postal code check), weight limits         |
| `calculatePrice`            | Return price based on service type and delivery window            |
| `createFulfillment`         | Schedule delivery via Order API; include selected time window     |
| `cancelFulfillment`         | Cancel delivery order                                             |
| `getFulfillmentDocuments`   | Retrieve shipping label if applicable                             |

### Coverage validation

Budbee only operates in certain postal code areas. `validateFulfillmentData` must check the recipient's postal code against Budbee's coverage API before allowing the option.

---

## Phase 5 -- Budbee Box Lookup

```
GET /store/fulfillment/budbee/boxes?postal_code=12345&limit=10
```

Returns available Budbee Box lockers near the given postal code. Standardized response format.

---

## Phase 6 -- Consumer Configuration

```typescript
module.exports = defineConfig({
  modules: [{
    resolve: "@medusajs/medusa/fulfillment",
    options: {
      providers: [{
        resolve: "@peyya/medusa-fulfillment-budbee/providers/budbee",
        id: "budbee",
        options: {
          apiKey: process.env.BUDBEE_API_KEY,
          collectionId: process.env.BUDBEE_COLLECTION_ID,
          environment: process.env.BUDBEE_ENV || "test",
        },
      }],
    },
  }],
})
```

---

## Phase 7 -- Tests and README

- Coverage validation tests (valid/invalid postal codes)
- Time-window delivery scheduling
- Box lookup with mock responses
- README with coverage areas, config, storefront time-window UI guidance
