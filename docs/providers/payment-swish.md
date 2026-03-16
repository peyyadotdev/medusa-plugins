---
name: Payment - Swish
overview: Build @peyya/medusa-payment-swish — Sweden's most popular mobile payment provider for Medusa v2.
todos:
  - id: scaffold-plugin
    content: "Scaffold plugin package (npx create-medusa-app payment-swish --plugin, package.json with @peyya scope, keywords, exports)"
    status: pending
  - id: types-and-options
    content: "Define SwishOptions type (certificate paths, callback URL, environment) and provider constants"
    status: pending
  - id: swish-client
    content: "Implement Swish API client with certificate-based TLS auth (P12/PEM), test and production endpoints"
    status: pending
  - id: validate-options
    content: "Implement static validateOptions — require certificate config and callback URL"
    status: pending
  - id: initiate-payment
    content: "Implement initiatePayment — create Swish payment request, store session_id in metadata, return payment request token"
    status: pending
  - id: authorize-payment
    content: "Implement authorizePayment — return pending status (Swish is async, authorization comes via webhook)"
    status: pending
  - id: webhook-handler
    content: "Implement getWebhookActionAndData — verify callback signature, map Swish status (PAID/DECLINED/ERROR) to Medusa actions, extract session_id"
    status: pending
  - id: capture-payment
    content: "Implement capturePayment — Swish captures immediately on authorization, return existing data"
    status: pending
  - id: refund-payment
    content: "Implement refundPayment — call Swish refund API, handle partial refunds"
    status: pending
  - id: cancel-delete
    content: "Implement cancelPayment and deletePayment — cancel pending Swish payment request"
    status: pending
  - id: status-retrieve-update
    content: "Implement getPaymentStatus, retrievePayment, and updatePayment"
    status: pending
  - id: module-provider-export
    content: "Create index.ts with ModuleProvider(Modules.PAYMENT, { services: [SwishProviderService] })"
    status: pending
  - id: tests
    content: "Write unit tests for all provider methods with mocked Swish API responses"
    status: pending
  - id: readme
    content: "Write README with installation, configuration (certificates, environment), and webhook setup instructions"
    status: pending
  - id: build-verify
    content: "Verify plugin builds with npx medusa plugin:build and test locally in a Medusa app"
    status: pending
isProject: false
---

# Payment - Swish

Swish is Sweden's most popular mobile payment method. The payment flow is asynchronous — the customer confirms payment in the Swish app, and the result comes back via a webhook callback.

**Linear:** MOP-18 (Payments project, Swish milestone)
**Architecture:** `docs/plugins/payments.md`
**Provider detail:** `docs/providers/swish.md` (to be created)

## Key Technical Details

- **Currency:** SEK only
- **Flow:** Async — initiatePayment creates request, customer pays in app, webhook confirms
- **Auth:** Client certificates (P12/PEM), not API keys
- **Amount format:** SEK with no minor units in Swish API (100.00 SEK = "100")
- **Webhook:** Swish POSTs callback to configured URL on status change
- **Medusa webhook route:** `/hooks/payment/swish_swish`
