# Auth — Category Plan

Modern authentication providers for Medusa v2. Each provider is an independent npm package implementing the Auth Module Provider interface.

## Providers

| Provider | Package | Status | Priority |
|----------|---------|--------|----------|
| **Better Auth** | `@peyya/medusa-auth-better-auth` | Planned | P1 — Modern auth framework |
| **WebAuthn** | `@peyya/medusa-auth-webauthn` | Planned | P1 — Passkeys / BankID-ready |
| **Twilio OTP** | `@peyya/medusa-auth-twilio-otp` | Planned | P2 — SMS verification |

## Architecture Pattern

Auth providers plug into Medusa's Auth Module:

```
packages/auth-{name}/
├── src/
│   └── providers/
│       └── {name}/
│           ├── service.ts          # extends AbstractAuthModuleProvider
│           ├── index.ts            # ModuleProvider(Modules.AUTH, { services: [...] })
│           └── types.ts            # Provider-specific options
├── package.json
├── tsconfig.json
└── README.md
```

### Provider Service Structure

```typescript
import { AbstractAuthModuleProvider } from "@medusajs/framework/utils"
import { AuthenticationInput, AuthenticationResponse } from "@medusajs/framework/types"

class WebAuthnProviderService extends AbstractAuthModuleProvider {
  static identifier = "webauthn"

  // Authenticate a user (login)
  async authenticate(
    data: AuthenticationInput,
    authIdentityProviderService: any
  ): Promise<AuthenticationResponse> { /* ... */ }

  // Register a new user (signup)
  async register(
    data: AuthenticationInput,
    authIdentityProviderService: any
  ): Promise<AuthenticationResponse> { /* ... */ }

  // Update auth identity (e.g., change password, add passkey)
  async update(
    data: Record<string, unknown>,
    authIdentityProviderService: any
  ): Promise<{ success: boolean; authIdentity?: any }> { /* ... */ }

  // Handle callback from external auth provider (OAuth, WebAuthn)
  async validateCallback(
    data: AuthenticationInput,
    authIdentityProviderService: any
  ): Promise<AuthenticationResponse> { /* ... */ }
}
```

### Consumer Configuration

```typescript
module.exports = defineConfig({
  plugins: [
    { resolve: "@peyya/medusa-auth-webauthn", options: {} },
  ],
  modules: [
    {
      resolve: "@medusajs/medusa/auth",
      options: {
        providers: [
          {
            resolve: "@peyya/medusa-auth-webauthn/providers/webauthn",
            id: "webauthn",
            options: {
              rpName: "My Store",
              rpId: "mystore.se",
              origin: "https://mystore.se",
            },
          },
        ],
      },
    },
  ],
})
```

## Provider-Specific Considerations

### Better Auth

- **What it is:** A comprehensive auth framework (better-auth.com) that handles session management, OAuth, multi-factor, email/password, and more
- **Why:** Gives Medusa stores modern auth features out of the box — magic links, social login, device sessions
- **Integration approach:** Better Auth as the auth backend, Medusa Auth Module Provider as the bridge
- **Features:** Email/password, OAuth (Google, GitHub, Apple), magic links, session management, rate limiting
- **Key challenge:** Mapping Better Auth's session model to Medusa's auth identity system
- **Detailed plan:** [docs/providers/better-auth.md](../providers/better-auth.md)

### WebAuthn (Passkeys)

- **What it is:** FIDO2/WebAuthn standard for passwordless auth using biometrics, security keys, or platform authenticators
- **Why:** BankID will support FIDO2, making this the path to BankID integration. Also enables Apple/Google passkeys
- **Integration approach:** WebAuthn registration/authentication ceremonies via `@simplewebauthn/server`
- **Features:** Passkey registration, authentication, multiple passkeys per user, cross-device
- **Swedish relevance:** BankID is moving toward FIDO2/WebAuthn standard
- **Key challenge:** Challenge/response flow spans multiple HTTP requests, credential storage
- **Detailed plan:** [docs/providers/webauthn.md](../providers/webauthn.md)

### Twilio OTP

- **What it is:** SMS-based one-time password verification via Twilio Verify
- **Why:** Standard Swedish pattern — verify phone number for account creation, order confirmation, or 2FA
- **Integration approach:** Twilio Verify API for sending and checking OTP codes
- **Features:** SMS OTP, optional WhatsApp OTP, rate limiting, code expiry
- **Swedish relevance:** Swedish mobile numbers (+46), localized SMS
- **Key challenge:** Two-step flow (send code → verify code), rate limiting, cost management
- **Detailed plan:** [docs/providers/twilio-otp.md](../providers/twilio-otp.md)

## Auth Flow Integration

### Medusa Auth Flow

```
1. Customer → POST /auth/customer/{provider}
   (e.g., POST /auth/customer/webauthn with registration/authentication data)

2. Auth Module → calls provider's authenticate() or register()

3. Provider → interacts with third-party service (Twilio, WebAuthn ceremony, Better Auth)

4. Provider returns → { success: true, authIdentity: { ... } }

5. Medusa → creates/updates AuthIdentity, returns JWT token

6. Customer → uses token for subsequent authenticated requests
```

### Multi-Provider Support

Medusa supports multiple auth providers simultaneously. A customer can:
- Register with email/password (Better Auth)
- Add a passkey (WebAuthn)
- Enable SMS 2FA (Twilio OTP)

Each provider creates an `AuthIdentity` linked to the customer.

## Testing Strategy

- Unit tests with mocked external services
- Integration tests against sandbox APIs (Twilio test credentials, WebAuthn test mode)
- Test scenarios: registration, login, MFA flow, session management, token refresh
