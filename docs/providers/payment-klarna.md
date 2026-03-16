---
name: Payment - Klarna
overview: Build @peyya/medusa-payment-klarna — Nordic checkout leader with redirect/widget flow and multi-currency support.
todos:
  - id: scaffold-plugin
    content: "Scaffold plugin package (package.json with @peyya scope, keywords, exports, klarna SDK dependency)"
    status: pending
  - id: types-and-options
    content: "Define KlarnaOptions type (username, password, region, environment) and Klarna API constants"
    status: pending
  - id: klarna-client
    content: "Implement Klarna API client (Checkout API v3, basic auth, region-specific endpoints)"
    status: pending
  - id: validate-options
    content: "Implement static validateOptions — require API credentials and region"
    status: pending
  - id: currency-utils
    content: "Implement currency conversion utils (Medusa amount ↔ Klarna minor units, handle zero-decimal currencies)"
    status: pending
  - id: initiate-payment
    content: "Implement initiatePayment — create Klarna session, return checkout URL/snippet in data for storefront"
    status: pending
  - id: authorize-payment
    content: "Implement authorizePayment — verify Klarna order status after customer completes checkout"
    status: pending
  - id: webhook-handler
    content: "Implement getWebhookActionAndData — handle Klarna push notifications, verify signature, map to Medusa actions"
    status: pending
  - id: capture-payment
    content: "Implement capturePayment — call Klarna capture API with amount in minor units"
    status: pending
  - id: refund-payment
    content: "Implement refundPayment — call Klarna refund API, handle partial refunds"
    status: pending
  - id: cancel-delete
    content: "Implement cancelPayment and deletePayment — cancel/release Klarna order"
    status: pending
  - id: status-retrieve-update
    content: "Implement getPaymentStatus, retrievePayment, updatePayment"
    status: pending
  - id: account-holder
    content: "Implement account holder methods (createAccountHolder, savePaymentMethod, listPaymentMethods) for Klarna saved cards"
    status: pending
  - id: module-provider-export
    content: "Create index.ts with ModuleProvider export"
    status: pending
  - id: tests
    content: "Write unit tests with mocked Klarna API"
    status: pending
  - id: readme
    content: "Write README with installation, configuration, multi-currency setup, and storefront integration guide"
    status: pending
isProject: false
---

# Payment - Klarna

Klarna is the dominant checkout provider in the Nordics. Supports redirect-based checkout flow and embedded widget. Multi-currency (SEK, NOK, DKK, EUR).

**Linear:** MOP-19 (Payments project, Klarna milestone)
**Architecture:** `docs/plugins/payments.md`

## Key Technical Details

- **Flow:** Redirect to Klarna checkout page, or embedded Klarna widget
- **Auth:** API credentials (username/password), basic auth
- **Currencies:** SEK, NOK, DKK, EUR
- **Amount format:** Minor units (100.00 SEK = 10000)
- **Webhook:** Klarna push notifications for order events
- **Medusa webhook route:** `/hooks/payment/klarna_klarna`
