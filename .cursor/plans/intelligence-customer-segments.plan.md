---
name: Intelligence Customer Segments
overview: Build @peyya/medusa-plugin-customer-segments -- automatic customer segmentation using behavioral data from the analytics plugin with Swedish market presets.
todos:
  - id: segments-scaffold
    content: "Phase 1: Scaffold packages/plugin-customer-segments/ -- plugin directory structure"
    status: pending
  - id: segments-models
    content: "Phase 2: Define data models (Segment, SegmentMembership, SegmentRule)"
    status: pending
  - id: segments-service
    content: "Phase 3: Implement SegmentsModuleService with rule evaluation engine"
    status: pending
  - id: segments-module
    content: "Phase 4: Create Module('customerSegments', { service }) export"
    status: pending
  - id: segments-workflows
    content: "Phase 5: Implement workflows (create-segment, evaluate-rules, recalculate-memberships)"
    status: pending
  - id: segments-admin-api
    content: "Phase 6: Implement admin API routes (CRUD segments, list members, trigger recalculation)"
    status: pending
  - id: segments-subscribers
    content: "Phase 7: Implement subscribers (order.placed → update segment memberships)"
    status: pending
  - id: segments-jobs
    content: "Phase 8: Implement scheduled job (periodic segment recalculation)"
    status: pending
  - id: segments-admin-ui
    content: "Phase 9: Build admin UI (segment management page, customer detail widget)"
    status: pending
  - id: segments-links
    content: "Phase 10: Create module links to Customer module"
    status: pending
  - id: segments-presets
    content: "Phase 11: Implement Swedish market preset segments (VIP, At Risk, New, Repeat, High AOV)"
    status: pending
  - id: segments-tests
    content: "Phase 12: Write Vitest tests and README"
    status: pending
isProject: false
---

# Intelligence Customer Segments

P2 priority. Automatic customer segmentation based on behavioral data. Depends on Analytics plugin for event data.

**Docs:** [docs/plugins/intelligence.md](docs/plugins/intelligence.md)
**Package:** `@peyya/medusa-plugin-customer-segments` in `packages/plugin-customer-segments/`
**Depends on:** `@peyya/medusa-plugin-analytics`

---

## Phase 1 -- Scaffold

```
packages/plugin-customer-segments/
  src/
    modules/customerSegments/
      models/
        segment.ts
        segment-membership.ts
        segment-rule.ts
      service.ts
      index.ts
    workflows/
      steps/
        evaluate-rules.ts
      create-segment.ts
      recalculate-memberships.ts
    api/admin/segments/
      route.ts               # GET, POST
      [id]/route.ts          # GET, PUT, DELETE
      [id]/customers/route.ts
      [id]/recalculate/route.ts
    subscribers/
      order-placed.ts
    jobs/
      recalculate-segments.ts
    admin/
      routes/segments/page.tsx
      widgets/customer-segments.tsx
    links/
      customer-segment.ts
  package.json
  README.md
```

---

## Phase 2 -- Data Models

```typescript
// segment.ts
const Segment = model.define("segment", {
  id: model.id().primaryKey(),
  name: model.text(),
  description: model.text().nullable(),
  is_preset: model.boolean().default(false),
  member_count: model.number().default(0),
})

// segment-rule.ts
const SegmentRule = model.define("segment_rule", {
  id: model.id().primaryKey(),
  segment_id: model.text(),
  field: model.text(),           // "total_orders", "total_revenue", "days_since_last_order", "avg_order_value"
  operator: model.text(),        // "gt", "lt", "gte", "lte", "eq", "between"
  value: model.json(),           // number, string, or [min, max] for between
  conjunction: model.text().default("and"),  // "and" | "or"
})

// segment-membership.ts
const SegmentMembership = model.define("segment_membership", {
  id: model.id().primaryKey(),
  segment_id: model.text(),
  customer_id: model.text(),
  added_at: model.dateTime(),
})
```

---

## Phase 3 -- Rule Evaluation Engine

The service includes a rule evaluator that:

1. Loads all rules for a segment
2. Queries customer data (orders, revenue, recency) from Medusa + analytics
3. Evaluates each rule against each customer
4. AND/OR conjunction logic
5. Updates membership table

---

## Phase 4 -- Module Export

```typescript
export default Module("customerSegments", {
  service: SegmentsModuleService,
})
```

---

## Phase 5 -- API Routes (Admin)

- `GET /admin/segments` -- list all segments with member counts
- `POST /admin/segments` -- create segment with rules
- `GET /admin/segments/:id` -- segment detail with rules
- `PUT /admin/segments/:id` -- update segment rules
- `DELETE /admin/segments/:id` -- delete segment (not presets)
- `GET /admin/segments/:id/customers` -- paginated customer list
- `POST /admin/segments/:id/recalculate` -- trigger manual recalculation

---

## Phase 6 -- Swedish Market Presets

Installed on first run:

| Segment       | Rules                                          |
| ------------- | ---------------------------------------------- |
| VIP           | total_revenue >= top 10% threshold             |
| At Risk       | days_since_last_order >= 60 AND total_orders > 0 |
| New Customers | first_order_date within last 30 days           |
| Repeat Buyers | total_orders >= 3                              |
| High AOV      | avg_order_value > configurable threshold (SEK) |

---

## Phase 7 -- Consumer Configuration

```typescript
module.exports = defineConfig({
  plugins: [{
    resolve: "@peyya/medusa-plugin-customer-segments",
    options: {
      recalculationInterval: "daily",
      highAovThreshold: 1500,    // SEK
      presets: true,
    },
  }],
})
```

---

## Key Decisions

- **Rule-based engine** -- flexible rules, not hardcoded segments; admins can create custom segments
- **Graceful degradation** -- works without Analytics plugin (uses Medusa order data only), but better with analytics event data
- **Module name:** `customerSegments` (camelCase)
