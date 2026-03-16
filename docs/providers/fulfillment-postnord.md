---
name: Fulfillment - PostNord
overview: Build @peyya/medusa-fulfillment-postnord — Nordic postal leader with shipping, tracking, and pickup points.
todos:
  - id: scaffold-plugin
    content: "Scaffold plugin package with @peyya scope, fulfillment keywords, exports"
    status: pending
  - id: postnord-client
    content: "Implement PostNord API client (Transport Solutions API, Shipment API, Tracking API, ServicePoint API)"
    status: pending
  - id: validate-options
    content: "Implement validateOptions — require API key, customer number, sender address"
    status: pending
  - id: get-fulfillment-options
    content: "Implement getFulfillmentOptions — return available PostNord services (MyPack Home, Collect, Return, Pallet)"
    status: pending
  - id: validate-option
    content: "Implement validateFulfillmentData and validateOption"
    status: pending
  - id: calculate-price
    content: "Implement calculatePrice — call PostNord rate API based on weight, dimensions, service"
    status: pending
  - id: create-fulfillment
    content: "Implement createFulfillment — book shipment, get tracking number and booking reference"
    status: pending
  - id: create-return
    content: "Implement createReturnFulfillment — generate return labels"
    status: pending
  - id: cancel-fulfillment
    content: "Implement cancelFulfillment — cancel PostNord shipment"
    status: pending
  - id: get-documents
    content: "Implement getFulfillmentDocuments — retrieve shipping labels (PDF) from PostNord"
    status: pending
  - id: pickup-points
    content: "Add pickup point lookup API route (GET /store/fulfillment/postnord/service-points)"
    status: pending
  - id: tracking
    content: "Implement tracking integration via PostNord Tracking API"
    status: pending
  - id: module-provider-export
    content: "Create index.ts with ModuleProvider(Modules.FULFILLMENT, { services: [PostNordFulfillmentService] })"
    status: pending
  - id: tests-readme
    content: "Write unit tests and README"
    status: pending
isProject: false
---

# Fulfillment - PostNord

PostNord is the dominant postal/logistics provider in Sweden and the Nordics. Extends `AbstractFulfillmentProvider`.

**Linear:** Fulfillment project, PostNord milestone
**Architecture:** `docs/plugins/fulfillment.md`

## Key Technical Details

- **Services:** MyPack Home, MyPack Collect (pickup point), Return, Pallet
- **Auth:** API key
- **Labels:** PDF via Transport Solutions API
- **Tracking:** PostNord Tracking API
- **Pickup points:** ServicePoint API (search by postcode, coordinates)
