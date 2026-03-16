---
name: Payment - Trustly
overview: Build @peyya/medusa-payment-trustly — Bank-to-bank transfers with RSA signature auth.
todos:
  - id: scaffold-plugin
    content: "Scaffold plugin package with @peyya scope, keywords, exports"
    status: pending
  - id: trustly-client
    content: "Implement Trustly API client (JSON-RPC API, RSA signature signing/verification)"
    status: pending
  - id: validate-options
    content: "Implement validateOptions — require RSA keys and merchant credentials"
    status: pending
  - id: initiate-payment
    content: "Implement initiatePayment — create Trustly deposit, return redirect URL"
    status: pending
  - id: authorize-payment
    content: "Implement authorizePayment — verify deposit status after bank redirect"
    status: pending
  - id: webhook-handler
    content: "Implement getWebhookActionAndData — handle Trustly notifications with RSA signature verification"
    status: pending
  - id: capture-refund-cancel
    content: "Implement capturePayment, refundPayment, cancelPayment"
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

# Payment - Trustly

Bank-to-bank transfers via Trustly. Customer is redirected to their bank login. RSA signature-based authentication.

**Linear:** MOP-20 (Payments project, Trustly milestone)
**Architecture:** `docs/plugins/payments.md`
