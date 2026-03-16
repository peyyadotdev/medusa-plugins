---
name: Fulfillment - Instabox
overview: Build @peyya/medusa-fulfillment-instabox — Locker-based delivery with same/next-day options for Sweden.
todos:
  - id: scaffold-plugin
    content: "Scaffold plugin package with @peyya scope, fulfillment keywords, exports"
    status: pending
  - id: instabox-client
    content: "Implement Instabox API client (Shipment API, Locker API)"
    status: pending
  - id: validate-options
    content: "Implement validateOptions — require API credentials"
    status: pending
  - id: fulfillment-options
    content: "Implement getFulfillmentOptions — locker delivery, express locker"
    status: pending
  - id: validate-and-price
    content: "Implement validateFulfillmentData, validateOption, calculatePrice"
    status: pending
  - id: create-fulfillment
    content: "Implement createFulfillment — create Instabox shipment, get locker code"
    status: pending
  - id: cancel-documents
    content: "Implement cancelFulfillment and getFulfillmentDocuments"
    status: pending
  - id: locker-lookup
    content: "Add locker location lookup API route"
    status: pending
  - id: module-provider-export
    content: "Create index.ts with ModuleProvider export"
    status: pending
  - id: tests-readme
    content: "Write unit tests and README"
    status: pending
isProject: false
---

# Fulfillment - Instabox

Locker-based delivery with same/next-day options. Extends `AbstractFulfillmentProvider`.

**Linear:** Fulfillment project, Instabox milestone
**Architecture:** `docs/plugins/fulfillment.md`
