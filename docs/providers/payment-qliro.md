---
name: Payment - Qliro
overview: Build @peyya/medusa-payment-qliro — Swedish checkout platform with embedded checkout flow.
todos:
  - id: scaffold-plugin
    content: "Scaffold plugin package with @peyya scope, keywords, exports"
    status: pending
  - id: qliro-client
    content: "Implement Qliro API client (Qliro One API, API key + merchant ID auth)"
    status: pending
  - id: validate-options
    content: "Implement validateOptions — require API key, merchant ID"
    status: pending
  - id: initiate-payment
    content: "Implement initiatePayment — create Qliro checkout session, return checkout snippet/URL"
    status: pending
  - id: authorize-payment
    content: "Implement authorizePayment — verify Qliro order status"
    status: pending
  - id: webhook-handler
    content: "Implement getWebhookActionAndData — handle Qliro callbacks"
    status: pending
  - id: capture-refund-cancel
    content: "Implement capturePayment, refundPayment, cancelPayment via Qliro Order Management API"
    status: pending
  - id: remaining-methods
    content: "Implement getPaymentStatus, retrievePayment, updatePayment, deletePayment"
    status: pending
  - id: module-provider-export
    content: "Create index.ts with ModuleProvider export"
    status: pending
  - id: tests-readme
    content: "Write unit tests and README"
    status: pending
isProject: false
---

# Payment - Qliro

Swedish checkout platform. Embedded/redirect checkout flow with multi-currency support.

**Linear:** MOP-21 (Payments project, Qliro milestone)
**Architecture:** `docs/plugins/payments.md`
