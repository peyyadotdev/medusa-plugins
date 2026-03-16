# Medusa JS Plugins — Architecture

> The missing Swedish infrastructure for Medusa v2. Production-ready plugins covering payments, fulfillment, authentication, commerce intelligence, and agentic commerce — purpose-built for the Swedish and Nordic e-commerce market.

## Vision

Where the global Medusa ecosystem offers Stripe and PayPal, we provide Swish, Klarna, and Qliro. Where it offers UPS and FedEx, we provide PostNord and DHL Nordic. Where it offers basic auth, we provide BankID-ready WebAuthn and Swedish mobile OTP flows. And where it stops at raw product data, we provide intelligent recommendations, search, and customer insights — plus a complete AI-native commerce layer.

Every plugin is independently installable, production-ready, and follows Medusa's official plugin architecture. Published under the `@peyya` npm scope.

---

## Monorepo Structure

```
medusa-plugins/
├── packages/
│   │
│   │── PAYMENTS ─────────────────────────────────────────
│   ├── payment-swish/                # @peyya/medusa-payment-swish
│   ├── payment-klarna/               # @peyya/medusa-payment-klarna
│   ├── payment-qliro/                # @peyya/medusa-payment-qliro
│   ├── payment-trustly/              # @peyya/medusa-payment-trustly
│   │
│   │── FULFILLMENT ──────────────────────────────────────
│   ├── fulfillment-postnord/         # @peyya/medusa-fulfillment-postnord
│   ├── fulfillment-dhl/              # @peyya/medusa-fulfillment-dhl
│   ├── fulfillment-budbee/           # @peyya/medusa-fulfillment-budbee
│   ├── fulfillment-instabox/         # @peyya/medusa-fulfillment-instabox
│   │
│   │── AUTH ─────────────────────────────────────────────
│   ├── auth-better-auth/             # @peyya/medusa-auth-better-auth
│   ├── auth-webauthn/                # @peyya/medusa-auth-webauthn
│   ├── auth-twilio-otp/              # @peyya/medusa-auth-twilio-otp
│   │
│   │── INTELLIGENCE ─────────────────────────────────────
│   ├── plugin-recommendations/       # @peyya/medusa-plugin-recommendations
│   ├── plugin-search-intelligence/   # @peyya/medusa-plugin-search-intelligence
│   ├── plugin-customer-segments/     # @peyya/medusa-plugin-customer-segments
│   ├── plugin-analytics/             # @peyya/medusa-plugin-analytics
│   │
│   │── AGENTIC COMMERCE ────────────────────────────────
│   ├── plugin-agentic-commerce/      # @peyya/medusa-plugin-agentic-commerce
│   │
│   │── SDK ──────────────────────────────────────────────
│   └── sdk/                          # @peyya/medusa-plugins
│
├── docs/
│   ├── ARCHITECTURE.md               # This file
│   ├── plugins/
│   │   ├── payments.md               # Payment category design
│   │   ├── fulfillment.md            # Fulfillment category design
│   │   ├── auth.md                   # Auth category design
│   │   ├── intelligence.md           # Intelligence category design
│   │   └── agentic-commerce.md       # Agentic Commerce design
│   └── providers/
│       ├── swish.md                  # Swish-specific implementation details
│       ├── klarna.md                 # Klarna-specific details
│       ├── postnord.md               # PostNord-specific details
│       └── ...
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json                      # Root workspace
├── tsconfig.base.json                # Shared TypeScript config
├── .changeset/                       # Changesets versioning config
└── LICENSE
```

---

## Medusa Architecture Mapping

Each plugin category maps to a specific Medusa v2 concept:

| Category | Medusa Concept | Base Class | Export Function | Plugin Path |
|----------|---------------|------------|-----------------|-------------|
| **Payments** | Module Provider | `AbstractPaymentProvider` | `ModuleProvider(Modules.PAYMENT, ...)` | `src/providers/` |
| **Fulfillment** | Module Provider | `AbstractFulfillmentProvider` | `ModuleProvider(Modules.FULFILLMENT, ...)` | `src/providers/` |
| **Auth** | Module Provider | `AbstractAuthModuleProvider` | `ModuleProvider(Modules.AUTH, ...)` | `src/providers/` |
| **Intelligence** | Custom Module | `MedusaService` + `createWorkflow` | `Module(...)` | `src/modules/` |
| **Agentic Commerce** | Custom Module + Middleware | `MedusaService` + `createWorkflow` | `Module(...)` | `src/modules/` + `src/api/` |

### Module Providers (Payments, Fulfillment, Auth)

These plug into Medusa's existing commerce modules. They:
- Extend an abstract provider class
- Don't create their own database tables
- Are registered under the parent module's `providers` array in `medusa-config.ts`
- Handle third-party API integration only

### Custom Modules (Intelligence, Agentic Commerce)

These create entirely new domain concepts. They:
- Define their own data models with migrations
- Have their own service classes extending `MedusaService`
- Include workflows, API routes, admin UI, subscribers, and scheduled jobs
- Are registered as plugins in `medusa-config.ts`

---

## Naming Conventions

### Package Names

| Type | Pattern | Example |
|------|---------|---------|
| Payment provider | `@peyya/medusa-payment-{name}` | `@peyya/medusa-payment-swish` |
| Fulfillment provider | `@peyya/medusa-fulfillment-{name}` | `@peyya/medusa-fulfillment-postnord` |
| Auth provider | `@peyya/medusa-auth-{name}` | `@peyya/medusa-auth-webauthn` |
| Feature plugin | `@peyya/medusa-plugin-{name}` | `@peyya/medusa-plugin-recommendations` |
| Umbrella SDK | `@peyya/medusa-plugins` | `@peyya/medusa-plugins` |

### Module Names (camelCase, NEVER dashes)

```typescript
// ✅ Correct
Module("recommendations", { service: RecommendationsService })
Module("searchIntelligence", { service: SearchIntelligenceService })
Module("agenticCommerce", { service: AgenticCommerceService })

// ❌ Wrong — dashes break Medusa's module resolution
Module("search-intelligence", { service: SearchIntelligenceService })
```

### Provider Identifiers

```typescript
// Payment providers
static identifier = "swish"      // → pp_swish_{id}
static identifier = "klarna"     // → pp_klarna_{id}

// Fulfillment providers
static identifier = "postnord"   // → fp_postnord_{id}
static identifier = "dhl"        // → fp_dhl_{id}

// Auth providers
static identifier = "webauthn"   // → ap_webauthn_{id}
```

---

## Dependency Strategy

### Per-Package Dependencies

```json
{
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
    // Only third-party SDK specific to this provider
  }
}
```

### Rules

- `@medusajs/*` → always `devDependencies` + `peerDependencies`
- Third-party SDKs (stripe, klarna-checkout, postnord-api) → `dependencies`
- `@swc/core` → `devDependencies` (required by Medusa plugin CLI)
- Shared workspace packages → `"workspace:*"` protocol

### NPM Keywords

All packages must include:
- `medusa-v2`
- `medusa-plugin-integration`
- Category-specific: `medusa-plugin-payment`, `medusa-plugin-shipping`, `medusa-plugin-auth`, or `medusa-plugin-other`

---

## Tooling

| Tool | Purpose |
|------|---------|
| **pnpm** | Package manager with workspace support |
| **Turborepo** | Build orchestration, caching, incremental builds |
| **Changesets** | Independent versioning and changelog generation per package |
| **tsup** or **Medusa CLI** | TypeScript bundling (`npx medusa plugin:build` per package) |
| **Vitest** | Testing framework |
| **ESLint + Prettier** | Code quality and formatting |

---

## Publishing Pipeline

### Local Development

```bash
# In plugin package
npx medusa plugin:publish         # Publish to local Yalc registry
npx medusa plugin:develop         # Watch mode with HMR

# In test Medusa application
npx medusa plugin:add @peyya/medusa-payment-swish
npm run dev
```

### NPM Publishing

```bash
pnpm changeset                    # Select changed packages + version bump type
pnpm changeset version            # Apply version bumps + generate changelogs
turbo run build                   # Build all changed packages
pnpm changeset publish            # Publish to npm
```

### CI/CD (GitHub Actions)

1. PR merged to `main`
2. Changesets bot creates "Version Packages" PR
3. Merging version PR triggers publish to npm
4. Each package published independently with its own version

---

## Build Order & Dependencies

```
1. Monorepo Infrastructure (must be first)
   └── pnpm workspace, turbo, changesets, tsconfig, CI

2. Payments (no cross-plugin dependencies)
   ├── payment-swish
   ├── payment-klarna
   ├── payment-qliro
   └── payment-trustly

3. Fulfillment (no cross-plugin dependencies)
   ├── fulfillment-postnord
   ├── fulfillment-dhl
   ├── fulfillment-budbee
   └── fulfillment-instabox

4. Auth (no cross-plugin dependencies)
   ├── auth-better-auth
   ├── auth-webauthn
   └── auth-twilio-otp

5. Intelligence (may depend on each other)
   ├── plugin-analytics (foundation — events, tracking)
   ├── plugin-customer-segments (depends on analytics data)
   ├── plugin-recommendations (depends on analytics + segments)
   └── plugin-search-intelligence (depends on analytics)

6. Agentic Commerce (may reference intelligence)
   └── plugin-agentic-commerce

7. SDK (depends on all above)
   └── sdk (umbrella re-export)
```

Categories 2-4 (Payments, Fulfillment, Auth) can be built in parallel — they are independent module providers with no cross-dependencies.

---

## Detailed Category Plans

Each category has its own detailed design document:

- **[Payments](plugins/payments.md)** — Swedish payment providers (Swish, Klarna, Qliro, Trustly)
- **[Fulfillment](plugins/fulfillment.md)** — Nordic shipping & delivery (PostNord, DHL, Budbee, Instabox)
- **[Auth](plugins/auth.md)** — Modern authentication (Better Auth, WebAuthn, Twilio OTP)
- **[Intelligence](plugins/intelligence.md)** — Commerce intelligence (recommendations, search, segments, analytics)
- **[Agentic Commerce](plugins/agentic-commerce.md)** — AI-native commerce (chat, feeds, markdown, llms.txt)

Each provider within a category will get its own detailed implementation document in `docs/providers/`.
