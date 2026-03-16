# Medusa JS Plugins

> The missing Swedish infrastructure for Medusa v2. Production-ready plugins covering payments, fulfillment, authentication, commerce intelligence, and agentic commerce — purpose-built for the Swedish and Nordic e-commerce market.

## Packages

### Payments

| Package | Description | Status |
|---------|-------------|--------|
| `@peyya/medusa-payment-swish` | Swish mobile payments (Sweden) | Planned |
| `@peyya/medusa-payment-klarna` | Klarna checkout (Nordics) | Planned |
| `@peyya/medusa-payment-qliro` | Qliro One checkout | Planned |
| `@peyya/medusa-payment-trustly` | Trustly bank transfers | Planned |

### Fulfillment

| Package | Description | Status |
|---------|-------------|--------|
| `@peyya/medusa-fulfillment-postnord` | PostNord shipping & pickup points | Planned |
| `@peyya/medusa-fulfillment-dhl` | DHL Express, Parcel & ServicePoint | Planned |
| `@peyya/medusa-fulfillment-budbee` | Budbee home delivery & Box lockers | Planned |
| `@peyya/medusa-fulfillment-instabox` | Instabox locker delivery | Planned |

### Auth

| Package | Description | Status |
|---------|-------------|--------|
| `@peyya/medusa-auth-better-auth` | Social login, magic links, sessions | Planned |
| `@peyya/medusa-auth-webauthn` | Passkeys / FIDO2 (BankID-ready) | Planned |
| `@peyya/medusa-auth-twilio-otp` | SMS OTP via Twilio Verify | Planned |

### Intelligence

| Package | Description | Status |
|---------|-------------|--------|
| `@peyya/medusa-plugin-analytics` | Behavioral analytics & product performance | Planned |
| `@peyya/medusa-plugin-customer-segments` | Automatic customer segmentation | Planned |
| `@peyya/medusa-plugin-recommendations` | Product recommendation engine | Planned |
| `@peyya/medusa-plugin-search-intelligence` | Search analytics & synonym management | Planned |

### Agentic Commerce

| Package | Description | Status |
|---------|-------------|--------|
| `@peyya/medusa-plugin-agentic-commerce` | AI-native commerce (feeds, chat, markdown, llms.txt) | Planned |

## Quick Start

```bash
# Install a plugin in your Medusa application
npm install @peyya/medusa-payment-swish

# Configure in medusa-config.ts
# See each package's README for configuration details
```

## Development

### Prerequisites

- Node.js >= 20
- pnpm >= 10

### Setup

```bash
git clone https://github.com/peyya-dev/medusa-plugins.git
cd medusa-plugins
pnpm install
```

### Commands

```bash
pnpm run build          # Build all packages
pnpm run test           # Run all tests
pnpm run lint           # Lint all packages
pnpm run type-check     # TypeScript validation
pnpm run format         # Format with Prettier
```

### Creating a Changeset

When you make changes to a package, create a changeset before opening a PR:

```bash
pnpm changeset          # Select changed packages and version bump type
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architecture overview, naming conventions, and dependency strategy.

## License

See [LICENSE](LICENSE).
