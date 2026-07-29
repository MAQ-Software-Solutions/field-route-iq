---
name: "Refine SPEC Modules"
description: "Audit and refine priceOrder, auditAccounts, and settleRoute against SPEC.md with strict rule traceability and full project validation."
argument-hint: "Optional scope: pricing | audit | settlement | all"
agent: "agent"
---

Refine the SPEC challenge modules using this workflow:

1. Read `SPEC.md` first, then `README.md`, `RULES.md`, and `src/data/index.ts`.
2. Focus scope: {{input:Optional scope hint; default all modules}}
3. Validate implementation details and patch any gaps in:
   - `src/pricing/engine.ts`
   - `src/audit/shelfAudit.ts`
   - `src/settlement/settle.ts`
4. Keep behavior rule-traceable to SPEC sections.
5. Preserve exact required error strings and tie-break logic.
6. Run and report:
   - `npm run lint`
   - `npm run build`
   - `npm run test`

Do not add new tooling or direct JSON reads; use existing typed data loaders.
