---
name: Monorepo Infrastructure
overview: Scaffold the medusa-plugins monorepo with pnpm workspaces, Turborepo, Changesets, shared configs, CI/CD, and README.
todos:
  - id: scaffold-pnpm
    content: "Scaffold monorepo with pnpm workspaces (pnpm init, pnpm-workspace.yaml, packages/ dir, .npmrc, .gitignore)"
    status: pending
  - id: configure-turbo
    content: "Configure Turborepo (turbo.json with build/test/lint/dev pipeline, caching)"
    status: pending
  - id: configure-changesets
    content: "Configure Changesets for independent versioning (@changesets/cli, config.json with public access and @peyya scope)"
    status: pending
  - id: shared-configs
    content: "Create shared tsconfig.base.json, ESLint flat config, and Prettier config"
    status: pending
  - id: ci-cd
    content: "Set up GitHub Actions CI/CD (PR: lint + type-check + test, Publish: Changesets version + publish)"
    status: pending
  - id: readme
    content: "Create monorepo README.md (vision, package listing, quick start, dev setup, contributing guide)"
    status: pending
isProject: false
---

# Monorepo Infrastructure

Foundation infrastructure for the Medusa JS Plugins monorepo. Must be completed before any plugin work begins.

**Linear:** MOP-12 through MOP-17 (Monorepo Infrastructure project)
**Architecture:** `docs/ARCHITECTURE.md`

## Key Decisions

- **Package manager:** pnpm (workspaces, fast, disk-efficient)
- **Build orchestration:** Turborepo (cached incremental builds)
- **Versioning:** Changesets (independent per-package versioning + changelogs)
- **Scope:** `@peyya` npm scope
- **Node:** >=20
