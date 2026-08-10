/**
 * Domain types for the governance suite.
 *
 * These types ARE the frontend/backend contract. The live provider that
 * QuarryChain's dev writes must satisfy these shapes exactly — see
 * docs/integration.md for which chain endpoint backs each field.
 */

export type ValidatorStatus = "active" | "candidate" | "jailed" | "evicted";

export type ServerHost = "AWS" | "IONOS" | "BareMetal";

export interface Validator {
  /** Stable slug used in routes: /governance/[id] */
  id: string;
  /** 1-indexed position by vote weight. Candidates rank beyond ACTIVE_SET_SIZE. */
  rank: number;
  name: string;
  /** Filename under /public/assets. null renders the fallback glyph. */
  iconAsset: string | null;
  /** Larger profile graphic for the detail page. */
  heroAsset: string | null;
  /** EVM address of the block proposer / fee collector. */
  address: string;
  status: ValidatorStatus;
  /** Total delegated stake, in whole QRY. */
  votes: number;
  /** Operator's own bonded collateral, in whole QRY. */
  selfBond: number;
  /** Node software version, e.g. "v2.1.0". */
  protocolVersion: string;
  latencyMs: number;
  uptimePct: number;
  blocksProduced: number;
  missedBlocks: number;
  /** Projected operator payout per day, in whole QRY. */
  dailyRewardQry: number;
  apyPct: number;
  /** Operator's cut of delegator rewards, 0–20. */
  commissionPct: number;
  host: ServerHost;
  region: string;
  website: string | null;
  description: string | null;
  /** Pinned campaign announcement shown on the public profile. */
  pinnedNotice: string | null;

  /*
   * Profile-page stats sidebar. These come from account/explorer state rather
   * than the staking module — see docs/integration.md for the Blockscout
   * endpoints that back them.
   */
  /** Liquid (unbonded) balance, whole QRY. */
  qryAvailable: number;
  /** Total transactions sent by this account. */
  transactions: number;
  /** Token transfer count for this account. */
  transfers: number;
  /** Freeze-derived resource units. */
  energy: number;
  /** Featured miners render richer profile content and pin to the top. */
  featured: boolean;
  /**
   * True when this entry maps to a node actually running on the live testnet.
   * Today only the two IONOS nodes are real — everything else is demo data.
   * The topology widget must never present mock nodes as live infrastructure.
   */
  isLiveNode: boolean;
}

export interface NetworkStatus {
  /** Latest block height. */
  height: number;
  chainId: number;
  /** Count of nodes actually participating in consensus. */
  activeNodes: number;
  /** Node counts by host, for the topology widget. */
  hostBreakdown: Record<ServerHost, number>;
  /** True when height came from the live RPC rather than the mock ticker. */
  isLive: boolean;
}

/** Result of probing a prospective validator's own EVM JSON-RPC endpoint. */
export interface NodeCheckResult {
  reachable: boolean;
  /** Chain id reported by the operator's node; must equal CHAIN.id. */
  chainId: number | null;
  synced: boolean;
  height: number | null;
  /** How far behind the network tip, in blocks. */
  blocksBehind: number | null;
  peerCount: number | null;
  /** Human-readable failure reason when reachable === false. */
  error: string | null;
}

export interface ValidatorApplication {
  minerName: string;
  website: string;
  description: string;
  socials: { x?: string; discord?: string };
  host: ServerHost;
  /** libp2p / CometBFT node identity. */
  nodePeerId: string;
  /** ed25519 consensus pubkey used by `create-validator`. */
  consensusPubkey: string;
  selfBondQry: number;
}

export type ProposalVote = "aye" | "nay" | "abstain";

export interface Proposal {
  id: string;
  title: string;
  description: string;
  status: "voting" | "passed" | "rejected";
  tally: Record<ProposalVote, number>;
}

/** Delegation the connected wallet currently holds. */
export interface Delegation {
  validatorId: string;
  amountQry: number;
  /** Accrued but unclaimed rewards, in QRY. */
  pendingRewards: number;
  autoCompound: boolean;
}

/* ---- Quarry Wallet Dashboard ---- */

/**
 * Not a closed set: live balances come from whatever ERC-20 tokens Blockscout
 * has indexed for the connected address (src/lib/providers/liveWallet.ts),
 * which can't be known statically. Two entries can legitimately share a
 * symbol — e.g. native QRY and the bridged "Bridged QRY" ERC-20 both use
 * `QRY` — disambiguate by `name`, not `symbol`.
 */
export type TokenSymbol = string;

export interface TokenBalance {
  symbol: TokenSymbol;
  name: string;
  amount: number;
}

/** An active delegation as shown on the wallet's Manage Pool section. */
export interface ActiveDelegation {
  validatorId: string;
  validatorName: string;
  iconAsset: string | null;
  delegatedQry: number;
  apyPct: number;
  /** Rewards accrued so far, in QRY. */
  rewardsEarned: number;
  autoCompound: boolean;
}

export type EarningsEventKind = "received" | "compounded" | "dividend";

export interface EarningsEvent {
  id: string;
  kind: EarningsEventKind;
  title: string;
  detail: string;
  /** Pre-formatted relative time, e.g. "1 minute ago". */
  when: string;
}

/**
 * Everything the Quarry Wallet Dashboard renders. Modelled on the RWA
 * Marketplace demo, with the holdings section replaced by active delegations.
 */
export interface WalletSummary {
  address: string;
  /** Total delegated QRY across all miners. */
  totalStakedQry: number;
  /** Change over the last 24h, in QRY. */
  todayChangeQry: number;
  todayChangePct: number;
  /** All-time rewards earned, in QRY. */
  totalYieldQry: number;
  balances: TokenBalance[];
  delegations: ActiveDelegation[];
  earnings: EarningsEvent[];
}

export type InfractionKind = "downtime" | "double_sign" | "malicious";

export interface SlashPreset {
  kind: InfractionKind;
  label: string;
  /** Percentage of self-bond burned. */
  penaltyPct: number;
  action: string;
}
