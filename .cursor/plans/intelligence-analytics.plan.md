---
name: Intelligence Analytics
overview: Build @peyya/medusa-plugin-analytics -- behavioral event tracking, product performance, and session analytics as the data foundation for all intelligence plugins.
todos:
  - id: analytics-scaffold
    content: "Phase 1: Scaffold packages/plugin-analytics/ -- package.json, plugin directory structure with modules/workflows/api/subscribers/jobs/admin"
    status: pending
  - id: analytics-models
    content: "Phase 2: Define data models (AnalyticsEvent, ProductPerformance, SessionSummary)"
    status: pending
  - id: analytics-service
    content: "Phase 3: Implement AnalyticsModuleService extending MedusaService with custom query methods"
    status: pending
  - id: analytics-module
    content: "Phase 4: Create Module('analytics', { service }) export"
    status: pending
  - id: analytics-workflows
    content: "Phase 5: Implement workflows (track-event, aggregate-performance, cleanup-old-events)"
    status: pending
  - id: analytics-store-api
    content: "Phase 6.1: Implement store API routes (POST /store/analytics/events, GET /store/analytics/popular-products)"
    status: pending
  - id: analytics-admin-api
    content: "Phase 6.2: Implement admin API routes (GET /admin/analytics/dashboard, products/:id/performance, trends)"
    status: pending
  - id: analytics-subscribers
    content: "Phase 7: Implement subscribers (order.placed, cart.updated → record events)"
    status: pending
  - id: analytics-jobs
    content: "Phase 8: Implement scheduled jobs (daily aggregation, retention cleanup)"
    status: pending
  - id: analytics-admin-ui
    content: "Phase 9: Build admin UI (dashboard widget, product performance page)"
    status: pending
  - id: analytics-links
    content: "Phase 10: Create module links to Product and Customer modules"
    status: pending
  - id: analytics-tests
    content: "Phase 11: Write Vitest tests and README"
    status: pending
isProject: false
---

# Intelligence Analytics

P1 priority. The **data foundation** for all intelligence plugins. Captures behavioral events from storefront and Medusa core, aggregates into actionable metrics.

**Docs:** [docs/plugins/intelligence.md](docs/plugins/intelligence.md)
**Package:** `@peyya/medusa-plugin-analytics` in `packages/plugin-analytics/`

---

## Phase 1 -- Scaffold

This is a **custom module**, not a module provider. Different directory structure:

```
packages/plugin-analytics/
  src/
    modules/analytics/
      models/
        analytics-event.ts
        product-performance.ts
        session-summary.ts
      service.ts               # extends MedusaService
      index.ts                 # Module("analytics", { service })
    workflows/
      steps/
        track-event.ts
        aggregate-performance.ts
      track-event.ts
      aggregate-daily.ts
    api/
      store/analytics/
        events/route.ts        # POST /store/analytics/events
        popular-products/route.ts
      admin/analytics/
        dashboard/route.ts
        products/[id]/performance/route.ts
        trends/route.ts
    subscribers/
      order-placed.ts
      cart-updated.ts
    jobs/
      daily-aggregation.ts
      retention-cleanup.ts
    admin/
      widgets/
        dashboard-metrics.tsx
      routes/
        analytics/page.tsx
    links/
      product-performance.ts
  package.json
  tsconfig.json
  README.md
```

### package.json

```json
{
  "name": "@peyya/medusa-plugin-analytics",
  "version": "0.0.1",
  "description": "Behavioral analytics and product performance for Medusa v2",
  "keywords": ["medusa-v2", "medusa-plugin-integration", "medusa-plugin-other"],
  "devDependencies": {
    "@medusajs/framework": "^2.5.0",
    "@medusajs/medusa": "^2.5.0",
    "@medusajs/cli": "^2.5.0",
    "@swc/core": "^1.5.7"
  },
  "peerDependencies": {
    "@medusajs/framework": "^2.5.0",
    "@medusajs/medusa": "^2.5.0"
  }
}
```

---

## Phase 2 -- Data Models

```typescript
// analytics-event.ts
const AnalyticsEvent = model.define("analytics_event", {
  id: model.id().primaryKey(),
  event_type: model.text(),         // "page_view", "product_view", "add_to_cart", "purchase", "search"
  session_id: model.text(),
  customer_id: model.text().nullable(),
  product_id: model.text().nullable(),
  data: model.json().default({}),   // Event-specific payload
  created_at: model.dateTime(),
})

// product-performance.ts
const ProductPerformance = model.define("product_performance", {
  id: model.id().primaryKey(),
  product_id: model.text(),
  date: model.dateTime(),           // Aggregation date
  views: model.number().default(0),
  add_to_carts: model.number().default(0),
  purchases: model.number().default(0),
  revenue: model.bigNumber().default(0),
  conversion_rate: model.float().default(0),
})

// session-summary.ts
const SessionSummary = model.define("session_summary", {
  id: model.id().primaryKey(),
  session_id: model.text(),
  customer_id: model.text().nullable(),
  started_at: model.dateTime(),
  ended_at: model.dateTime().nullable(),
  page_views: model.number().default(0),
  products_viewed: model.number().default(0),
  added_to_cart: model.boolean().default(false),
  purchased: model.boolean().default(false),
})
```

---

## Phase 3 -- Service

Extends `MedusaService` with custom aggregation and query methods:

- `trackEvent(eventData)` -- write raw event
- `getProductPerformance(productId, dateRange)` -- aggregated metrics
- `getDashboardMetrics(dateRange)` -- overview metrics (revenue, orders, conversion)
- `getTrends(metric, dateRange, granularity)` -- time-series data
- `getPopularProducts(limit)` -- ranked by views/purchases

---

## Phase 4 -- Module Export

```typescript
import { Module } from "@medusajs/framework/utils"
import AnalyticsModuleService from "./service"

export default Module("analytics", {
  service: AnalyticsModuleService,
})
```

Module name: `analytics` (camelCase, no dashes).

---

## Phase 5 -- Workflows

- **track-event** -- validate event → persist to AnalyticsEvent table → update session
- **aggregate-daily** -- query raw events for date range → compute ProductPerformance → upsert

---

## Phase 6 -- API Routes

### Store (public)

- `POST /store/analytics/events` -- track event from storefront (rate-limited)
- `GET /store/analytics/popular-products` -- public popular products list

### Admin

- `GET /admin/analytics/dashboard` -- key metrics (revenue, orders, conversion, sessions)
- `GET /admin/analytics/products/:id/performance` -- per-product metrics
- `GET /admin/analytics/trends?metric=revenue&period=30d` -- time-series

---

## Phase 7 -- Subscribers

- `order.placed` → record purchase event for all items in order
- `cart.updated` → record add_to_cart events

---

## Phase 8 -- Scheduled Jobs

- **Daily aggregation** -- runs at midnight, aggregates yesterday's raw events into ProductPerformance
- **Retention cleanup** -- delete raw events older than `retentionDays` (configurable, default 90)

---

## Phase 9 -- Admin UI

- **Dashboard widget** -- key metrics card (today's revenue, orders, conversion rate)
- **Analytics page** -- time-series charts, product performance table

---

## Phase 10 -- Consumer Configuration

```typescript
module.exports = defineConfig({
  plugins: [{
    resolve: "@peyya/medusa-plugin-analytics",
    options: {
      retentionDays: 90,
      trackingEnabled: true,
    },
  }],
})
```

---

## Key Decisions

- **Raw events + aggregated views** -- raw events for flexibility, pre-computed aggregations for performance
- **Session-based tracking** -- sessions tie events together (anonymous or authenticated)
- **GDPR compliance** -- retention period with auto-cleanup, anonymization after period
- **Foundation for other plugins** -- Customer Segments, Recommendations, and Search Intelligence read from analytics data
