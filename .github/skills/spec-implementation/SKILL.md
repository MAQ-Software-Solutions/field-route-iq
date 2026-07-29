---
name: spec-implementation
description: "Implement SPEC.md challenge modules (priceOrder, auditAccounts, settleRoute) with multi-agent decomposition, strict rule-traceability, and final lint/build/test validation."
argument-hint: "Optional scope hint, e.g. pricing only | audit only | settlement only | all"
---

# SPEC Implementation Workflow

Use this skill when you need to implement or refine the challenge modules defined in `SPEC.md`:

- `src/pricing/engine.ts` → `priceOrder`
- `src/audit/shelfAudit.ts` → `auditAccounts`
- `src/settlement/settle.ts` → `settleRoute`

## Procedure

1. Read `SPEC.md`, `README.md`, `RULES.md`, and `src/data/index.ts`.
2. Split work with subagents by domain:
   - Pricing rules and tie-breakers
   - Shelf audit scoring/trend/recency rules
   - Settlement aggregation and commission rules
3. Implement modules with strict fidelity to spec:
   - Inclusive date windows
   - One line promo per line; one threshold promo per order
   - Spec-defined tie-breakers and error messages
   - Half-up 2-decimal money rounding and clamping rules
4. Keep data access through typed loaders in `src/data/index.ts` (no direct JSON reads).
5. Ensure settlement reuses `priceOrder` from `../pricing/engine`.
6. Validate with existing project commands:
   - `npm run lint`
   - `npm run build`
   - `npm run test`

## Output expectations

- Implemented modules compile cleanly.
- Behavior aligns with `SPEC.md` (source of truth).
- No unrelated refactors or edits to canonical data fixtures.
