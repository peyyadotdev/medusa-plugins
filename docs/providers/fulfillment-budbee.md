---
name: Fulfillment - Budbee
overview: Build @peyya/medusa-fulfillment-budbee — Last-mile delivery with locker and home delivery in Sweden.
todos:
  - id: scaffold-plugin
    content: "Scaffold plugin package with @peyya scope, fulfillment keywords, exports"
    status: pending
  - id: budbee-client
    content: "Implement Budbee API client (Order API, Box API for lockers)"
    status: pending
  - id: validate-options
    content: "Implement validateOptions — require API key, collection ID"
    status: pending
  - id: fulfillment-options
    content: "Implement getFulfillmentOptions — home delivery, locker (Budbee Box)"
    status: pending
  - id: validate-and-price
    content: "Implement validateFulfillmentData, validateOption, calculatePrice"
    status: pending
  - id: create-fulfillment
    content: "Implement createFulfillment — schedule Budbee delivery"
    status: pending
  - id: cancel-documents
    content: "Implement cancelFulfillment and getFulfillmentDocuments"
    status: pending
  - id: locker-lookup
    content: "Add Budbee Box locker lookup API route"
    status: pending
  - id: module-provider-export
    content: "Create index.ts with ModuleProvider export"
    status: pending
  - id: tests-readme
    content: "Write unit tests and README"
    status: pending
isProject: false
---

# Fulfillment - Budbee

Swedish last-mile delivery startup (now part of Instabee). Home delivery + Budbee Box lockers. Extends `AbstractFulfillmentProvider`.

**Linear:** Fulfillment project, Budbee milestone
**Architecture:** `docs/plugins/fulfillment.md`
