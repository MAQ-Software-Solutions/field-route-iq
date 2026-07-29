---
description: "Use when implementing, debugging, or reviewing SPEC challenge modules (priceOrder, auditAccounts, settleRoute). Enforces rule-traceable behavior and cross-module consistency."
applyTo: "src/{pricing,audit,settlement}/**/*.ts"
---

# SPEC core module guardrails

- `SPEC.md` is authoritative for all pricing, audit, and settlement behavior.
- Do not use `docs/NOTES.md` for rule decisions.
- Keep data access through typed loaders in `src/data/index.ts`.

## Cross-module consistency requirements

- `settleRoute` must reuse `priceOrder` from `../pricing/engine`.
- Use inclusive promotion windows (`validFrom <= date <= validTo`).
- Apply at most one line-level promotion per line and one threshold promotion per order.
- Use SPEC tie-breakers when discounts are equal:
  1. earlier `validFrom`
  2. lexicographically smaller `id`

## Numeric behavior

- Use half-up rounding to 2 decimals for all money outputs required by SPEC.
- Clamp line `net` and order/route totals at zero where specified.
- Preserve required error messages exactly for validation paths.

## Delivery expectations

- Keep edits scoped to relevant modules.
- Run `npm run lint`, `npm run build`, and `npm run test` after changes.
