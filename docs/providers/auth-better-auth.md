---
name: Auth - Better Auth
overview: Build @peyya/medusa-auth-better-auth — Modern auth framework with social login, magic links, and session management.
todos:
  - id: scaffold-plugin
    content: "Scaffold plugin package with @peyya scope, auth keywords, exports"
    status: pending
  - id: better-auth-client
    content: "Set up Better Auth library integration (auth instance, adapter for Medusa's auth identity store)"
    status: pending
  - id: validate-options
    content: "Implement validateOptions — require secret, social provider configs"
    status: pending
  - id: authenticate
    content: "Implement authenticate — handle email/password, social OAuth, and magic link flows"
    status: pending
  - id: register
    content: "Implement register — create account via Better Auth, map to Medusa AuthIdentity"
    status: pending
  - id: validate-callback
    content: "Implement validateCallback — handle OAuth redirect callbacks"
    status: pending
  - id: update-provider
    content: "Implement update — update provider data for existing auth identity"
    status: pending
  - id: social-providers
    content: "Configure social login providers (Google, GitHub, etc.) via Better Auth plugins"
    status: pending
  - id: session-management
    content: "Integrate Better Auth session management with Medusa's auth system"
    status: pending
  - id: module-provider-export
    content: "Create index.ts with ModuleProvider(Modules.AUTH, { services: [BetterAuthService] })"
    status: pending
  - id: tests-readme
    content: "Write unit tests and README"
    status: pending
isProject: false
---

# Auth - Better Auth

Modern auth framework providing social login, magic links, email/password, and advanced session management. Extends `AbstractAuthModuleProvider`.

**Linear:** Auth project, Better Auth milestone
**Architecture:** `docs/plugins/auth.md`

## Key Technical Details

- **Methods:** authenticate, register, update, validateCallback
- **Flows:** Email/password, social OAuth (Google, GitHub, etc.), magic links
- **Mapping:** Better Auth user → Medusa AuthIdentity
- **Session:** Better Auth session tokens alongside Medusa auth tokens
