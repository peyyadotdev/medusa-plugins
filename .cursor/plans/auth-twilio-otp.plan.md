---
name: Auth Twilio OTP
overview: Build @peyya/medusa-auth-twilio-otp -- SMS one-time password authentication via Twilio Verify for Swedish mobile numbers.
todos:
  - id: twilio-scaffold
    content: "Phase 1: Scaffold packages/auth-twilio-otp/ -- package.json with twilio dependency, tsconfig, directory"
    status: pending
  - id: twilio-types
    content: "Phase 2: Define TwilioOtpOptions (accountSid, authToken, serviceSid, codeLength, channel)"
    status: pending
  - id: twilio-client
    content: "Phase 3: Set up Twilio Verify client in constructor"
    status: pending
  - id: twilio-validate
    content: "Phase 4.1: Implement static validateOptions -- require accountSid, authToken, serviceSid"
    status: pending
  - id: twilio-authenticate
    content: "Phase 4.2: Implement authenticate -- two-step: send OTP then verify OTP"
    status: pending
  - id: twilio-register
    content: "Phase 4.3: Implement register -- same two-step flow, create AuthIdentity on verify"
    status: pending
  - id: twilio-callback
    content: "Phase 4.4: Implement validateCallback -- verify OTP code step"
    status: pending
  - id: twilio-update
    content: "Phase 4.5: Implement update -- change phone number"
    status: pending
  - id: twilio-export
    content: "Phase 5: Create index.ts with ModuleProvider export"
    status: pending
  - id: twilio-tests
    content: "Phase 6: Write Vitest unit tests with mocked Twilio Verify"
    status: pending
  - id: twilio-readme
    content: "Phase 7: Write README with config, Twilio setup guide, +46 examples"
    status: pending
isProject: false
---

# Auth Twilio OTP

P2 priority. SMS-based one-time password verification via Twilio Verify. Standard Swedish pattern for phone verification, account creation, and 2FA.

**Docs:** [docs/plugins/auth.md](docs/plugins/auth.md)
**Package:** `@peyya/medusa-auth-twilio-otp` in `packages/auth-twilio-otp/`

---

## Phase 1 -- Scaffold

```
packages/auth-twilio-otp/
  src/providers/twilio-otp/
    service.ts       # TwilioOtpProviderService extends AbstractAuthModuleProvider
    index.ts         # ModuleProvider export
    types.ts         # TwilioOtpOptions
  package.json
  tsconfig.json
  README.md
```

### package.json key dependencies

```json
{
  "dependencies": {
    "twilio": "<latest>"
  }
}
```

---

## Phase 2 -- Types

```typescript
type TwilioOtpOptions = {
  accountSid: string
  authToken: string
  serviceSid: string         // Twilio Verify Service SID
  codeLength?: number        // Default 6
  channel?: "sms" | "whatsapp" | "call"  // Default "sms"
  locale?: string            // Default "sv" for Swedish SMS
}
```

---

## Phase 3 -- Twilio Verify Client

In the constructor, initialize the Twilio client:

```typescript
import Twilio from "twilio"

constructor(container, options) {
  super(container, options)
  this.client = Twilio(options.accountSid, options.authToken)
  this.serviceSid = options.serviceSid
}
```

---

## Phase 4 -- Provider Service

```
class TwilioOtpProviderService extends AbstractAuthModuleProvider
  static identifier = "twilio-otp"
```

### Two-step OTP flow

1. `authenticate({ step: "send", phone: "+46701234567" })` → send OTP via Twilio Verify → return `{ success: false, data: { message: "OTP sent" } }`
2. `authenticate({ step: "verify", phone: "+46701234567", code: "123456" })` → verify via Twilio → return AuthIdentity

### Method map

| Method             | Twilio OTP behavior                                                            |
| ------------------ | ------------------------------------------------------------------------------ |
| `validateOptions`  | Require `accountSid`, `authToken`, `serviceSid`                                |
| `authenticate`     | Step 1: send OTP to phone; Step 2: verify code, return AuthIdentity            |
| `register`         | Step 1: send OTP; Step 2: verify code, create AuthIdentity with entity_id=phone |
| `validateCallback` | Delegate to verify step                                                         |
| `update`           | Change phone number (send OTP to new number, verify, update identity)           |

### Twilio Verify API calls

```typescript
// Send OTP
await this.client.verify.v2
  .services(this.serviceSid)
  .verifications.create({
    to: phone,
    channel: this.options.channel || "sms",
    locale: this.options.locale || "sv",
  })

// Verify OTP
const check = await this.client.verify.v2
  .services(this.serviceSid)
  .verificationChecks.create({
    to: phone,
    code: code,
  })
// check.status === "approved"
```

---

## OTP Flow Diagram

```mermaid
sequenceDiagram
    participant Customer
    participant Medusa
    participant Provider as TwilioOtpProvider
    participant Twilio as Twilio Verify

    Customer->>Medusa: POST /auth/customer/twilio-otp {step: "send", phone: "+46701234567"}
    Medusa->>Provider: authenticate({step: "send", phone})
    Provider->>Twilio: verifications.create({to: phone, channel: "sms"})
    Twilio-->>Provider: verification sent
    Provider-->>Medusa: {success: false, data: {message: "OTP sent"}}
    Medusa-->>Customer: "Enter code"

    Twilio-->>Customer: SMS with code "123456"

    Customer->>Medusa: POST /auth/customer/twilio-otp {step: "verify", phone, code: "123456"}
    Medusa->>Provider: authenticate({step: "verify", phone, code})
    Provider->>Twilio: verificationChecks.create({to: phone, code})
    Twilio-->>Provider: status: "approved"
    Provider->>Provider: Find/create AuthIdentity (entity_id = phone)
    Provider-->>Medusa: {success: true, authIdentity}
    Medusa-->>Customer: JWT token
```

---

## Phase 5 -- Consumer Configuration

```typescript
module.exports = defineConfig({
  modules: [{
    resolve: "@medusajs/medusa/auth",
    options: {
      providers: [{
        resolve: "@peyya/medusa-auth-twilio-otp/providers/twilio-otp",
        id: "twilio-otp",
        options: {
          accountSid: process.env.TWILIO_ACCOUNT_SID,
          authToken: process.env.TWILIO_AUTH_TOKEN,
          serviceSid: process.env.TWILIO_VERIFY_SERVICE_SID,
          channel: "sms",
          locale: "sv",
        },
      }],
    },
  }],
})
```

---

## Phase 6 -- Tests and README

### Unit tests

- Send OTP -- Twilio verification created
- Verify OTP -- approved code returns AuthIdentity, wrong code fails
- Rate limiting -- too many attempts handled gracefully
- `validateOptions` -- missing SIDs throws
- Phone format validation

### README

- Twilio account setup (Verify service creation)
- Configuration with env vars
- Swedish phone number format (+46)
- Cost considerations (Twilio pricing per SMS)
- WhatsApp channel alternative

---

## Key Decisions

- **Twilio Verify** -- not raw SMS API; Verify handles rate limiting, code generation, and expiry
- **Phone as entity_id** -- AuthIdentity `entity_id` is the phone number (E.164 format)
- **Two-step flow** -- same pattern as WebAuthn; `step` parameter in data body
- **Swedish locale** -- default locale "sv" for Swedish SMS content
