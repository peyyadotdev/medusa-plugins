---
name: Auth Better Auth
overview: Build @peyya/medusa-auth-better-auth -- modern auth framework bridging Better Auth's social login, magic links, and session management into Medusa's auth identity system.
todos:
  - id: betterauth-scaffold
    content: "Phase 1: Scaffold packages/auth-better-auth/ -- package.json with better-auth dependency, tsconfig, directory structure"
    status: pending
  - id: betterauth-types
    content: "Phase 2: Define BetterAuthOptions (secret, baseURL, socialProviders, magicLink, session)"
    status: pending
  - id: betterauth-client
    content: "Phase 3: Set up Better Auth library integration -- auth instance in constructor, social provider config"
    status: pending
  - id: betterauth-validate
    content: "Phase 4.1: Implement static validateOptions -- require secret, baseURL, validate social provider configs"
    status: pending
  - id: betterauth-authenticate
    content: "Phase 4.2: Implement authenticate -- email/password, social OAuth redirect, magic link initiation"
    status: pending
  - id: betterauth-register
    content: "Phase 4.3: Implement register -- create account via Better Auth, map to Medusa AuthIdentity"
    status: pending
  - id: betterauth-callback
    content: "Phase 4.4: Implement validateCallback -- OAuth code exchange, magic link token verification"
    status: pending
  - id: betterauth-update
    content: "Phase 4.5: Implement update -- password change, social provider link/unlink"
    status: pending
  - id: betterauth-export
    content: "Phase 5: Create index.ts with ModuleProvider(Modules.AUTH, { services: [BetterAuthProviderService] })"
    status: pending
  - id: betterauth-tests
    content: "Phase 6: Write Vitest unit tests for all four auth methods + validateOptions"
    status: pending
  - id: betterauth-readme
    content: "Phase 7: Write README with install, config, flow docs, and storefront integration"
    status: pending
isProject: false
---

# Auth Better Auth

P1 priority. Modern auth framework providing social login, magic links, email/password, and advanced session management. Bridges Better Auth's capabilities into Medusa's auth identity system.

**Docs:** [docs/plugins/auth.md](docs/plugins/auth.md), [docs/providers/auth-better-auth.md](docs/providers/auth-better-auth.md)
**Package:** `@peyya/medusa-auth-better-auth` in `packages/auth-better-auth/`

---

## Phase 1 -- Scaffold

```
packages/auth-better-auth/
  src/providers/better-auth/
    service.ts       # BetterAuthProviderService extends AbstractAuthModuleProvider
    index.ts         # ModuleProvider(Modules.AUTH, { services: [...] })
    types.ts         # BetterAuthOptions, social provider types
  package.json
  tsconfig.json
  README.md
```

### package.json

```json
{
  "name": "@peyya/medusa-auth-better-auth",
  "version": "0.0.1",
  "description": "Better Auth provider for Medusa v2 -- social login, magic links, session management",
  "keywords": ["medusa-v2", "medusa-plugin-integration", "medusa-plugin-auth"],
  "exports": {
    ".": "./dist/index.js",
    "./providers/*": "./dist/providers/*/index.js"
  },
  "devDependencies": {
    "@medusajs/framework": "^2.5.0",
    "@medusajs/medusa": "^2.5.0",
    "@medusajs/cli": "^2.5.0",
    "@swc/core": "^1.5.7"
  },
  "peerDependencies": {
    "@medusajs/framework": "^2.5.0",
    "@medusajs/medusa": "^2.5.0"
  },
  "dependencies": {
    "better-auth": "<latest>"
  }
}
```

---

## Phase 2 -- Types

```typescript
type BetterAuthOptions = {
  secret: string                  // Better Auth signing secret
  baseURL: string                 // Storefront URL for OAuth callbacks
  socialProviders?: {
    google?: { clientId: string; clientSecret: string }
    github?: { clientId: string; clientSecret: string }
    apple?: { clientId: string; clientSecret: string; teamId: string; keyId: string }
  }
  emailAndPassword?: boolean      // Default: true
  magicLink?: {
    enabled: boolean
    emailTransport: { /* SMTP config */ }
  }
  session?: {
    maxAge: number                // Seconds
    refreshWindow: number         // Seconds before expiry to auto-refresh
  }
}
```

---

## Phase 3 -- Better Auth Integration

In the constructor, create a Better Auth server instance configured from options. This is the core auth engine.

**Architecture decision:** Better Auth handles the auth ceremony (password hashing, OAuth flow, magic link verification, session token generation). Medusa's `AuthIdentity` remains the source of truth for user identity. Better Auth runs in "stateless" mode -- no own user database.

---

## Phase 4 -- Provider Service

```
class BetterAuthProviderService extends AbstractAuthModuleProvider
  static identifier = "better-auth"
```

### 4.1 validateOptions

- `secret` present and not empty
- `baseURL` is a valid URL
- Each social provider has both `clientId` and `clientSecret`
- If `magicLink.enabled`, email transport config present

### 4.2 authenticate

Three flows based on `data.body`:

1. **Email/password** -- `{ email, password }` → verify via Better Auth → look up AuthIdentity by `entity_id: email` → return success
2. **Social OAuth** -- `{ provider: "google" }` → return `{ success: false, location: oauthURL }` to trigger redirect
3. **Magic link** -- `{ email, type: "magic_link" }` → trigger Better Auth to send email → return pending

### 4.3 register

1. **Email/password** -- hash password via Better Auth → `authIdentityProviderService.create()` with `entity_id: email`, store hash in provider metadata
2. **Social** -- delegate to authenticate (OAuth register = login for first-time users)

### 4.4 validateCallback

1. **OAuth callback** -- `{ code, state, provider }` → exchange code via Better Auth → extract user profile → find-or-create AuthIdentity
2. **Magic link** -- `{ token }` → verify token → find-or-create AuthIdentity

### 4.5 update

- Password change (verify old, hash new)
- Link/unlink social providers
- Update session preferences

---

## Auth Flow Diagram

```mermaid
sequenceDiagram
    participant Customer
    participant Medusa
    participant Provider as BetterAuthProvider
    participant BetterAuth as Better Auth Library
    participant OAuth as OAuth Provider

    Note over Customer,OAuth: Email/Password Flow
    Customer->>Medusa: POST /auth/customer/better-auth {email, password}
    Medusa->>Provider: authenticate(data, identityService)
    Provider->>BetterAuth: verifyPassword(email, password)
    BetterAuth-->>Provider: verified user
    Provider->>Provider: lookup/create AuthIdentity
    Provider-->>Medusa: {success: true, authIdentity}
    Medusa-->>Customer: JWT token

    Note over Customer,OAuth: Social OAuth Flow
    Customer->>Medusa: POST /auth/customer/better-auth {provider: "google"}
    Medusa->>Provider: authenticate(data, identityService)
    Provider->>BetterAuth: getOAuthURL("google")
    Provider-->>Medusa: {success: false, location: oauthURL}
    Medusa-->>Customer: 302 redirect
    Customer->>OAuth: authorize
    OAuth-->>Customer: redirect with code
    Customer->>Medusa: GET /auth/callback/better-auth?code=xxx
    Medusa->>Provider: validateCallback(data, identityService)
    Provider->>BetterAuth: exchangeCode(code)
    BetterAuth->>OAuth: token exchange
    OAuth-->>BetterAuth: user profile
    Provider->>Provider: find-or-create AuthIdentity
    Provider-->>Medusa: {success: true, authIdentity}
    Medusa-->>Customer: JWT token
```

---

## Phase 5 -- Module Provider Export

```typescript
import BetterAuthProviderService from "./service"
import { ModuleProvider, Modules } from "@medusajs/framework/utils"

export default ModuleProvider(Modules.AUTH, {
  services: [BetterAuthProviderService],
})
```

---

## Phase 6 -- Consumer Configuration

```typescript
module.exports = defineConfig({
  modules: [{
    resolve: "@medusajs/medusa/auth",
    options: {
      providers: [{
        resolve: "@peyya/medusa-auth-better-auth/providers/better-auth",
        id: "better-auth",
        options: {
          secret: process.env.BETTER_AUTH_SECRET,
          baseURL: process.env.STORE_URL,
          socialProviders: {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            },
          },
        },
      }],
    },
  }],
})
```

---

## Phase 7 -- Tests and README

### Unit tests

- `authenticate` -- email/password success, wrong password fails, social redirect returns location, magic link sends email
- `register` -- creates AuthIdentity, duplicate email handled, password hashed
- `validateCallback` -- OAuth code exchange, magic link token verified
- `update` -- password change, social provider linked
- `validateOptions` -- missing secret throws, invalid social config throws

### README

- Supported flows (email/password, OAuth, magic links)
- Configuration with all env vars
- Auth flow diagrams
- Storefront integration guide

---

## Key Decisions

- **Better Auth as ceremony engine, Medusa as identity store** -- Better Auth handles password hashing, OAuth flows, magic link tokens. Medusa's AuthIdentity remains source of truth
- **No own database tables** -- auth providers store metadata in AuthIdentity's provider metadata field
- **Session bridging** -- primary session is Medusa's JWT; Better Auth session features are optional
