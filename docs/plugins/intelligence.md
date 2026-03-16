# Intelligence — Category Plan

Commerce intelligence plugins for Medusa v2. Unlike providers, these are **custom modules** that create new domain concepts with their own data models, workflows, API routes, admin UI, and scheduled jobs.

Inspired by Hello Retail and the mParts Intelligence/Signals/Engage architecture.

## Plugins

| Plugin | Package | Status | Priority |
|--------|---------|--------|----------|
| **Analytics** | `@peyya/medusa-plugin-analytics` | Planned | P1 — Foundation for all intelligence |
| **Customer Segments** | `@peyya/medusa-plugin-customer-segments` | Planned | P2 — Depends on analytics |
| **Recommendations** | `@peyya/medusa-plugin-recommendations` | Planned | P2 — Depends on analytics + segments |
| **Search Intelligence** | `@peyya/medusa-plugin-search-intelligence` | Planned | P3 — Depends on analytics |

## Architecture Pattern

Intelligence plugins are **custom modules**, not module providers:

```
packages/plugin-{name}/
├── src/
│   ├── modules/
│   │   └── {name}/
│   │       ├── models/             # Data models (database tables)
│   │       │   └── *.ts
│   │       ├── service.ts          # extends MedusaService
│   │       └── index.ts            # Module(...) export
│   ├── workflows/
│   │   ├── steps/
│   │   │   └── *.ts                # Individual workflow steps
│   │   └── *.ts                    # Workflow compositions
│   ├── api/
│   │   ├── store/                  # Public store API routes
│   │   └── admin/                  # Admin API routes
│   ├── subscribers/                # Event subscribers
│   ├── jobs/                       # Scheduled jobs
│   ├── admin/                      # Admin UI extensions
│   │   ├── widgets/
│   │   └── routes/
│   └── links/                      # Module links to Medusa core modules
├── package.json
├── tsconfig.json
└── README.md
```

### Consumer Configuration

```typescript
module.exports = defineConfig({
  plugins: [
    {
      resolve: "@peyya/medusa-plugin-analytics",
      options: {
        retentionDays: 90,
        trackingEnabled: true,
      },
    },
    {
      resolve: "@peyya/medusa-plugin-recommendations",
      options: {
        algorithm: "collaborative-filtering",
        maxRecommendations: 12,
      },
    },
  ],
})
```

## Plugin Details

### Analytics (Foundation)

The analytics plugin is the **data foundation** for all other intelligence plugins. It captures behavioral events and provides aggregated insights.

**Data Models:**
- `AnalyticsEvent` — Raw events (page_view, product_view, add_to_cart, purchase, search)
- `ProductPerformance` — Aggregated product metrics (views, conversions, revenue)
- `SessionSummary` — Aggregated session data

**API Routes (Store):**
- `POST /store/analytics/events` — Track event from storefront
- `GET /store/analytics/popular-products` — Public popular products endpoint

**API Routes (Admin):**
- `GET /admin/analytics/dashboard` — Aggregated metrics
- `GET /admin/analytics/products/:id/performance` — Product performance data
- `GET /admin/analytics/trends` — Sales and traffic trends

**Subscribers:**
- `order.placed` → Record purchase events
- `cart.updated` → Record cart events

**Scheduled Jobs:**
- Daily aggregation of raw events into performance summaries
- Cleanup of events older than retention period

**Admin UI:**
- Dashboard widget with key metrics (revenue, orders, conversion rate)
- Product performance page

### Customer Segments

Automatic customer segmentation based on behavioral data from the analytics plugin.

**Data Models:**
- `Segment` — Segment definition (name, rules/criteria)
- `SegmentMembership` — Customer-to-segment mapping
- `SegmentRule` — Rule conditions (purchase frequency, AOV, recency, category affinity)

**Module Links:**
- Links to Medusa `Customer` module

**API Routes (Admin):**
- `POST /admin/segments` — Create segment with rules
- `GET /admin/segments` — List segments with counts
- `GET /admin/segments/:id/customers` — Customers in segment
- `POST /admin/segments/:id/recalculate` — Trigger recalculation

**Scheduled Jobs:**
- Periodic segment recalculation (evaluate rules against customer data)

**Admin UI:**
- Segment management page (create, edit, view members)
- Customer detail widget showing segment membership

**Predefined Segments (Swedish market):**
- VIP (top 10% by revenue)
- At Risk (previously active, no purchase in 60 days)
- New Customers (first purchase in last 30 days)
- Repeat Buyers (3+ orders)
- High AOV (average order > X SEK)

### Recommendations

Product recommendation engine using collaborative filtering, content-based, and rule-based approaches.

**Data Models:**
- `RecommendationModel` — Trained model metadata
- `ProductSimilarity` — Pre-computed product-to-product similarity scores
- `CustomerProductScore` — Pre-computed customer-to-product affinity scores

**Module Links:**
- Links to Medusa `Product` and `Customer` modules

**API Routes (Store):**
- `GET /store/recommendations/product/:id` — "Customers also bought" / similar products
- `GET /store/recommendations/customer` — Personalized recommendations (requires auth)
- `GET /store/recommendations/trending` — Trending products
- `GET /store/recommendations/cross-sell?cart_id=...` — Cart-based cross-sell

**API Routes (Admin):**
- `GET /admin/recommendations/status` — Model training status
- `POST /admin/recommendations/train` — Trigger model retraining
- `GET /admin/recommendations/config` — Algorithm settings

**Scheduled Jobs:**
- Weekly model retraining (recalculate similarities from analytics data)
- Daily trending products update

**Admin UI:**
- Recommendations dashboard (model health, coverage, performance)
- Product detail widget ("recommended with this product")

**Algorithms:**
1. **Collaborative filtering** — "Customers who bought X also bought Y"
2. **Content-based** — Similar products by category, attributes, price range
3. **Trending** — Products with highest velocity (views/purchases in last N days)
4. **Rule-based** — Manual rules (e.g., always recommend accessory Y with product X)

### Search Intelligence

Intelligent search with synonym management, popularity ranking, and search analytics.

**Data Models:**
- `SearchSynonym` — Synonym mappings (e.g., "tröja" → "sweater", "jumper")
- `SearchQuery` — Search query log with results count, click-through
- `SearchBoost` — Manual boost rules for specific queries

**API Routes (Store):**
- `GET /store/search/suggest` — Autocomplete suggestions based on popular queries
- `GET /store/search/synonyms` — Resolve synonyms for a search term

**API Routes (Admin):**
- `GET /admin/search/queries` — Top search queries with metrics
- `GET /admin/search/zero-results` — Queries with zero results (opportunity)
- `POST /admin/search/synonyms` — Manage synonym mappings
- `POST /admin/search/boosts` — Manage boost rules

**Subscribers:**
- Product search events from analytics → update query stats

**Scheduled Jobs:**
- Daily aggregation of search query performance
- Auto-suggest synonym candidates based on query patterns

**Admin UI:**
- Search analytics page (top queries, zero-result queries)
- Synonym management interface
- Boost rule editor

## Dependencies Between Plugins

```
plugin-analytics (foundation)
├── plugin-customer-segments (reads analytics events)
├── plugin-recommendations (reads analytics events + segments)
└── plugin-search-intelligence (reads search events from analytics)
```

Analytics is the **required foundation**. Other plugins should gracefully degrade if analytics is not installed, but provide full functionality when it is.

## Swedish Market Specifics

- Default currency: SEK
- Swedish language synonyms in search intelligence
- Swedish holiday patterns in trending/recommendations (Midsommar, Jul, etc.)
- Swedish-localized admin UI labels
- GDPR compliance: anonymization of analytics data after retention period
