---
name: Agentic Commerce
overview: Build @peyya/medusa-plugin-agentic-commerce -- a single plugin that makes any Medusa store AI-native with product feeds, AI chat, markdown rendering, llms.txt, and AI-optimized robots.txt.
todos:
  - id: agentic-scaffold
    content: "Phase 1: Scaffold packages/plugin-agentic-commerce/ -- full plugin structure with three modules, workflows, API, middleware, admin UI"
    status: pending
  - id: agentic-config-models
    content: "Phase 2.1: Implement ai-config module -- AiProviderConfig, SystemPrompt, AiSettings data models"
    status: pending
  - id: agentic-kb-models
    content: "Phase 2.2: Implement knowledge-base module -- Document, DocumentChunk, KnowledgeSource models"
    status: pending
  - id: agentic-chat-models
    content: "Phase 2.3: Implement ai-chat module -- Conversation, Message models"
    status: pending
  - id: agentic-services
    content: "Phase 3: Implement module services (AiConfigService, KnowledgeBaseService, AiChatService)"
    status: pending
  - id: agentic-modules
    content: "Phase 4: Create Module exports for all three modules"
    status: pending
  - id: agentic-feed-workflow
    content: "Phase 5.1: Implement product feed workflows (generate-feed, incremental-update)"
    status: pending
  - id: agentic-embed-workflow
    content: "Phase 5.2: Implement embedding workflows (embed-document, embed-products, sync-embeddings)"
    status: pending
  - id: agentic-chat-workflow
    content: "Phase 5.3: Implement chat workflow (process-chat-message with context assembly + AI provider call)"
    status: pending
  - id: agentic-feed-api
    content: "Phase 6.1: Implement feed API routes (GET /store/ai/feed, /feed/openai, /feed/mcp)"
    status: pending
  - id: agentic-chat-api
    content: "Phase 6.2: Implement chat API route (POST /store/ai/chat with streaming support)"
    status: pending
  - id: agentic-admin-api
    content: "Phase 6.3: Implement admin API routes (config, knowledge-base, prompts, analytics)"
    status: pending
  - id: agentic-markdown
    content: "Phase 7: Implement markdown rendering middleware (.md URL interception, templates)"
    status: pending
  - id: agentic-llms-txt
    content: "Phase 8: Implement llms.txt and AI-optimized robots.txt generation"
    status: pending
  - id: agentic-subscribers
    content: "Phase 9: Implement subscribers (product CRUD → re-embed, feed invalidation)"
    status: pending
  - id: agentic-jobs
    content: "Phase 10: Implement scheduled jobs (sync embeddings, regenerate feeds)"
    status: pending
  - id: agentic-admin-ui
    content: "Phase 11: Build admin UI (AI settings, knowledge base, prompt editor, chat analytics, dashboard widget)"
    status: pending
  - id: agentic-links
    content: "Phase 12: Create module links (product→embedding, customer→conversation)"
    status: pending
  - id: agentic-security
    content: "Phase 13: Implement security (encrypted API key storage, rate limiting, GDPR retention)"
    status: pending
  - id: agentic-tests
    content: "Phase 14: Write Vitest tests and README"
    status: pending
isProject: false
---

# Agentic Commerce

P1 priority. One plugin, five pillars. Makes any Medusa store AI-native: consumable by AI agents, offering AI shopping assistance, and discoverable by LLMs.

**Docs:** [docs/plugins/agentic-commerce.md](docs/plugins/agentic-commerce.md)
**Package:** `@peyya/medusa-plugin-agentic-commerce` in `packages/plugin-agentic-commerce/`

---

## Phase 1 -- Scaffold

Single comprehensive plugin with three custom modules and extensive API/middleware layer:

```
packages/plugin-agentic-commerce/
  src/
    modules/
      ai-config/
        models/
          ai-provider-config.ts
          system-prompt.ts
          ai-settings.ts
        service.ts
        index.ts
      knowledge-base/
        models/
          document.ts
          document-chunk.ts
          knowledge-source.ts
        service.ts
        index.ts
      ai-chat/
        models/
          conversation.ts
          message.ts
        service.ts
        index.ts
    workflows/
      steps/
        generate-product-feed.ts
        embed-document.ts
        embed-products.ts
        process-chat-message.ts
        generate-markdown.ts
      generate-feed.ts
      process-document.ts
      chat.ts
      sync-embeddings.ts
    api/
      store/ai/
        chat/route.ts
        feed/route.ts
        feed/[format]/route.ts
        products/[id]/route.ts
        search/route.ts
      admin/ai/
        config/route.ts
        knowledge-base/route.ts
        prompts/route.ts
        analytics/route.ts
    subscribers/
      product-updated.ts
      product-created.ts
      product-deleted.ts
    jobs/
      sync-product-embeddings.ts
      generate-feeds.ts
    admin/
      routes/
        ai-settings/page.tsx
        knowledge-base/page.tsx
        system-prompts/page.tsx
        chat-analytics/page.tsx
      widgets/
        ai-status.tsx
    middleware/
      markdown-renderer.ts
    links/
      product-embedding.ts
      customer-conversation.ts
  package.json
  README.md
```

---

## Phase 2 -- Data Models

### 2.1 AI Config Module

```typescript
const AiProviderConfig = model.define("ai_provider_config", {
  id: model.id().primaryKey(),
  provider: model.text(),              // "openai", "anthropic", "google"
  api_key_encrypted: model.text(),     // AES-256 encrypted
  model: model.text(),                 // "gpt-4o", "claude-sonnet-4-20250514"
  temperature: model.float().default(0.7),
  max_tokens: model.number().default(2048),
  is_active: model.boolean().default(true),
  region_id: model.text().nullable(),
})

const SystemPrompt = model.define("system_prompt", {
  id: model.id().primaryKey(),
  name: model.text(),
  content: model.text(),
  is_default: model.boolean().default(false),
  region_id: model.text().nullable(),
  language: model.text().default("sv"),
})

const AiSettings = model.define("ai_settings", {
  id: model.id().primaryKey(),
  markdown_rendering_enabled: model.boolean().default(true),
  llms_txt_enabled: model.boolean().default(true),
  chat_enabled: model.boolean().default(true),
  feed_enabled: model.boolean().default(true),
  allowed_ai_crawlers: model.json().default(["GPTBot", "ClaudeBot", "PerplexityBot"]),
  blocked_ai_crawlers: model.json().default([]),
  feed_refresh_interval_hours: model.number().default(24),
})
```

### 2.2 Knowledge Base Module

```typescript
const Document = model.define("kb_document", {
  id: model.id().primaryKey(),
  title: model.text(),
  content: model.text(),
  mime_type: model.text(),
  source_url: model.text().nullable(),
  metadata: model.json().default({}),
})

const DocumentChunk = model.define("kb_document_chunk", {
  id: model.id().primaryKey(),
  document_id: model.text(),
  content: model.text(),
  embedding: model.json().nullable(),
  chunk_index: model.number(),
  token_count: model.number(),
})
```

### 2.3 AI Chat Module

```typescript
const Conversation = model.define("ai_conversation", {
  id: model.id().primaryKey(),
  customer_id: model.text().nullable(),
  session_id: model.text(),
  title: model.text().nullable(),
  metadata: model.json().default({}),
})

const Message = model.define("ai_message", {
  id: model.id().primaryKey(),
  conversation_id: model.text(),
  role: model.text(),              // "user", "assistant", "system"
  content: model.text(),
  metadata: model.json().default({}),
})
```

---

## Phase 3 -- Module Exports

```typescript
export default Module("aiConfig", { service: AiConfigService })
export default Module("knowledgeBase", { service: KnowledgeBaseService })
export default Module("aiChat", { service: AiChatService })
```

---

## Pillar 1: AI Product Feed (Phase 5.1 + 6.1)

### Endpoints


| Route                       | Format                | Consumer              |
| --------------------------- | --------------------- | --------------------- |
| `GET /store/ai/feed`        | Structured JSON       | Generic AI agents     |
| `GET /store/ai/feed/openai` | OpenAI product feed   | ChatGPT Shopping      |
| `GET /store/ai/feed/mcp`    | MCP tool descriptions | MCP-enabled AI agents |


### Feed generation

- Cached, regenerated on schedule (default 24h) or on product CRUD events
- Workflow: fetch products via `query.graph()` → format per schema → cache

---

## Pillar 2: AI Chat (Phase 5.3 + 6.2)

### Store API

```
POST /store/ai/chat
{
  "message": "Jag letar efter svarta sneakers i storlek 42",
  "session_id": "abc123",
  "customer_id": "cust_xxx"
}
→ {
  "response": "Jag hittade 3 svarta sneakers...",
  "products": [...],
  "session_id": "abc123",
  "conversation_id": "conv_xxx"
}
```

### Context assembly pipeline

1. Load system prompt (from admin config)
2. Retrieve relevant knowledge base chunks (embedding similarity / RAG)
3. Load conversation history (last N messages)
4. Load customer context (cart, order history if authenticated)
5. Call AI provider with full context
6. Parse response for product references (function calling / tool use)
7. Store conversation, return response + products

### AI provider abstraction

```typescript
interface AiProvider {
  generateResponse(messages: Message[], context: ChatContext, options: ProviderOptions): Promise<ChatResponse>
  generateResponseStream(messages: Message[], context: ChatContext, options: ProviderOptions): AsyncIterable<ChatChunk>
}
```

Implementations: OpenAI, Anthropic, Google AI. Selected based on `ai_provider_config`.

---

## Pillar 3: Markdown Rendering (Phase 7)

Middleware intercepts `.md` URL suffix:

```
/products/nike-air-max-90.md → Markdown product page
/categories/shoes.md         → Markdown category listing
/collections/summer-2026.md  → Markdown collection page
```

Implementation: API middleware checks path suffix → strip `.md` → resolve entity → render template → return `Content-Type: text/markdown`.

---

## Pillar 4: llms.txt (Phase 8)

Auto-generated at `/llms.txt` and `/.well-known/llms.txt`:

```markdown
# {store_name}

> {store_description}

## Products
- [All Products](/store/ai/feed)
- [Product Catalog (Markdown)](/sitemap-ai.md)

## API Endpoints
- Chat: POST /store/ai/chat
- Search: GET /store/ai/search?q={query}
- Feed: GET /store/ai/feed
```

---

## Pillar 5: AI-Optimized robots.txt (Phase 8)

Dynamically generated based on admin settings. Configurable per AI crawler (GPTBot, ClaudeBot, PerplexityBot, etc.). References `llms.txt` and AI sitemap.

---

## Phase 9 -- Subscribers

- `product.created` → embed product, add to feed cache
- `product.updated` → re-embed, invalidate feed cache
- `product.deleted` → remove embeddings, invalidate feed cache

---

## Phase 10 -- Scheduled Jobs

- **Sync embeddings** -- full re-sync of product embeddings (weekly)
- **Generate feeds** -- regenerate cached feeds (configurable interval)

---

## Phase 11 -- Admin UI

- **AI Settings page** -- provider config (API key input, model selection, temperature)
- **Knowledge Base page** -- upload documents, manage sources
- **System Prompts page** -- editor for prompts per region/language
- **Chat Analytics page** -- conversation count, popular questions, response quality
- **Dashboard widget** -- AI status (active/inactive, model, last feed generation)

---

## Phase 12 -- Security

- API keys stored AES-256 encrypted in database
- Admin UI masks API keys (show last 4 chars only)
- Chat endpoint rate-limited per session/IP
- GDPR: conversation retention configurable, auto-cleanup job
- Knowledge base access controlled via admin auth

---

## Consumer Configuration

```typescript
module.exports = defineConfig({
  plugins: [{
    resolve: "@peyya/medusa-plugin-agentic-commerce",
    options: {
      defaultProvider: "openai",
      defaultModel: "gpt-4o",
      chatEnabled: true,
      feedEnabled: true,
      markdownEnabled: true,
      llmsTxtEnabled: true,
      embeddingProvider: "openai",
      vectorStore: "pgvector",
      feedRefreshHours: 24,
    },
  }],
})
```

---

## Key Decisions

- **Single plugin** -- the five pillars share data models and are deeply interrelated; separate packages would create unnecessary coupling overhead
- **Provider abstraction** -- AI provider interface, not hardcoded to OpenAI; supports Anthropic, Google, etc.
- **Encrypted keys** -- API keys never stored in plaintext; AES-256 with server-side key
- **Module names:** `aiConfig`, `knowledgeBase`, `aiChat` (camelCase)
- **pgvector default** -- use PostgreSQL's pgvector extension for embeddings (no external vector DB required), with optional adapters for Pinecone/Qdrant

