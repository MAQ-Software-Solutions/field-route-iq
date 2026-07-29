---
name: "Implement SPEC Run"
description: "Implement missing or incomplete SPEC modules in staged runs, with controlled scope and mandatory lint/build/test verification."
argument-hint: "Run scope, e.g. pricing only | audit only | settlement only | all"
agent: "agent"
---

Implement SPEC modules with staged scope control:

- Scope for this run: {{input:Run scope}}
- Read order:
  1. `SPEC.md` (source of truth)
  2. `.github/copilot-instructions.md`
  3. `src/data/index.ts`

Targets:
- `src/pricing/engine.ts` (`priceOrder`)
- `src/audit/shelfAudit.ts` (`auditAccounts`)
- `src/settlement/settle.ts` (`settleRoute`, must call `priceOrder`)

Execution rules:
- Use typed loaders from `src/data/index.ts`; no direct JSON reads.
- Follow SPEC-required rounding, date windows, tie-breakers, and validation errors.
- Keep changes scoped; do not modify unrelated files.

After implementation, run:
- `npm run lint`
- `npm run build`
- `npm run test`
