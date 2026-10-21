<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# QuarryChain DPoS Governance Suite

Frontend for QuarryChain's Delegated Proof of Stake governance, validator
onboarding, and network telemetry. **Frontend only** — the QuarryChain dev
plugs the backend in behind the provider interface.

Sibling repos: `quarrychain-ico` (token sale — handed off), `quarrychain-web`
(marketing). This repo shares the brand but no code with either.

## Tech Stack

- Next.js 16 (App Router), TypeScript strict, Tailwind CSS 4, pnpm
- Inter (UI) + JetBrains Mono (block heights, addresses, token amounts)
- No backend, no database, no contracts in this repo

## Critical Rules

### Scope
- **Frontend only.** Never add a backend, DB, or contract here.
- **All data flows through `DataProvider`** (`src/lib/providers/types.ts`).
  Components must never `fetch` directly. This seam is the deliverable.
- **`src/lib/types.ts` is the frontend/backend contract.** Changing a shape
  there is a breaking change for the integrator — update `docs/integration.md`
  in the same commit.

### Honesty of the demo
- **`Validator.isLiveNode` is true only for nodes actually producing blocks**
  (currently the two IONOS nodes). Never flip it to make the network look
  bigger. The topology widget reads it so screenshots can't mislead.
- **Never fake a passing health check.** `checkNodeConnection` makes a real RPC
  call and reports real failures. An operator who trusts a false green will
  ship a broken node.
- Simulated telemetry is fine and intended (the spec asks for it) — but label
  the data source where the user can see it (`NetworkStatus.isLive`).

### Chain facts (verified 2026-07-20)
- Cosmos-SDK + **CometBFT** consensus + EVM module. EVM chain-id **1129**.
- Validators register via Cosmos `create-validator` (ed25519 consensus pubkey +
  native QRY self-delegation of **10,000**, per the 2026-10-13 onboarding
  requirements). **Not** an ERC-20 registry contract, despite the spec's wording.
- The browser sends it through the **staking precompile** at `0x…0800`
  (Evmos v20 ABI, `src/lib/staking.ts`). Staking denom is `aqry` (18 dp,
  same as native EVM QRY). `create-validator` is **not permissioned on-chain**
  (verified 2026-10-13 by simulation).
- Public: EVM JSON-RPC + Blockscout. Not public: Cosmos REST, CometBFT RPC.

### Design
- **Two themes, toggled via a `dark` class on `<html>`.** Light is the Phase 6
  spec's fintech palette; dark inherits quarrychain-web's tokens (`#08080f` /
  `#0f1019` / `#161822`) so the suite matches the main site. The spec says
  "light only" — that was superseded by product direction on 2026-07-20;
  the toggle is a requirement.
- **The DOM class is the source of truth for theme**, not React state. Read it
  via `useTheme()` (`useSyncExternalStore`). Never mirror it into state — an
  inline script sets it pre-hydration, so state would start stale.
- **Brand blue differs per theme:** `#007BFF` light, `#3b82f6` dark. The spec
  blue is harsh on a near-black ground. Both are correct; use the token.
- **Brand lockup:** "Quarry" brand blue, "Chain" `text-ink` (black on light,
  near-white on dark). Always split.
- Use the `@theme` tokens in `globals.css` (`bg-card`, `text-muted`,
  `text-brand`…). Never hardcode hex in components.
- Panels use the shared `Card` primitive: rounded-xl, hairline border, soft shadow.
- Mono font for all numerics — heights, addresses, QRY amounts, percentages.
- Respect `prefers-reduced-motion`; the suite is full of live tickers.

### Security posture
- This is **not** the ICO repo. No geoblock, no KYC, no custody, no PII.
- Admin UI gating is **cosmetic**. Real authorization is the backend's job —
  say so in code comments near any admin surface.

## Session Protocol
- **Before work:** read `docs/build-plan.md` + `docs/changelog.md`
- **After a feature:** update both
- **On `/wrap`:** tick build-plan items, write a dated changelog entry

## Source Specs
- `QuarryChain Testnet Phase 6 Instructions.docx` — **authoritative**; ships
  reference React/Tailwind source per module
- `QuarryChain DPoS Governance VibeCode Prompt.docx` — earlier, superseded
