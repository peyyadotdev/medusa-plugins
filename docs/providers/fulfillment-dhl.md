---
name: Fulfillment - DHL
overview: Build @peyya/medusa-fulfillment-dhl — DHL Express and Freight for Swedish e-commerce.
todos:
  - id: scaffold-plugin
    content: "Scaffold plugin package with @peyya scope, fulfillment keywords, exports"
    status: pending
  - id: dhl-client
    content: "Implement DHL API client (Express API, ServicePoint API, Tracking API)"
    status: pending
  - id: validate-options
    content: "Implement validateOptions — require API key, account number, site ID"
    status: pending
  - id: fulfillment-options
    content: "Implement getFulfillmentOptions — DHL Express, DHL Parcel, ServicePoint delivery"
    status: pending
  - id: validate-and-price
    content: "Implement validateFulfillmentData, validateOption, calculatePrice"
    status: pending
  - id: create-fulfillment
    content: "Implement createFulfillment — book DHL shipment, get waybill number"
    status: pending
  - id: create-return
    content: "Implement createReturnFulfillment — generate DHL return labels"
    status: pending
  - id: cancel-documents
    content: "Implement cancelFulfillment and getFulfillmentDocuments (PDF labels)"
    status: pending
  - id: tracking-pickup
    content: "Implement tracking integration and ServicePoint lookup API route"
    status: pending
  - id: module-provider-export
    content: "Create index.ts with ModuleProvider export"
    status: pending
  - id: tests-readme
    content: "Write unit tests and README"
    status: pending
isProject: false
---

# Fulfillment - DHL

DHL Express and DHL Freight for Sweden. Extends `AbstractFulfillmentProvider`.

**Linear:** Fulfillment project, DHL milestone
**Architecture:** `docs/plugins/fulfillment.md`
