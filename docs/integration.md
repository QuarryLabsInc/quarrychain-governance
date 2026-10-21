# Backend Integration Guide

**Audience:** the QuarryChain developer wiring this frontend to the real chain.

This app is **frontend-only**. Every value it renders comes from a mock provider.
To go live you implement one interface — you do not touch a single component.

---

## 1. What the chain actually is

Determined by interrogating the live testnet on 2026-07-20. Recording it here
because the original spec's wording is misleading in one important way.

| Property | Value |
|---|---|
| Chain type | **Cosmos-SDK + CometBFT consensus + EVM module** (Evmos / Cosmos-EVM lineage) |
| EVM chain-id | **1129** (`0x469`) |
| Block time | ~3.6s |
| Public EVM JSON-RPC | `https://rpc.testnet.quarrychain.network` |
| Explorer (Blockscout) | `https://explorer.testnet.quarrychain.network` |
| Cosmos REST (`:1317`) | **not publicly exposed** |
| CometBFT RPC (`:26657`) | **not publicly exposed** |

**Evidence it is CometBFT, not Geth/Clique/PoW:** blocks carry empty
`extraData`, `difficulty: 0x0`, `gasLimit: 0xffffffff`, and the client string is
a nameless custom Go build. Clique always stuffs a signer list and seal into
`extraData`; PoW would have non-zero difficulty.

### ⚠️ Validators do NOT register via an ERC-20 registry contract

The spec says operators "stake into the validator registry contract." On a
CometBFT chain that is not how it works. Validators register with a Cosmos
**`create-validator`** transaction carrying:

- an **ed25519 consensus public key** (the node's, from `tendermint show-validator`)
- a **self-delegation** of the native QRY staking coin (10,000 QRY minimum, set
  by the onboarding requirements; the chain's own floor is 1 aqry)

**Update 2026-10-13 — this is already wired end to end.** The chain exposes
the Cosmos staking module to the EVM through the **staking precompile** at
`0x0000000000000000000000000000000000000800` (Evmos v20 ABI). `/onboarding`
signs `createValidator` there from the operator's MetaMask/Rabby wallet — no
Cosmos REST, no Keplr. Verified by `eth_call` simulation against the testnet:

| Finding | Detail |
|---|---|
| Staking denom | `aqry`, 18 decimals — identical to native EVM QRY |
| Consensus pubkey | base64 ed25519 string (the `key` of `show-validator`'s JSON) |
| Sender check | `validatorAddress` must equal `msg.sender` |
| Duplicate keys | rejected: `validator already exist for this pubkey` |
| Permissioning | **none on-chain** — a funded wallet registers directly |
| Readback | `validator(address)` returns Details only as `description`; moniker and website come from the tx calldata |

Because admission is open on-chain, the admin panel's `[Approve & Authorize]`
flow no longer gates anything real. If Phase 1 must be permissioned, that has
to happen at the chain level (gov-gated params or an ante handler) — a UI gate
cannot stop a direct precompile call.

The bonded set today: 5 validators, 100 QRY self-bond each, 5% commission.

---

## 2. The seam

```
src/lib/providers/types.ts   ← the interface you implement
src/lib/providers/mock.ts    ← reference implementation (simulated)
src/lib/providers/index.ts   ← runtime resolver, reads NEXT_PUBLIC_DATA_MODE
src/lib/types.ts             ← domain shapes; these ARE the contract
```

To go live:

1. Write `src/lib/providers/live.ts` exporting `createLiveProvider(): DataProvider`.
2. Import and return it from `getProvider()` when `NEXT_PUBLIC_DATA_MODE === "live"`.
3. Set `NEXT_PUBLIC_DATA_MODE=live`.

No component imports anything but `getProvider()`. Swapping the provider swaps
the whole app's data source.

---

## 3. Method-by-method: what backs what

### `registry.listActive()` / `listCandidates()` / `getById()`
→ **Cosmos REST** `GET /cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED`

Maps to `Validator[]`. Notes:
- `votes` ← `delegator_shares` (convert from base units to whole QRY)
- `selfBond` ← query `/cosmos/staking/v1beta1/validators/{addr}/delegations/{self}`
- `commissionPct` ← `commission.commission_rates.rate` (×100)
- `rank` ← sort by `tokens` descending
- `name`, `website`, `description` ← `description.moniker` / `.website` / `.details`
- `missedBlocks` ← **Slashing module**: `/cosmos/slashing/v1beta1/signing_infos`
- `apyPct`, `dailyRewardQry` ← derived; see the mint + distribution modules
- `iconAsset` / `heroAsset` / `pinnedNotice` — **off-chain**, no on-chain source.
  These need a small profile store (the campaign hub writes them).

Profile-page stats sidebar (added Phase 3) comes from **account/explorer state**,
not the staking module:
- `qryAvailable` ← `eth_getBalance` on the validator's EVM address, or Cosmos
  `/cosmos/bank/v1beta1/balances/{addr}` for the liquid (unbonded) denom
- `transactions` ← Blockscout `/api/v2/addresses/{addr}/counters`
- `transfers` ← Blockscout `/api/v2/addresses/{addr}/token-transfers` (count)
- `energy` ← the freeze/resource module if one exists; otherwise derive from
  `selfBond`. **Open question 7 covers whether this module is real.**

**Requires exposing Cosmos REST (`:1317`) read-only.**

### `telemetry.getNetworkStatus()` / `subscribeHeight()`
→ **EVM JSON-RPC** `eth_blockNumber`, `eth_chainId` — already public, works today.
→ For true consensus data (validator set, peers) use CometBFT RPC `/status`, `/net_info`.

`NetworkStatus.isLive` must be set `true` by the live provider so the UI can
label the data source honestly.

### `onboarding.checkNodeConnection(rpcUrl)`
→ **Already implemented for real** in `src/lib/providers/node-check.ts`. Used by
both mock and live. It probes the *operator's own* node:
`eth_chainId === 1129`, `eth_blockNumber` within 10 blocks of the public tip,
`net_peerCount > 0`.

> **CORS caveat:** this is a browser-origin request. Most node configs reject it.
> If that bites in the field, move the probe behind a server route — the
> interface does not change.

### `onboarding.buildNodeCommand(host)`
→ Returns the shell command an operator runs. **The mock returns a placeholder
image name (`quarrychain/node:latest`) — replace with the real published
artifact.** Needed: image/binary name, version tag, required ports, genesis URL,
and seed/persistent-peer strings (`nodeID@ip:26656`) for the existing IONOS nodes.

### `onboarding.registerValidator(req, walletClient)` / `waitForRegistration(tx, addr)`
→ **Already implemented for real** in `src/lib/providers/liveStaking.ts`.
Simulates `createValidator` first (so duplicate keys / short balances fail
with the chain's reason before the wallet prompts), then sends it from the
connected wallet, waits for the receipt, and reads the validator back.

The Step 1 profile is written into the on-chain `Description`:
`moniker` ← miner name, `website` ← website, `details` ← description plus a
socials trailer (`\n\nX: @handle · Discord: discord.gg/…`, parsed by
`decodeDetails`). Cosmos SDK limits apply: moniker 70, website 140, details 280.
Commission is fixed at 5% rate / 20% max / 1% max daily change — the last two
are permanent once created.

### `onboarding.getStakingBalance(addr)` / `findValidatorByConsensusKey(key)`
→ Real. `eth_getBalance` (native — staking cannot draw from the bridged ERC-20)
and the precompile's `validators()` across all bond statuses.

### `registry.getOnChain(address)`
→ Real. Precompile `validator(address)` + the registration tx calldata (by
hash right after onboarding, otherwise via Blockscout's address tx list).
Rendered at `/governance/<0x address>`.

### `onboarding.submitApplication(app)`
→ Off-chain, **mock**. Called after the on-chain tx confirms, to store what
`create-validator` has no field for: Peer ID, RPC endpoint, host. This is the
seam for the **Supabase** profile store (decided 2026-10-21; full design in
`onboarding-requirement.txt` → Technical Instructions). The rule: **the chain
is the source of truth for the profile; Supabase mirrors it and holds what the
chain can't** (logo, Peer ID, RPC endpoint, host). Browsers never write
Supabase directly — RLS is public-read only, and Edge Functions verify a
wallet signature + the tx receipt, then write mirror fields from decoded
calldata (never from the request body). Status is read from the chain, never
set by the client. `ValidatorApplication` gained
`rpcEndpoint`, `validatorAddress`, `txHash` on 2026-10-13 (breaking).

### `wallet.getSummary(address)`
→ Aggregates the connected wallet's view for the Quarry Wallet Dashboard:
- balances ← `eth_getBalance` (QRY) + ERC-20 `balanceOf` for QSD / USDT-QRC20
- delegations ← Cosmos staking `/cosmos/staking/v1beta1/delegations/{addr}`,
  joined with the validator registry for name/APY, plus
  `/cosmos/distribution/v1beta1/delegators/{addr}/rewards` for rewards earned
- earnings feed ← recent reward/distribution events for the address
The "KYC Certified / Accredited Investor / ZKP Protected" badges are
presentational placeholders from the RWA demo — wire them to real attestation
state or drop them.

### `delegation.*`
→ Cosmos staking messages: `MsgDelegate`, `MsgUndelegate`, `MsgWithdrawDelegatorReward`.
`freeze()` models the Energy/Bandwidth resource concept — confirm whether the
chain actually implements a freeze/resource module or whether this is purely a
presentation-layer metaphor.

### `governance.*`
→ Cosmos gov module: `/cosmos/gov/v1/proposals`, `MsgVote`.

### `admin.*`
→ Jail/slash are consensus-level operations (slashing module / governance), not
arbitrary API calls. `approveApplication` is off-chain. **Gate every admin
method server-side** — the UI hiding a button is not authorization.

---

## 4. What the frontend deliberately does NOT do

- No private keys, no signing logic beyond wallet-provider calls.
- No custody of funds.
- No claim that mock nodes are real: `Validator.isLiveNode` is `true` only for
  the two IONOS nodes actually producing blocks. **Keep it that way** — the
  topology widget reads this flag so the demo never presents fictional
  infrastructure as live.

## 5. Open questions for the chain team

1. Node artifact — real docker image / binary name + version? The UI now uses
   the onboarding doc's `quarrychain/node:testnet-latest` + `quarrychaind`,
   and Cosmos chain-id `quarrychain_1129-1` (the doc's `quarrychain_1234-1`
   contradicts EVM id 1129) — all three unconfirmed.
2. `genesis.json` URL + seed / persistent-peer strings for the 2 IONOS nodes?
3. Can Cosmos REST (`:1317`) + CometBFT RPC (`:26657`) be exposed read-only?
4. ~~Staking denom~~ — **answered 2026-10-13:** `aqry`, 18 dp.
5. ~~Is `create-validator` permissioned?~~ — **answered 2026-10-13:** no, it is
   open on-chain. Decide whether that is intended for Phase 1.
6. Is there a testnet faucet? Operators need 10,000 native QRY (plus gas) to self-bond. The UI says "Request test tokens from the Faucet" but has no URL to link.
7. Is there a real Energy/Bandwidth resource module, or is that presentational?
