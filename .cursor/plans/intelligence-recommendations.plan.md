---
name: Intelligence Recommendations
overview: Build @peyya/medusa-plugin-recommendations -- product recommendation engine with collaborative filtering, content-based, trending, and rule-based algorithms.
todos:
  - id: recs-scaffold
    content: "Phase 1: Scaffold packages/plugin-recommendations/ -- plugin directory structure"
    status: pending
  - id: recs-models
    content: "Phase 2: Define data models (RecommendationModel, ProductSimilarity, CustomerProductScore)"
    status: pending
  - id: recs-service
    content: "Phase 3: Implement RecommendationsModuleService with algorithm dispatching"
    status: pending
  - id: recs-module
    content: "Phase 4: Create Module('recommendations', { service }) export"
    status: pending
  - id: recs-algorithms
    content: "Phase 5: Implement algorithms (collaborative filtering, content-based, trending, rule-based)"
    status: pending
  - id: recs-workflows
    content: "Phase 6: Implement workflows (train-model, compute-similarities, update-trending)"
    status: pending
  - id: recs-store-api
    content: "Phase 7.1: Implement store API (product/:id recs, customer recs, trending, cross-sell)"
    status: pending
  - id: recs-admin-api
    content: "Phase 7.2: Implement admin API (model status, trigger training, config)"
    status: pending
  - id: recs-jobs
    content: "Phase 8: Implement scheduled jobs (weekly model retraining, daily trending update)"
    status: pending
  - id: recs-admin-ui
    content: "Phase 9: Build admin UI (recommendations dashboard, product detail widget)"
    status: pending
  - id: recs-links
    content: "Phase 10: Create module links to Product and Customer modules"
    status: pending
  - id: recs-tests
    content: "Phase 11: Write Vitest tests and README"
    status: pending
isProject: false
---

# Intelligence Recommendations

P2 priority. Product recommendations using multiple algorithms. Depends on Analytics for behavioral data and optionally on Customer Segments for personalization.

**Docs:** [docs/plugins/intelligence.md](docs/plugins/intelligence.md)
**Package:** `@peyya/medusa-plugin-recommendations` in `packages/plugin-recommendations/`
**Depends on:** `@peyya/medusa-plugin-analytics`, optionally `@peyya/medusa-plugin-customer-segments`

---

## Phase 1 -- Scaffold

```
packages/plugin-recommendations/
  src/
    modules/recommendations/
      models/
        recommendation-model.ts
        product-similarity.ts
        customer-product-score.ts
      service.ts
      index.ts
      algorithms/
        collaborative.ts
        content-based.ts
        trending.ts
        rule-based.ts
    workflows/
      steps/
        compute-similarities.ts
        score-products.ts
      train-model.ts
      update-trending.ts
    api/
      store/recommendations/
        product/[id]/route.ts     # "Also bought" / similar
        customer/route.ts         # Personalized (auth required)
        trending/route.ts         # Trending products
        cross-sell/route.ts       # Cart-based cross-sell
      admin/recommendations/
        status/route.ts
        train/route.ts
        config/route.ts
    jobs/
      weekly-retrain.ts
      daily-trending.ts
    admin/
      routes/recommendations/page.tsx
      widgets/product-recommendations.tsx
    links/
      product-similarity.ts
  package.json
  README.md
```

---

## Phase 2 -- Data Models

```typescript
// recommendation-model.ts
const RecommendationModel = model.define("recommendation_model", {
  id: model.id().primaryKey(),
  algorithm: model.text(),        // "collaborative", "content-based", "trending"
  trained_at: model.dateTime(),
  product_count: model.number(),
  status: model.text(),           // "training", "ready", "failed"
  metadata: model.json().default({}),
})

// product-similarity.ts
const ProductSimilarity = model.define("product_similarity", {
  id: model.id().primaryKey(),
  source_product_id: model.text(),
  target_product_id: model.text(),
  score: model.float(),           // 0.0 to 1.0
  algorithm: model.text(),
})

// customer-product-score.ts
const CustomerProductScore = model.define("customer_product_score", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  product_id: model.text(),
  score: model.float(),
  algorithm: model.text(),
})
```

---

## Phase 3 -- Algorithms

### Collaborative filtering
"Customers who bought X also bought Y" -- co-purchase matrix from analytics purchase events.

### Content-based
Similar products by category, attributes, price range -- uses product metadata, no behavioral data needed.

### Trending
Products with highest velocity (views + purchases in last N days) -- from analytics events.

### Rule-based
Manual rules configured by admin (e.g., "always recommend accessory Y with product X").

---

## Phase 4 -- Store API

- `GET /store/recommendations/product/:id` -- similar/also-bought products
- `GET /store/recommendations/customer` -- personalized (requires auth)
- `GET /store/recommendations/trending` -- trending products (public)
- `GET /store/recommendations/cross-sell?cart_id=...` -- cart-based suggestions

All endpoints return `{ products: [...], algorithm: "collaborative", model_id: "..." }`.

---

## Phase 5 -- Scheduled Jobs

- **Weekly retrain** -- recalculate ProductSimilarity and CustomerProductScore tables from analytics data
- **Daily trending** -- refresh trending product scores

---

## Phase 6 -- Consumer Configuration

```typescript
module.exports = defineConfig({
  plugins: [{
    resolve: "@peyya/medusa-plugin-recommendations",
    options: {
      algorithm: "collaborative-filtering",
      maxRecommendations: 12,
      trendingWindow: 7,       // days
      retrainSchedule: "weekly",
    },
  }],
})
```

---

## Key Decisions

- **Pre-computed scores** -- recommendations computed offline, served from DB; not computed on request
- **Multiple algorithms** -- admin chooses default; API can request specific algorithm
- **Module name:** `recommendations` (camelCase)
- **Graceful without analytics** -- content-based algorithm works with product data alone
