---
name: Intelligence Search
overview: Build @peyya/medusa-plugin-search-intelligence -- search analytics, synonym management, popularity ranking, and zero-result detection with Swedish language support.
todos:
  - id: search-scaffold
    content: "Phase 1: Scaffold packages/plugin-search-intelligence/ -- plugin directory structure"
    status: pending
  - id: search-models
    content: "Phase 2: Define data models (SearchSynonym, SearchQuery, SearchBoost)"
    status: pending
  - id: search-service
    content: "Phase 3: Implement SearchIntelligenceModuleService with synonym resolution and query analytics"
    status: pending
  - id: search-module
    content: "Phase 4: Create Module('searchIntelligence', { service }) export"
    status: pending
  - id: search-workflows
    content: "Phase 5: Implement workflows (log-search, aggregate-queries, suggest-synonyms)"
    status: pending
  - id: search-store-api
    content: "Phase 6.1: Implement store API (GET /store/search/suggest, GET /store/search/synonyms)"
    status: pending
  - id: search-admin-api
    content: "Phase 6.2: Implement admin API (top queries, zero-results, synonym CRUD, boost CRUD)"
    status: pending
  - id: search-subscribers
    content: "Phase 7: Implement subscriber (search events from analytics → update query stats)"
    status: pending
  - id: search-jobs
    content: "Phase 8: Implement scheduled jobs (daily query aggregation, auto-synonym suggestions)"
    status: pending
  - id: search-admin-ui
    content: "Phase 9: Build admin UI (search analytics page, synonym manager, boost editor)"
    status: pending
  - id: search-swedish
    content: "Phase 10: Add Swedish language synonym seed data and stemming support"
    status: pending
  - id: search-tests
    content: "Phase 11: Write Vitest tests and README"
    status: pending
isProject: false
---

# Intelligence Search

P3 priority. Search analytics and intelligence layer on top of Medusa's search. Synonym management, popularity ranking, zero-result detection. Swedish language focus.

**Docs:** [docs/plugins/intelligence.md](docs/plugins/intelligence.md)
**Package:** `@peyya/medusa-plugin-search-intelligence` in `packages/plugin-search-intelligence/`
**Depends on:** `@peyya/medusa-plugin-analytics` (for search event data)

---

## Phase 1 -- Scaffold

```
packages/plugin-search-intelligence/
  src/
    modules/searchIntelligence/
      models/
        search-synonym.ts
        search-query.ts
        search-boost.ts
      service.ts
      index.ts
    workflows/
      steps/
        log-search-query.ts
      aggregate-queries.ts
      suggest-synonyms.ts
    api/
      store/search/
        suggest/route.ts          # Autocomplete suggestions
        synonyms/route.ts         # Resolve synonyms for term
      admin/search/
        queries/route.ts          # Top queries with metrics
        zero-results/route.ts     # Queries with no results
        synonyms/route.ts         # CRUD synonyms
        boosts/route.ts           # CRUD boost rules
    subscribers/
      search-performed.ts
    jobs/
      daily-query-aggregation.ts
      auto-synonym-suggestions.ts
    admin/
      routes/search-intelligence/page.tsx
      widgets/search-analytics.tsx
  package.json
  README.md
```

---

## Phase 2 -- Data Models

```typescript
// search-synonym.ts
const SearchSynonym = model.define("search_synonym", {
  id: model.id().primaryKey(),
  term: model.text(),              // "tröja"
  synonyms: model.json(),          // ["sweater", "jumper", "pullover"]
  language: model.text().default("sv"),
  is_auto_suggested: model.boolean().default(false),
})

// search-query.ts
const SearchQuery = model.define("search_query", {
  id: model.id().primaryKey(),
  query: model.text(),
  result_count: model.number(),
  click_count: model.number().default(0),
  search_count: model.number().default(1),
  last_searched_at: model.dateTime(),
})

// search-boost.ts
const SearchBoost = model.define("search_boost", {
  id: model.id().primaryKey(),
  query_pattern: model.text(),     // Exact match or wildcard
  product_id: model.text(),
  boost_score: model.float(),      // Multiplier
  active: model.boolean().default(true),
})
```

---

## Phase 3 -- Service

Key methods:

- `resolveSynonyms(term, language)` -- expand search term with synonyms
- `logSearchQuery(query, resultCount)` -- track search performance
- `getTopQueries(limit, period)` -- ranked by search count
- `getZeroResultQueries(limit, period)` -- queries returning no results
- `suggestSynonyms()` -- auto-detect synonym candidates from query patterns

---

## Phase 4 -- Store API

- `GET /store/search/suggest?q=trö` -- autocomplete based on popular queries
- `GET /store/search/synonyms?term=tröja` -- resolve synonyms (storefront can expand search)

---

## Phase 5 -- Admin API

- `GET /admin/search/queries?period=30d&limit=50` -- top queries with click-through rates
- `GET /admin/search/zero-results?period=30d` -- opportunity: queries with no results
- `POST /admin/search/synonyms` -- create synonym mapping
- `GET/PUT/DELETE /admin/search/synonyms/:id`
- `POST /admin/search/boosts` -- create boost rule
- `GET/PUT/DELETE /admin/search/boosts/:id`

---

## Phase 6 -- Swedish Language

Seed data with common Swedish e-commerce synonyms:

| Term       | Synonyms                              |
| ---------- | ------------------------------------- |
| tröja      | sweater, jumper, pullover             |
| byxor      | pants, trousers                       |
| skor       | shoes, footwear                       |
| jacka      | jacket, coat, ytterkläder             |
| väska      | bag, handväska, ryggsäck              |

Auto-synonym suggestions use query co-occurrence patterns to suggest new mappings.

---

## Phase 7 -- Consumer Configuration

```typescript
module.exports = defineConfig({
  plugins: [{
    resolve: "@peyya/medusa-plugin-search-intelligence",
    options: {
      language: "sv",
      autoSynonymSuggestions: true,
      seedSwedishSynonyms: true,
    },
  }],
})
```

---

## Key Decisions

- **Module name:** `searchIntelligence` (camelCase)
- **Synonym layer** -- works alongside any search provider (Algolia, MeiliSearch, native); resolves synonyms before passing to search engine
- **Zero-result detection** -- key for merchandising; admin sees what customers search for but can't find
- **Swedish-first** -- default language "sv", Swedish seed data, but extensible to any language
