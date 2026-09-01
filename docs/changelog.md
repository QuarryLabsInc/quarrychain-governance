# Changelog

## 2026-09-01 — Featured validator swap: Aloha Blocks / Greymass

Replaced the two placeholder featured validators, DRMZ and Hydro Ocean Energy,
with real block producers per updated content from the team:
- **Aloha Blocks** (`id: aloha-blocks`) — block producer since 2018, also
  builds community research/monitoring tooling. `alohablocks.com`.
- **Greymass** (`id: greymass`) — long-running block producer with
  infrastructure, wallet, dev-tool, and open-source ecosystem work.
  `greymass.com/about`.

Both keep the prior stats (votes, APY, IONOS Frankfurt) and `isLiveNode: true`
— they're standing in for the same two real block-producing nodes, only the
identity/copy changed. Updated the matching wallet-dashboard earnings copy
and the `public/assets/README.md` asset-name table (icon/hero filenames now
`aloha-blocks-*` / `greymass-*`, awaiting real art).

## 2026-07-20 — Session 1i: Responsive + accessibility audit

### Fixed — mobile horizontal overflow
Audited every route at a real 390px viewport (measuring body scrollWidth, not
eyeballing screenshots). Two routes pushed the page sideways:
- **Header** (114px overflow): three nav tabs plus the toggle no longer fit one
  row once Explorer was added. Restructured to a wrapping layout — logo and
  toggle on the top row, nav drops to its own full-width scrollable row below on
  narrow screens, single row at sm+.
- **Miner dashboard** (201px overflow): the sidebar's horizontal scroll row
  forced its grid column to min-content width. Root cause was the mobile grid
  having no explicit `grid-cols-1`, so the column couldn't shrink below content.
  Added `grid-cols-1` (minmax(0,1fr)) + `min-w-0` on the nav, and scoped the
  pills' `w-full` to `lg:` so they aren't full-width in the horizontal row.

All 10 checked routes now report 0 body overflow at 390px, verified per-section
on the miner dashboard.

### Fixed — slash confirmation modal a11y
The most dangerous surface had a broken dialog pattern: focus was never moved
into it, Escape didn't close it, and there was no focus trap — a keyboard or
screen-reader user could be stranded outside an irreversible confirmation.
- New `useDialogA11y` hook: moves focus to the first field on open, traps Tab
  within the dialog, closes on Escape, and restores focus to the trigger on
  close. Applied to the slashing modal.
- Backdrop click cancels; clicks inside the card don't (stopPropagation).

Verified in-browser: focus lands on the type-to-confirm input, Escape closes and
returns focus to the Execute button, card clicks keep it open, and the
type-to-confirm guard still gates the burn.

### Verified — automated a11y basics
Zero images missing alt, zero unnamed buttons, zero unlabelled form controls,
zero unnamed links, single h1 per page. The `prefers-reduced-motion` guard
covers the live tickers. Lint, typecheck, build clean.

### Note on tooling
The in-app browser's viewport resize didn't propagate to `window.innerWidth`
until given explicit pixel dimensions; presets left the media queries reading
desktop. Measured against `matchMedia` to confirm mobile classes were actually
active before trusting any result.

## 2026-07-20 — Session 1h: Governance transition diagram + explorer theme

### Built
- `src/components/governance/GovernanceTransition.tsx` — Phase 1/2/3 governance
  maturity stepper with the protocol-change flow diagram; inactive paths dim per
  phase. Added to the bottom of `/governance`.
- `docs/explorer-theme.md` — Blockscout theme config for the explorer reskin.

### How this was found
A question about the explorer prompted a re-check of the source docs, and the
docx extractor used in Session 1 turned out to be lossy: it read only paragraph
text from `word/document.xml`, silently dropping **embedded images** and
**hyperlink targets** (which live in the `.rels` parts). Re-extracting surfaced
one image in the VibeCode prompt containing the "QuarryChain Governance
Transition" diagram and a "Governance Maturity" stepper — neither of which
appeared anywhere in the extracted text. It also independently confirms the
200,000,000 QRY supply cap.

Lesson: when extracting from a binary document format, enumerate every part
before concluding something is absent. "Not in the text" is not "not in the doc".

### Decisions
- **The explorer reskin is env config, not a fork.** The deployment runs the
  modern Blockscout Next.js frontend, which themes through environment variables
  — network naming, logo, colors, homepage plate, footer links. Forking
  Blockscout to restyle it would mean owning upstream merges forever for a
  cosmetic gain. The doc says so explicitly so nobody reaches for the fork.
- **Env var *keys* are flagged as needing a version check**, while the *values*
  are authoritative. Blockscout has renamed frontend envs across releases, and
  publishing a confident-looking config that silently no-ops would be worse than
  saying "verify against your tag".
- **Phase 1 and Phase 3 are marked as inferred.** The source image only pinned
  down Phase 2 ("Hybrid · Multi-Sig / Soft Voting · Shared Authority"); the
  other two are derived from the diagram's three paths. Flagged in the component
  and the build plan rather than presented as spec.

### Bugs / Gotchas
- The browser preview pane froze mid-verification, making a working stepper look
  broken across two separate checks. Reloading proved the component fine. Worth
  re-testing after a reload before "fixing" code that a stuck renderer made look
  wrong.

### Verified
Stepper cycles Phase 1 → 3 with correct security model, governance model, and
path dimming at each level (Phase 1: 2 paths dimmed, Phase 2: 1, Phase 3: 1),
and the prev control disables at Phase 1. Lint, typecheck, build clean.

## 2026-07-20 — Session 1g: QuarryLabs admin console (Phase 5)

### Built
- `src/app/admin/page.tsx` + `AdminConsole.tsx` — three-column control panel:
  global network parameters and pending candidacies (left), active validator
  registry with status dots and `[Jail Node]` (middle), Emergency Action
  Terminal (right). Not linked from the global nav, per the spec's scoping.
- `src/components/admin/SlashingTerminal.tsx` — target selector, infraction
  presets, penalty override slider, burn calculator, double-confirm modal.
- `src/lib/slashing.ts` — presets, burn address, and the spec's burn disclosure.
- `src/hooks/useAdminAccess.ts` — cosmetic admin gate (dev harness).
- Mock provider now returns three pending candidacies.

### Decisions
- **Destructive confirmation requires typing the validator's name.** A second
  click is too easy to fire from muscle memory, and slashing permanently burns
  collateral and reduces token supply. Verified the guard rejects empty input,
  wrong case, and partial matches.
- **The confirmation modal restates the exact consequence** — burn amount,
  infraction, penalty percentage, and destination burn address — rather than a
  generic "are you sure?". Someone approving an irreversible action should see
  the number they are approving.
- **A penalty override is always labelled.** Moving the slider off the preset
  surfaces a warning naming the preset value, so a non-standard penalty cannot
  be applied without it being visible in the UI and in the confirm modal.
- **Slashed validators leave the target dropdown**, so a node cannot be slashed
  twice, and their `[Jail Node]` control disables.
- **Network parameters are read-only.** Changing slashing policy is a governance
  proposal, not an admin action — presenting editable fields would imply a power
  the admin role should not have.
- **The admin gate is stated as cosmetic on screen.** It reads a browser flag,
  not a wallet. The harness bar says so, and `useAdminAccess` carries the
  warning in code, because this surface will eventually front real destructive
  operations.

### Verified
Gate blocks by default; harness reveals the console. Preset selection sets the
penalty (double-sign → 30%) and the burn calculator computes correctly
(500,000 × 30% = 150,000). Confirm button stays disabled for empty, wrong-case,
and partial name input, and enables only on exact match. Executing updated the
banner to "20/21 validators active · 150,000 QRY burned this session", marked
the node Evicted, disabled its jail control, and removed it from the target
list. Jail and Approve & Authorize both verified. Checked in both themes.
Lint, typecheck, build clean.

### Next
- Phase 6: real wallet connect, live block height, candidate standings page,
  responsive + accessibility audit.

## 2026-07-20 — Session 1f: Onboarding wizard + validator dashboard (Phase 4)

### Built — 4a, onboarding wizard
- `src/components/onboarding/OnboardingWizard.tsx` — profile & branding →
  infrastructure config → collateral lockup, with candidacy submission.
- `src/components/onboarding/ConnectionCheck.tsx` — the real node probe.
- `src/components/onboarding/NodeCommandBlock.tsx` — copyable deploy command.
- Entry points: header "Become a Miner" CTA, topology onboarding cards.

### Built — 4b, validator personal dashboard
- `src/app/miner/page.tsx` + `MinerDashboard.tsx` — access gate, status banner
  (rank / votes / network weight), sidebar nav across 5 workspaces.
- Sections: Overview (block-production telemetry + QRY yield ticker with the
  5 time horizons), Server Analytics, Staking & Pool (self-bond locker,
  delegation volume, commission slider), Campaign Hub, Governance Voting.
- `src/hooks/useConsensusTicker.ts` — CometBFT-style consensus state cycle.
- `src/hooks/useMinerRole.ts` + `DevHarnessBar` — simulated validator identity.

### Decisions
- **The `[Check Connection]` step is a real network probe.** The spec's
  reference implementation is a 1.5s `setTimeout` that always succeeds, which
  would tell an operator with a broken node that everything is fine — the single
  most harmful thing this module could do. Verified against three cases: the
  live testnet (chain 1129, 0 behind, 4 peers → pass), a wrong-chain node
  (11155111 → rejected, Continue blocked), and an unreachable host (timeout →
  blocked, CORS hint surfaced).
- **CORS did not block browser-origin calls to the public QuarryChain RPC**, so
  the server-side proxy fallback noted in integration.md may be unnecessary.
  Worth re-checking against a fresh operator node, since defaults vary.
- **The deploy command carries a visible warning.** Ports and chain-id are
  correct; the image name and genesis URL are not confirmed. An operator who
  copies a wrong image name fails at first contact with the network, so the gap
  is flagged rather than papered over with a confident-looking guess.
- **The dev harness is deliberately loud.** There is no wallet yet, so the miner
  dashboard has no real gate. An amber bar states that plainly — same reasoning
  as the ICO repo's test-mode banner: nobody should screenshot this and mistake
  it for a real access-controlled view.
- **The harness impersonates real registry entries** rather than inventing a
  synthetic "your node" record, so what an operator sees matches what voters see
  on the public profile.
- **Governance voting is elected-only.** Candidates get a read-only view and an
  explanation, because under DPoS only the top 21 carry network weight.
- **Reward projections are labelled ESTIMATE** with a note that they extrapolate
  the current rate and assume constant pool weight. Unlabelled forward numbers on
  a yield dashboard read as promises.
- **Local-only edits say so.** Commission and campaign-profile changes surface a
  notice that nothing was persisted, naming the missing backend piece.

### Verified
Onboarding driven end-to-end including all three connection-check outcomes.
Dashboard verified across all three harness roles: visitor → Access Denied with
onboarding link; elected → DRMZ, rank #1 of 21, 6.50% weight, vote buttons
present and a vote recorded; candidate → Foundry Node Works, zero vote buttons,
restriction notice shown. Yield horizon math checked against the daily rate
(1,240/day → 52/hr, 8,680/wk, 37,200/mo, 452,600/yr). Delegation pool math
confirmed (54,210,480 − 500,000 self-bond = 53,710,480). Sidebar `aria-current`
verified on the active section only. Lint, typecheck, build clean.

### Next
- Phase 5 (Module D): QuarryLabs admin console — manual approvals, jail/slash
  terminal, burn calculator.

## 2026-07-20 — Session 1e: Miner detail pages (Phase 3)

### Built
- `src/app/governance/[id]/page.tsx` — miner profile, prerendered for all 25
  validators via `generateStaticParams`, `notFound()` on unknown ids, per-miner
  `generateMetadata`.
- `src/components/governance/MinerProfile.tsx` — header (name, status badge,
  explorer-linked address, rank/host/region/website), pinned campaign notice,
  About, consensus performance grid, account stats sidebar, vote-weight panel.
- `src/components/governance/MinerHero.tsx` — optional profile graphic.
- `src/components/governance/DelegateLinkButton.tsx` — copies a shareable
  one-click delegate URL.
- `/voting?miner=<id>` pre-selects a validator and skips the selection grid.

### Contract change
`Validator` gained four fields for the spec's stats sidebar: `qryAvailable`,
`transactions`, `transfers`, `energy`. These come from account/explorer state
rather than the staking module — `docs/integration.md` updated with the
Blockscout endpoints that back them, per the rule that type changes and the
integration guide move together.

### Decisions
- **The `?miner=` param is validated against the real registry.** A stale or
  hand-edited link falls back to the normal selection flow instead of erroring
  or silently delegating to nothing.
- **Read `searchParams` server-side** rather than `useSearchParams`, so the
  portal stays a plain client component with no Suspense boundary.
- **Pre-selection still requires freezing first** — it skips step 2, not step 1.
  Skipping the freeze would delegate resources the user hasn't committed.
- **A missing hero graphic renders nothing**, not a placeholder frame. This is a
  page validators campaign with; a broken-image box undercuts them.
- **The copy-link button reports failure honestly.** The Clipboard API needs a
  secure context and can genuinely fail; showing "Copied!" when nothing was
  copied is worse than showing "Copy failed".

### Bugs / Gotchas
- Same transient-image class of bug as the avatars, but far more visible: the
  hero `<img>` reserved its full 1200x480 box for a frame before `onError` fired,
  flashing a large empty panel on every profile load. Fixed by keeping the
  wrapper `hidden` until `onLoad` — `display:none` does not stop the browser
  fetching the image, so real assets still appear.

### Verified
All 25 profile routes return 200; unknown ids 404; a bogus `?miner=` value
falls back to the normal flow with no shared-link banner. Confirmed the deep
link jumps straight to "Confirm Token Delegation" without rendering the
selection grid. Featured copy (DRMZ San Diego / Quarry Decentralism, drmz.app
link) present. Lint, typecheck, build clean.

### Next
- Phase 4 (Module C): validator onboarding wizard + personal dashboard — the
  module flagged as the priority for this build.

## 2026-07-20 — Session 1d: Module B voting & yield portal (Phase 2)

### Built
- `src/components/voting/VotingPortal.tsx` — the 4-step wizard (Freeze → Select →
  Cast → Manage) with pending/error states. Every mutation goes through the
  provider, so real staking is a provider change rather than a rewrite.
- `src/components/voting/YieldSidebar.tsx` — "Sustainable Bedrock Yield" panel:
  live odometer, APY window, energy/bandwidth, auto-compounding toggle + tooltip.
- `src/hooks/useLiveEarnings.ts` — the reward odometer.
- `src/lib/format.ts` — shared QRY / percent / address formatting.
- `panel` + `panel-ink` tokens for the spec's dark accent sidebar.

### Decisions
- **Earnings derive from elapsed wall-clock time, not per-tick accumulation.**
  `setInterval` drifts — in a background tab or under load it fires late, and
  accumulating a fixed increment per tick silently under-counts. Computing from
  elapsed time keeps the number honest regardless of tick timing. (The spec's
  reference code accumulates per tick *and* runs a 1000ms interval while adding
  100ms of rewards each time — a 10x undercount. Not reproduced.)
- **Simulated transaction hashes are labelled as such.** The mock provider returns
  a fake hash; it renders with a "SIMULATED" badge and the confirm step states
  that wallet signing arrives in Phase 6. An unlabelled hash in a screenshot would
  read as a real on-chain receipt.
- **Odometer collapses to zero via a derived return**, not a state reset in an
  effect — so revoking a delegation shows 0.000000 immediately with no stale
  frame, and no `set-state-in-effect` violation.
- **Tooltip inverted to white-on-dark.** The spec styles it `bg-black`, but it sits
  ON the accent panel, which is dark in *both* themes — black on near-black. White
  guarantees contrast either way. Copy itself is verbatim per spec.
- **`aria-live` deliberately omitted from the odometer.** It updates 10x/second;
  announcing every tick would make a screen reader unusable.

### Bugs / Gotchas
- Miner selection cards had **no accessible name** — the visible content is split
  across nested spans, which yields nothing usable for the button. Added explicit
  `aria-label`s ("Delegate to DRMZ — 13.4% APY, IONOS Frankfurt").

### Verified
Drove the full wizard in the browser, both themes. Freeze math correct
(25,000 QRY → 31,250 μS / 21,250 bp/s). Odometer rate checked against hand
calculation: 25,000 @ 13.4% = 3,350/yr = 0.000106/s, and the displayed value
tracked elapsed time. Vote Out resets odometer, badge, APY, and resources and
returns to step 1. Tooltip copy asserted equal to the spec string. Lint,
typecheck, build clean.

### Next
- Phase 3: `/governance/[id]` miner detail pages (currently 404).

## 2026-07-20 — Session 1c: Dark mode + theme toggle

### Built
- `src/app/globals.css` restructured: semantic tokens now live as raw CSS vars in
  `:root` (light) and `.dark` (dark), with `@theme inline` mapping them to Tailwind
  utilities. Components were already token-based, so none needed changing.
- `src/hooks/useTheme.ts` — theme state via `useSyncExternalStore` over the `<html>`
  class, plus `THEME_INIT_SCRIPT` for pre-paint application.
- `src/components/theme/ThemeToggle.tsx` — header toggle, inlined sun/moon SVGs.

### Decisions
- **Product direction overrode the spec's "light mode only" rule.** The Phase 6 spec explicitly
  describes a light fintech surface, and Session 1 hard-coded that as a project
  rule. Dark mode is now a requirement; AGENTS.md updated so the old rule doesn't
  get re-applied later.
- **quarrychain-web has no theme toggle** — it is permanently dark (`#08080f`, no
  next-themes, no `.dark` class). So there was no existing toggle to match; the
  request was interpreted as "dark that looks like the main site, plus a toggle."
  Dark mode adopts quarrychain-web's actual token values.
- **Brand blue differs per theme:** `#007BFF` (spec) on light, `#3b82f6`
  (quarrychain-web) on dark. The spec blue is punchy on white but harsh and
  over-saturated on near-black.
- **`success-deep` inverts.** It is used as text on `success-tint`, so it goes from
  a deep green on light to a light green on dark rather than staying fixed.
- **The DOM class is the source of truth, not React state.** The init script sets
  the class before hydration, so any React state would start stale.
  `useSyncExternalStore` subscribes to the class attribute directly.
- **Hand-rolled instead of next-themes.** ~70 lines and no dependency, which
  matters for a handoff deliverable.

### Bugs / Gotchas
- First implementation mirrored the DOM class into state and reconciled in an
  effect — caught by `react-hooks/set-state-in-effect`. The lint rule was right;
  `useSyncExternalStore` is the correct primitive.
- **Next's dev image cache served a deleted file for hours.** A temporary test PNG
  kept rendering after deletion — the static route 404'd while
  `/_next/image?url=…` still returned 200 from `.next/dev/cache/images` (4h TTL).
  Purging that directory fixed it. Worth knowing before chasing a phantom asset.
- That stale cache incidentally proved the avatar fade-in works with a real asset
  (`naturalWidth: 1, opacity: 1, complete: true`), which the earlier test could not
  confirm.

### Verified
Both themes rendered and screenshotted. Toggle flips live; the choice survives a
full reload even against a conflicting OS preference, confirming persistence.
Lint, typecheck, and build clean.

## 2026-07-20 — Session 1b: Module A governance dashboard (Phase 1)

### Built
- `src/hooks/useNodeTelemetry.ts` — subscribes to the provider's height stream,
  advances the tip, picks one validator per block to have produced it (flash +
  `blocksProduced++`), and applies the spec's telemetry deviations
  (latency ±2ms, uptime ±0.01%). Height comes from the provider, so a live
  provider starts driving real chain progress with no change to this hook.
- `src/components/governance/NetworkTopology.tsx` — multi-cloud health widget.
- `src/components/governance/ValidatorTable.tsx` — the 12-column sortable
  registry with per-row block flash and derived "Latest Block".
- `src/components/governance/ValidatorIcon.tsx` — avatar with initials fallback.
- `src/components/governance/GovernanceDashboard.tsx` — client shell; the page
  stays a server component and fetches the initial snapshot through the provider.

### Decisions
- **Topology shows only real infrastructure.** The spec's reference code hardcodes
  "3 Nodes on AWS / 2 Nodes on IONOS" and named clusters in West Virginia and
  Frankfurt. Only the two IONOS nodes actually exist, so the widget renders one
  live cluster and presents AWS + Bare Metal as *onboarding targets* ("no live
  nodes — supported onboarding target"). This keeps the demo honest and doubles
  as a funnel into the onboarding flow, the priority module for this build.
- **Sorting does not re-sort on every block.** `height` is deliberately excluded
  from the sort memo; otherwise the table would reshuffle every 3.6s and be
  unusable. Ordering by "Latest Block" tracks rank anyway.
- **Per-validator block lag is stable (`rank % 3`), not random.** A random offset
  would make every row's height jitter on each render, which reads as broken
  rather than as a live network mid-round.
- **Default sort direction depends on the column** — ascending for rank/name,
  descending for every numeric. Clicking "APY" should show the best yield first.
- **Flash is CSS-driven**, so the global `prefers-reduced-motion` rule neutralises
  it without any conditional logic in the hook.

### Bugs / Gotchas
- Validator names wrapped onto three lines and crushed the Name column; fixed
  with `whitespace-nowrap` on that cell. The table scrolls horizontally at narrow
  widths rather than compressing — correct for a 12-column data grid.
- `pnpm dev` landed on **port 3001**; 3000 was already occupied.

### Verified
Lint, typecheck, and production build all clean. Confirmed in the browser: 21
validators render, sorting works (Votes ▼ ordered correctly), the height ticker
advances, `blocksProduced` increments off the seed values, and icon fallbacks
render as initials while brand assets are outstanding.

### Next
- Phase 2 (Module B): the 4-step Freeze → Select → Cast → Manage voting wizard,
  live earnings odometer, auto-compounding toggle.

## 2026-07-20 — Session 1: Project scaffold + provider seam (Phase 0)

### Built
- Next.js 16.2.10 + TypeScript strict + Tailwind 4.3.3 + pnpm, App Router, `src/` layout.
- `src/app/globals.css` — design tokens pinned to the Phase 6 palette as Tailwind 4
  `@theme` variables. Light mode only. Includes `block-flash` / `fade-in` keyframes
  and a global `prefers-reduced-motion` guard.
- `src/app/layout.tsx` — Inter (sans) + JetBrains Mono (numerics/addresses), metadata,
  sticky header, `max-w-[1600px]` main container.
- `src/components/layout/AppHeader.tsx` — brand lockup ("Quarry" `#007BFF` / "Chain"
  black), `[Governance] [Voting]` nav with active state. Logo failure falls back to
  the wordmark rather than a broken image.
- `src/components/ui/Card.tsx` — shared panel primitive (rounded-xl, hairline border,
  soft shadow) so the spec's surface treatment stays consistent.
- `src/lib/chain.ts` — testnet constants derived from live interrogation.
- `src/lib/types.ts` — domain types; these are the frontend/backend contract.
- `src/lib/providers/types.ts` — `DataProvider` interface (registry, telemetry,
  onboarding, delegation, governance, admin).
- `src/lib/providers/mock.ts` — full mock implementation driving the app standalone.
- `src/lib/providers/node-check.ts` — **real** EVM-RPC probe for onboarding.
- `src/lib/mock/validators.ts` — 21 active + 4 candidate validators.
- `/governance` renders the registry from the provider; `/voting` is a Phase 2 stub.
- `docs/integration.md` — the handoff guide for QuarryChain's dev.

### Decisions
- **Frontend-only with a hard provider seam.** Every value routes through
  `DataProvider`; no component fetches. Going live is one file plus an env flag.
  The alternative — scattered fetches — would have made the handoff a rewrite.
- **Chain determination recorded in code and docs.** Interrogating the testnet showed
  it is Cosmos-SDK/CometBFT with an EVM module (chain-id 1129), *not* a Geth-family
  chain. Empty `extraData` + zero difficulty + a nameless Go client rule out
  Clique and PoW. This matters: the spec says operators "stake into the validator
  registry contract," but on CometBFT that is a Cosmos `create-validator` message
  with an ed25519 consensus pubkey and a native self-delegation. Flagged loudly in
  `integration.md` so their dev doesn't build an ERC-20 registry that can't work.
- **`isLiveNode` flag on every validator.** Only the two IONOS nodes actually
  producing blocks are marked live. The topology widget reads this so the demo
  never presents fictional infrastructure as real — a screenshot of this app
  shouldn't be able to mislead anyone about network size.
- **`checkNodeConnection` is real even in mock mode.** It needs no backend: it
  probes the operator's own node for chain-id 1129, sync distance from the public
  tip, and peer count. Faking a green checkmark on an onboarding flow would be
  actively harmful — operators would believe a broken node was healthy.
- **Light mode only, no dark variant.** The spec's `#212529` accent panels and
  contrast ratios assume a light ground. Explicit comment in `globals.css` so
  nobody "helpfully" adds a dark block later.
- **Next 16, not the Next 15 in the house CLAUDE.md.** `create-next-app` now ships
  16.2.10, and the ICO repo already hit Next 16 async-params behaviour — so 16 is
  what the team is actually on.

### Bugs / Gotchas
- `create-next-app` scaffolds a dark-mode-aware `globals.css` and a Geist font pair.
  Both were replaced wholesale; leaving either would have fought the spec palette.
- Bash cwd resets between tool calls (same as the ICO repo) — chain `cd` into every
  command.

### Open
- **Brand assets not delivered.** `public/assets/README.md` lists the six expected
  filenames. UI degrades gracefully until they land.
- **No live provider.** `NEXT_PUBLIC_DATA_MODE=live` currently warns and falls back
  to mock — deliberate, so the flag exists before the implementation.
- **CORS on `checkNodeConnection`.** Browser-origin RPC calls to an operator's node
  will often be rejected. May need a server-side proxy; noted in `integration.md`.
- Energy/Bandwidth may be presentational rather than a real chain module — unconfirmed.

### Next
- Phase 1 (Module A): topology widget, sortable 12-column registry table,
  `useNodeTelemetry` block ticker with per-row flash.
