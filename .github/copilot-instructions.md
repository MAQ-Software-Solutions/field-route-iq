# Copilot instructions for `field-route-iq`

## Build, test, and lint

Use npm scripts from `package.json`:

```bash
npm run dev
npm run build
npm run lint
npm run test
```

Run a single test file:

```bash
npm run test -- src/App.test.tsx
```

Run a single test by name:

```bash
npm run test -- -t "renders the dashboard"
```

Harness run command (challenge workflow):

```bash
node agent-run.mjs --model <model-name>
```

## High-level architecture

- This is a client-only React + TypeScript + Vite app (`src/main.tsx`, `src/App.tsx`) using `react-router-dom` routes for dashboard, routes, accounts, promotions, visits, and order capture.
- Domain data is static JSON in `src/data/*.json`, but app code should consume it only through typed loader helpers in `src/data/index.ts` (`getProducts`, `getAccounts`, `getPromotions`, `getRoutes`, `getVisits`, etc.).
- The order flow is local-first: `src/pages/OrderPage.tsx` builds a priced payload and persists it via `src/state/orders.ts` to `localStorage` (`friq.orders` key). `src/pages/VisitsPage.tsx` merges saved orders with visit records into one timeline.
- `src/legacy/*` is historical reference and intentionally not part of current UI imports; treat it as compatibility context, not active app logic.
- This repo is also a challenge harness: the scored work is implementing `priceOrder`, `auditAccounts`, and `settleRoute` per `SPEC.md`, with hidden tests run externally.

## Key conventions for this repo

- **`SPEC.md` is the source of truth** for pricing/audit/settlement behavior. `RULES.md` and `QUICKSTART.md` define challenge constraints and submission flow.
- For challenge work, **do not rely on `docs/NOTES.md` for business rules**; it contains stale/conflicting notes.
- Keep data access centralized through `src/data/index.ts`; do not add direct JSON reads in feature code.
- Date handling across the app is date-only ISO strings (`YYYY-MM-DD`) and lexical comparison (`validFrom <= date <= validTo`, etc.).
- Monetary values in UI are shown with two decimals (`toFixed(2)`), and order summary hooks already used by tests are `order-subtotal`, `order-discount`, and `order-total`.
- `src/data/*.json` should be treated as canonical fixtures (challenge rules also freeze/reset them during judging).
- The harness runner uses a fixed implementation prompt (`agent-run.mjs`); steer behavior between runs through `.github/` instructions, prompts, and skills.
