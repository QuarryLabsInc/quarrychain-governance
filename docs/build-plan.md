# Build Plan

Source specs: `QuarryChain DPoS Governance VibeCode Prompt.docx` (original) and
`QuarryChain Testnet Phase 6 Instructions.docx` (**authoritative** — supersedes
the first, and ships reference React/Tailwind source for each module).

Scope: **frontend only.** Backend is plugged in by the QuarryChain dev against
the provider interface — see [integration.md](integration.md).

## Phase 0 — Scaffold
- [x] Next.js 16 + TS strict + Tailwind 4 + pnpm
- [x] Design tokens pinned to the spec palette (light-only fintech)
- [x] Inter + JetBrains Mono via next/font
- [x] Sticky header with blue/black brand lockup + Governance/Voting nav
- [x] Provider/adapter seam (`DataProvider`) + mock implementation
- [x] Domain types (`src/lib/types.ts`) as the frontend/backend contract
- [x] Chain constants from live testnet interrogation (chain-id 1129)
- [x] Restarted testnet: chain 13133 + Cosmos EVM staking ABI (2026-11-05)
- [x] Mock registry: 21 active + 4 candidates, 2 flagged as real IONOS nodes
- [x] Real EVM-RPC node probe for onboarding "Check Connection"
- [x] `docs/integration.md` handoff guide
- [x] Brand logo + 3D coin sourced from quarrychain-web (nav logo + governance hero)
- [ ] Remaining featured-miner icons + hero graphics (aloha-blocks/greymass/carpenter) still needed

## Theming (added 2026-07-20, overrides the spec's "light only")
- [x] Semantic tokens split into `:root` (light) / `.dark` (dark)
- [x] Dark palette inherited from quarrychain-web
- [x] Header toggle, persisted to localStorage, defaults to OS preference
- [x] Pre-paint init script — no flash of the wrong theme
- [x] Re-audit each new module in both themes as it ships

## Phase 1 — Module A: Governance Dashboard
- [x] Network topology widget (real IONOS nodes only; AWS shown as supported, not live)
- [x] Sortable registry table (all 12 columns per spec)
- [x] `useNodeTelemetry` hook — block-height ticker + per-row green flash
- [x] Latency / uptime micro-fluctuation simulation
- [x] Featured miners emphasised, with icon assets + initials fallback

## Phase 2 — Module B: Voting & Yield Portal
- [x] 4-step wizard: Freeze → Select → Cast → Manage
- [x] Energy / Bandwidth derivation from frozen QRY
- [x] Miner selection grid
- [x] Vote confirmation step (wallet signature deferred to Phase 6)
- [x] `[Vote Out]` revoke/unstake path
- [x] Live earnings odometer (6dp, 100ms tick)
- [x] Auto-compounding toggle + spec-exact tooltip copy
- [x] Dynamic APY window

## Phase 3 — Miner Detail Pages
- [x] `/governance/[id]` profile: header, wallet address, stats sidebar
- [x] Featured content for DRMZ / Hydro Ocean / Carpenter Union
- [x] Prominent Vote/Delegate CTA
- [x] One-click delegate deep-link (`/voting?miner=<id>`) + copy-link button
- [x] Pinned campaign notice on the public profile
- [x] SSG via `generateStaticParams`; 404 on unknown miner

## Phase 4a — Module C: Onboarding Wizard
- [x] "Become a Miner" wizard: profile → infra config → collateral lockup
- [x] Node command block (per AWS / IONOS / bare metal), with a visible caveat
      that image name + genesis URL are unconfirmed
- [x] `[Check Connection]` wired to the real EVM-RPC probe — verified against
      the live testnet, a wrong-chain node, and an unreachable host
- [x] ~~500,000 QRY self-bond step + candidacy submission~~ → replaced by Phase 4c

## Phase 4c — Real onboarding (added 2026-10-13, `onboarding-requirement.txt`)
- [x] Self-bond floor 10,000 QRY (native, not the bridged ERC-20)
- [x] Real `createValidator` via the staking precompile, signed by the connected wallet
- [x] Pre-flight simulation surfaces chain errors before the wallet prompts
- [x] Balance gate: disabled + "Insufficient QRY balance" under 10,000; failed reads shown as failures
- [x] Profile & Branding persisted on-chain (Description + socials trailer)
- [x] `/governance/<0x address>` profile read from chain for onboarded validators
- [x] Peer ID validated as CometBFT node ID; consensus key validated + checked for reuse
- [x] Deployment command per host (firewall step), credential helper, 5s RPC timeout
- [x] Supabase store (chain = source of truth) — backend repo `quarrychain-governance-backend`, table + RLS + `register-profile` deployed
- [x] `submitApplication` signs + calls `register-profile`; retry on the success screen
- [x] `/governance` "Registered On-Chain" list from the mirror; profile page merges logo/host, chain wins
- [ ] `upload-logo`, `update-offchain`, `sync-validators` Edge Functions
- [ ] Hide `rpc_endpoint` / `node_peer_id` from anon reads (column-level grants)
- [ ] Faucet URL for the insufficient-balance message
- [ ] Logo upload (spec'd in the Gemini notes; Step 1 UI was to stay unchanged)
- [ ] Wire `/miner` to the connected wallet's on-chain validator (still dev harness)
- [ ] End-to-end test with a funded wallet (RPC cert renewed 2026-10-21 — unblocked)
- [x] Entry points: header CTA + topology onboarding cards

## Phase 4b — Module C: Validator Personal Dashboard
- [x] `/miner` route
- [x] Access gate: registered miners only, else "Access Denied" + onboarding link
- [x] Validator personal dashboard, sidebar nav (5 workspaces)
- [x] Server telemetry panel, self-bond locker, commission slider
- [x] Campaign hub (profile editor + pinned announcement)
- [x] Validator governance panel (Aye / Nay / Abstain), elected-only
- [x] Block production telemetry + QRY yield ticker
- [ ] Replace the dev harness with real wallet identity (Phase 6)

## Phase 5 — Module D: QuarryLabs Admin Console
- [x] Gated admin surface (cosmetic harness) + "PHASE 1 MANUAL CONTROL" badge
- [x] Pending candidate approvals (`[Approve & Authorize]`)
- [x] Emergency terminal: `[Jail Node]` / `[Slash & Evict]`
- [x] Infraction presets (2% / 30% / 100%) + custom penalty slider with
      override warning
- [x] Dynamic burn calculator + type-to-confirm destructive action
- [x] Status dots (producing / missed / jailed / evicted)
- [ ] Replace cosmetic gate with real wallet + server-side authorisation (Phase 6)

## Explorer (added 2026-07-20 — not in the reference docs)
Scope escalated from "theme Blockscout" to "build a custom explorer" at the
project owner's request: it needed to look like the ecosystem, not a recoloured
third-party app.
- [x] Live Blockscout REST client (`src/lib/explorer/blockscout.ts`)
- [x] Overview: stats, latest blocks, latest transactions, search
- [x] Block / transaction / address detail pages
- [x] Block and transaction list pages
- [x] Explorer added to the primary nav
- [x] Governance topology + height now read the real chain instead of constants
- [ ] Pagination beyond the API's default page
- [ ] Token transfers / contract verification views
- `docs/explorer-theme.md` retained — still useful if they also want the
  upstream Blockscout instance brand-matched

## Governance Transition diagram (recovered from an embedded image)
- [x] Phase 1/2/3 maturity stepper with per-phase security + governance model
- [x] Change-path flow diagram, inactive paths dimmed per phase
- [ ] Confirm Phase 1 and Phase 3 wording with the protocol team — the source
      image only pinned down Phase 2

## Phase 6 — Real Seams & Polish
- [ ] RainbowKit wallet connect (role gating: voter / candidate / miner / admin)
- [ ] Live block height from public RPC (`NEXT_PUBLIC_DATA_MODE=live` partial)
- [ ] Candidate standings page
- [x] Responsive + reduced-motion audit
- [x] Accessibility pass on tables, modals, and the wizard

## Open Items
1. Brand assets — logo + 3 featured icons + 2 hero graphics (owed by the project owner)
2. Node artifact name/version, genesis, seed peers (owed by chain team)
3. Cosmos REST / CometBFT RPC exposure (owed by chain team)
4. Staking denom + min-self-delegation param
5. Is `create-validator` permissioned in Phase 1?
6. Energy/Bandwidth — real module or presentational metaphor?
