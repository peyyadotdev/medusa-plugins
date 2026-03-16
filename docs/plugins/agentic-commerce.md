---
name: ""
overview: ""
todos: []
isProject: false
---

# Agentic Commerce — Category Plan

A comprehensive plugin that makes any Medusa store AI-native. One install gives the store everything it needs to be consumed by AI agents, offer AI-powered shopping assistance, and be discoverable by LLMs.

## Package


| Plugin               | Package                                 | Status  | Priority |
| -------------------- | --------------------------------------- | ------- | -------- |
| **Agentic Commerce** | `@peyya/medusa-plugin-agentic-commerce` | Planned | P1       |


This is a single, comprehensive plugin — not multiple packages. The features are deeply interrelated and share data models, making a single plugin the right architecture.    
  
@

## Five Pillars

### 1. AI Product Feed

Structured product data optimized for AI agent consumption.

### 2. AI Chat / Shopping Assistant

Complete chat solution with configurable AI providers, knowledge base, and system prompts.

### 3. Markdown Rendering

Any page available as AI-friendly markdown by appending `.md` to the URL.

### 4. llms.txt & AI Discovery

Auto-generated manifest files that tell AI agents about the store.

### 5. AI-Optimized robots.txt

Configurable crawler directives for AI bots.

---

## Architecture

```
packages/plugin-agentic-commerce/
├── src/
│   ├── modules/
│   │   ├── ai-config/
│   │   │   ├── models/
│   │   │   │   ├── ai-provider-config.ts     # Provider keys, model settings
│   │   │   │   ├── system-prompt.ts          # System prompts per region/market
│   │   │   │   └── ai-settings.ts            # General AI settings
│   │   │   ├── service.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── knowledge-base/
│   │   │   ├── models/
│   │   │   │   ├── document.ts               # Uploaded documents
│   │   │   │   ├── document-chunk.ts         # Chunked + embedded content
│   │   │   │   └── knowledge-source.ts       # Source configuration
│   │   │   ├── service.ts
│   │   │   └── index.ts
│   │   │
│   │   └── ai-chat/
│   │       ├── models/
│   │       │   ├── conversation.ts           # Chat sessions
│   │       │   └── message.ts                # Individual messages
│   │       ├── service.ts
│   │       └── index.ts
│   │
│   ├── workflows/
│   │   ├── steps/
│   │   │   ├── generate-product-feed.ts
│   │   │   ├── embed-document.ts
│   │   │   ├── embed-products.ts
│   │   │   ├── process-chat-message.ts
│   │   │   └── generate-markdown.ts
│   │   ├── generate-feed.ts
│   │   ├── process-document.ts
│   │   ├── chat.ts
│   │   └── sync-embeddings.ts
│   │
│   ├── api/
│   │   ├── store/
│   │   │   └── ai/
│   │   │       ├── chat/
│   │   │       │   └── route.ts              # POST /store/ai/chat
│   │   │       ├── feed/
│   │   │       │   ├── route.ts              # GET /store/ai/feed (default JSON)
│   │   │       │   └── [format]/
│   │   │       │       └── route.ts          # GET /store/ai/feed/openai
│   │   │       ├── products/
│   │   │       │   └── [id]/
│   │   │       │       └── route.ts          # GET /store/ai/products/:id (markdown)
│   │   │       └── search/
│   │   │           └── route.ts              # GET /store/ai/search
│   │   │
│   │   └── admin/
│   │       └── ai/
│   │           ├── config/
│   │           │   └── route.ts              # GET/POST AI provider settings
│   │           ├── knowledge-base/
│   │           │   └── route.ts              # CRUD knowledge documents
│   │           ├── prompts/
│   │           │   └── route.ts              # CRUD system prompts
│   │           └── analytics/
│   │               └── route.ts              # Chat analytics
│   │
│   ├── subscribers/
│   │   ├── product-updated.ts                # Re-embed on product change
│   │   ├── product-created.ts                # Embed new products
│   │   └── product-deleted.ts                # Remove embeddings
│   │
│   ├── jobs/
│   │   ├── sync-product-embeddings.ts        # Full re-sync scheduled job
│   │   └── generate-feeds.ts                 # Regenerate cached feeds
│   │
│   ├── admin/
│   │   ├── routes/
│   │   │   ├── ai-settings/
│   │   │   │   └── page.tsx                  # AI provider configuration
│   │   │   ├── knowledge-base/
│   │   │   │   └── page.tsx                  # Document management
│   │   │   ├── system-prompts/
│   │   │   │   └── page.tsx                  # Prompt editor
│   │   │   └── chat-analytics/
│   │   │       └── page.tsx                  # Chat usage analytics
│   │   └── widgets/
│   │       └── ai-status.tsx                 # Dashboard widget
│   │
│   ├── middleware/
│   │   └── markdown-renderer.ts              # Intercepts .md requests
│   │
│   └── links/
│       ├── product-embedding.ts              # Link products to embeddings
│       └── customer-conversation.ts          # Link customers to conversations
│
├── package.json
├── tsconfig.json
└── README.md
```

---

## Data Models

### AI Config Module

```typescript
// ai-provider-config.ts
const AiProviderConfig = model.define("ai_provider_config", {
  id: model.id().primaryKey(),
  provider: model.text(),               // "openai", "anthropic", "google"
  api_key_encrypted: model.text(),       // Encrypted API key
  model: model.text(),                   // "gpt-4o", "claude-sonnet-4-20250514"
  temperature: model.float().default(0.7),
  max_tokens: model.number().default(2048),
  is_active: model.boolean().default(true),
  region_id: model.text().nullable(),    // Optional per-region config
})

// system-prompt.ts
const SystemPrompt = model.define("system_prompt", {
  id: model.id().primaryKey(),
  name: model.text(),                    // "Default", "Swedish Market", "Support"
  content: model.text(),                 // The actual system prompt
  is_default: model.boolean().default(false),
  region_id: model.text().nullable(),    // Optional per-region prompt
  language: model.text().default("sv"),  // Language code
})

// ai-settings.ts
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

### Knowledge Base Module

```typescript
// document.ts
const Document = model.define("kb_document", {
  id: model.id().primaryKey(),
  title: model.text(),
  content: model.text(),                  // Raw content
  mime_type: model.text(),                // "text/markdown", "application/pdf"
  source_url: model.text().nullable(),    // Original URL if fetched
  metadata: model.json().default({}),
})

// document-chunk.ts
const DocumentChunk = model.define("kb_document_chunk", {
  id: model.id().primaryKey(),
  document_id: model.text(),
  content: model.text(),                  // Chunked text
  embedding: model.json().nullable(),     // Vector embedding (or stored in external vector DB)
  chunk_index: model.number(),
  token_count: model.number(),
})
```

### AI Chat Module

```typescript
// conversation.ts
const Conversation = model.define("ai_conversation", {
  id: model.id().primaryKey(),
  customer_id: model.text().nullable(),   // Linked if authenticated
  session_id: model.text(),               // Anonymous session
  title: model.text().nullable(),         // Auto-generated summary
  metadata: model.json().default({}),
})

// message.ts
const Message = model.define("ai_message", {
  id: model.id().primaryKey(),
  conversation_id: model.text(),
  role: model.text(),                     // "user", "assistant", "system"
  content: model.text(),
  metadata: model.json().default({}),     // Token usage, model, latency
})
```

---

## Pillar Details

### 1. AI Product Feed

**Endpoints:**


| Route                       | Format                           | Consumer              |
| --------------------------- | -------------------------------- | --------------------- |
| `GET /store/ai/feed`        | Structured JSON                  | Generic AI agents     |
| `GET /store/ai/feed/openai` | OpenAI product feed schema       | ChatGPT Shopping      |
| `GET /store/ai/feed/mcp`    | MCP-compatible tool descriptions | MCP-enabled AI agents |


**Feed Content Per Product:**

- Title, description (plain text, no HTML)
- Price with currency (SEK)
- All variants with SKU, price, inventory status
- Categories and collections
- Image URLs
- Key attributes (size, color, material, weight)
- Availability status

**Generation:**

- Feeds are cached and regenerated on schedule (configurable, default 24h)
- Product create/update/delete events trigger incremental feed updates
- Workflow: `generate-feed` → fetches products via `query.graph()` → formats → caches

### 2. AI Chat / Shopping Assistant

**Store API:**

```
POST /store/ai/chat
Body: {
  "message": "Jag letar efter svarta sneakers i storlek 42",
  "session_id": "abc123",       // Optional, creates new if omitted
  "customer_id": "cust_xxx"     // Optional, for personalized responses
}

Response: {
  "response": "Jag hittade 3 svarta sneakers i storlek 42...",
  "products": [
    { "id": "prod_1", "title": "Nike Air Max 90", "price": 1499, ... }
  ],
  "session_id": "abc123",
  "conversation_id": "conv_xxx"
}
```

**How it Works:**

1. Customer sends message
2. Workflow loads: system prompt + knowledge base context + product catalog context
3. AI provider called with full context
4. Response includes text + optional product recommendations
5. Conversation stored for history

**AI Provider Integration:**

- Abstract provider interface: `generateResponse(messages, context, options)`
- Implementations for OpenAI, Anthropic, Google AI
- Function calling / tool use for product search, cart operations, order lookup
- Streaming support for real-time responses

**Context Assembly:**

- System prompt (from admin configuration)
- Knowledge base (relevant chunks via embedding similarity)
- Product catalog (via function calling or pre-loaded context)
- Customer context (cart, order history if authenticated)
- Conversation history (last N messages)

### 3. Markdown Rendering

**Middleware:**

Any URL with `.md` appended returns AI-friendly markdown instead of the normal response.

```
/products/nike-air-max-90.md → Markdown product page
/categories/shoes.md         → Markdown category listing
/collections/summer-2026.md  → Markdown collection page
```

**Product Markdown Template:**

```markdown
# {product.title}

**Price:** {price} {currency}
**SKU:** {variant.sku}
**Available:** {in_stock ? "Yes" : "No"} ({inventory_quantity} units)

## Description
{product.description — stripped of HTML}

## Variants
| Size | Color | Price | In Stock |
|------|-------|-------|----------|
| 42   | Black | 1499 SEK | Yes (12) |
| 43   | Black | 1499 SEK | Yes (8) |

## Specifications
| Property | Value |
|----------|-------|
| Material | {product.material} |
| Weight   | {product.weight}g |

## Images
- ![{alt}]({image_url})

## Related Products
- [{related.title}]({related.handle}.md) — {related.price} {currency}
```

**Implementation:**

- API middleware checks if request path ends with `.md`
- Strips `.md` extension, resolves the entity (product, category, collection)
- Renders using markdown template
- Returns with `Content-Type: text/markdown`

### 4. llms.txt

Auto-generated file at `/llms.txt` (and `/.well-known/llms.txt`):

```markdown
# {store_name}

> {store_description}

## Products
- [All Products](/store/ai/feed) — Structured JSON product feed
- [Product Catalog (Markdown)](/sitemap-ai.md) — Browse all products as markdown

## Store Information
- [Return Policy](/pages/return-policy.md)
- [Shipping Information](/pages/shipping.md)
- [Size Guide](/pages/size-guide.md)
- [About Us](/pages/about.md)

## API Endpoints
- Chat: POST /store/ai/chat (JSON)
- Product Search: GET /store/ai/search?q={query}
- Product Feed: GET /store/ai/feed
- Product Detail: GET /store/ai/products/{id}

## Contact
- Email: {store_email}
- Phone: {store_phone}
```

**Generation:**

- Auto-generated from store settings + CMS pages + configured knowledge base documents
- Regenerated when pages/products change
- Configurable in Admin UI (which sections to include)

### 5. AI-Optimized robots.txt

**Admin UI Configuration:**

Store owner toggles which AI crawlers to allow/block:


| Crawler         | Default | Description                |
| --------------- | ------- | -------------------------- |
| GPTBot          | Allowed | OpenAI's crawler           |
| ChatGPT-User    | Allowed | ChatGPT browsing           |
| ClaudeBot       | Allowed | Anthropic's crawler        |
| PerplexityBot   | Allowed | Perplexity search          |
| Google-Extended | Allowed | Google AI training         |
| CCBot           | Blocked | Common Crawl (AI training) |


**Implementation:**

- Middleware intercepts `/robots.txt` requests
- Generates dynamically based on admin settings
- Includes reference to `llms.txt` and AI sitemap

---

## Consumer Configuration

```typescript
module.exports = defineConfig({
  plugins: [
    {
      resolve: "@peyya/medusa-plugin-agentic-commerce",
      options: {
        // AI provider defaults (can be overridden in Admin UI)
        defaultProvider: "openai",
        defaultModel: "gpt-4o",

        // Feature toggles
        chatEnabled: true,
        feedEnabled: true,
        markdownEnabled: true,
        llmsTxtEnabled: true,

        // Knowledge base
        embeddingProvider: "openai",  // or "local" for local embeddings
        vectorStore: "pgvector",      // or "pinecone", "qdrant"

        // Feed settings
        feedRefreshHours: 24,
      },
    },
  ],
})
```

---

## Security Considerations

- API keys stored encrypted in database (AES-256)
- Admin UI never displays full API keys (masked)
- Chat endpoint rate-limited per session/IP
- Knowledge base documents access-controlled via admin auth
- `data` from chat sessions not exposed to unauthorized users
- GDPR: conversation data retention configurable, auto-cleanup job

## Dependencies

- **Required:** None (works standalone)
- **Enhanced by:** `@peyya/medusa-plugin-analytics` (chat analytics data)
- **Enhanced by:** `@peyya/medusa-plugin-recommendations` (better product suggestions in chat)

