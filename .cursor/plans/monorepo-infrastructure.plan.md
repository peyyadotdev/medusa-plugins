---
name: Monorepo Infrastructure
overview: Scaffold the medusa-plugins monorepo from scratch -- pnpm workspaces, Turborepo, Changesets, shared TypeScript/lint/format configs, GitHub Actions CI/CD, and root README.
todos:
  - id: infra-pnpm
    content: "Phase 1: Scaffold pnpm workspace (root package.json, pnpm-workspace.yaml, packages/ dir, .npmrc, .gitignore)"
    status: completed
  - id: infra-turbo
    content: "Phase 2: Configure Turborepo (turbo.json with build/test/lint/dev pipelines, topological deps, caching)"
    status: completed
  - id: infra-changesets
    content: "Phase 3: Configure Changesets (independent versioning, @peyya scope, public access, GitHub changelog)"
    status: completed
  - id: infra-tsconfig
    content: "Phase 4.1: Create tsconfig.base.json (strict, ES2022, NodeNext, paths)"
    status: completed
  - id: infra-eslint
    content: "Phase 4.2: Create ESLint flat config (root eslint.config.js)"
    status: completed
  - id: infra-prettier
    content: "Phase 4.3: Create Prettier config (.prettierrc)"
    status: completed
  - id: infra-ci
    content: "Phase 5.1: Create GitHub Actions CI workflow (PR: install, lint, type-check, test via turbo)"
    status: completed
  - id: infra-publish
    content: "Phase 5.2: Create GitHub Actions publish workflow (Changesets version PR + npm publish on merge)"
    status: completed
  - id: infra-readme
    content: "Phase 6: Write root README.md (vision, package table, quick start, dev setup, contributing)"
    status: completed
isProject: false
---

# Monorepo Infrastructure

Foundation that must be completed before any plugin work begins. Everything else depends on this.

**Docs:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
**Priority:** P0 -- prerequisite for all other work

---

## Phase 1 -- pnpm Workspace

### 1.1 Root package.json

```json
{
  "name": "medusa-plugins",
  "private": true,
  "engines": { "node": ">=20" },
  "packageManager": "pnpm@9.x",
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "format": "prettier --write .",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "publish-packages": "turbo run build && changeset publish"
  },
  "devDependencies": {
    "turbo": "<latest>",
    "@changesets/cli": "<latest>",
    "@changesets/changelog-github": "<latest>",
    "typescript": "^5.5.0",
    "vitest": "<latest>",
    "eslint": "<latest>",
    "prettier": "<latest>"
  }
}
```

### 1.2 pnpm-workspace.yaml

```yaml
packages:
  - "packages/*"
```

### 1.3 .npmrc

```
@peyya:registry=https://registry.npmjs.org/
shamefully-hoist=true
```

`shamefully-hoist=true` is required by Medusa's module resolution.

### 1.4 .gitignore

```
node_modules/
dist/
.turbo/
.medusa/
*.tsbuildinfo
```

---

## Phase 2 -- Turborepo

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".medusa/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "cache": true
    },
    "lint": {
      "cache": true
    },
    "type-check": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "dev": {
      "persistent": true,
      "cache": false
    }
  }
}
```

Key: `build` uses topological dependency (`^build`) so packages build in correct order. Outputs include `.medusa/` (Medusa plugin CLI output) and `dist/`.

---

## Phase 3 -- Changesets

### .changeset/config.json

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": ["@changesets/changelog-github", { "repo": "peyya-dev/medusa-plugins" }],
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

Independent versioning -- each package gets its own version. No fixed version groups. Public npm access for `@peyya` scope.

---

## Phase 4 -- Shared Configs

### 4.1 tsconfig.base.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

Each package extends this with `"extends": "../../tsconfig.base.json"`.

### 4.2 ESLint flat config

Root `eslint.config.js` with TypeScript rules. Packages inherit the root config.

### 4.3 Prettier

Root `.prettierrc` with consistent formatting rules (semi, single quotes, trailing commas, 100 print width).

---

## Phase 5 -- GitHub Actions CI/CD

### 5.1 CI workflow (`.github/workflows/ci.yml`)

Triggers on PR to `main`:

1. Checkout + pnpm setup + install
2. `turbo run lint` -- lint all changed packages
3. `turbo run type-check` -- TypeScript validation
4. `turbo run test` -- run tests for changed packages

Uses `turbo --filter=...[origin/main]` to only check changed packages.

### 5.2 Publish workflow (`.github/workflows/publish.yml`)

Triggers on push to `main`:

1. Changesets action creates "Version Packages" PR when changesets exist
2. Merging that PR triggers: build all → `changeset publish` to npm
3. Each package published independently with its own version

---

## Phase 6 -- Root README

- **Vision** -- "The missing Swedish infrastructure for Medusa v2"
- **Package table** -- all packages with name, description, status, npm badge
- **Quick start** -- `npm install @peyya/medusa-payment-swish` example
- **Development setup** -- clone, `pnpm install`, `turbo run build`
- **Contributing guide** -- changeset workflow, PR process
- **Architecture** -- link to `docs/ARCHITECTURE.md`

---

## Verification

After completing all phases:

```bash
pnpm install                  # Clean install
turbo run build               # Should succeed (no packages yet, but pipeline is valid)
turbo run lint                # Should pass
turbo run type-check          # Should pass
pnpm changeset                # Should prompt for package selection
```
