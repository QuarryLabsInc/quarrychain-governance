import type { Validator } from "@/lib/types";

/**
 * Demo validator registry.
 *
 * IMPORTANT: only the two IONOS entries carry isLiveNode: true — those map to
 * the real nodes currently producing blocks on the testnet (proposer addresses
 * observed on-chain). Everything else is demo data for the showcase. The
 * topology widget reads isLiveNode so we never present fictional infrastructure
 * as real. Do not flip these flags to make the network look bigger.
 */

/** Proposer addresses observed on the live testnet. */
const LIVE_PROPOSERS = {
  nodeA: "0x8f0f079ee94188473c46baedc937e6604a312b7e",
  nodeB: "0x7af5894501A6C84E040bd28366f79693AeE86CEe",
} as const;

function pseudoAddress(seed: number): string {
  const hex = (seed * 0x9e3779b1).toString(16).padStart(8, "0").slice(-8);
  return `0x${hex}${"a3f9c17b42e8d05619bc7fa2384de6".repeat(2).slice(0, 32)}`;
}

/** Fields derived from the rest of the record, so they stay self-consistent. */
type ValidatorSeed = Omit<
  Validator,
  "qryAvailable" | "transactions" | "transfers" | "energy"
>;

function withStats(v: ValidatorSeed): Validator {
  const transactions = Math.round(v.blocksProduced / 900) + v.rank * 41;
  return {
    ...v,
    qryAvailable: Math.round(v.votes * 0.014),
    transactions,
    transfers: Math.round(transactions * 0.62),
    energy: Math.round(v.selfBond * 1.25),
  };
}

const FEATURED: ValidatorSeed[] = [
  {
    id: "aloha-blocks",
    rank: 1,
    name: "Aloha Blocks",
    iconAsset: "aloha-blocks-icon.png",
    heroAsset: "aloha-blocks-page.png",
    address: LIVE_PROPOSERS.nodeA,
    status: "active",
    votes: 54_210_480,
    selfBond: 500_000,
    protocolVersion: "v2.1.0",
    latencyMs: 12,
    uptimePct: 99.99,
    blocksProduced: 1_420_510,
    missedBlocks: 0,
    dailyRewardQry: 1_240,
    apyPct: 13.4,
    commissionPct: 5,
    host: "IONOS",
    region: "Frankfurt",
    website: "https://www.alohablocks.com/",
    description:
      "Aloha Blocks has been a block producer since 2018. Beyond running infrastructure, we build and operate research and monitoring tools that the community relies on every day.",
    pinnedNotice: null,
    featured: true,
    isLiveNode: true,
  },
  {
    id: "greymass",
    rank: 2,
    name: "Greymass",
    iconAsset: "greymass-icon.png",
    heroAsset: "greymass-page.png",
    address: LIVE_PROPOSERS.nodeB,
    status: "active",
    votes: 52_119_850,
    selfBond: 500_000,
    protocolVersion: "v2.1.0",
    latencyMs: 15,
    uptimePct: 99.98,
    blocksProduced: 1_420_124,
    missedBlocks: 0,
    dailyRewardQry: 1_190,
    apyPct: 12.8,
    commissionPct: 4,
    host: "IONOS",
    region: "Frankfurt",
    website: "https://www.greymass.com/about",
    description:
      "Greymass has a long history of block production, infrastructure, wallets, developer tools, and open-source ecosystem work.",
    pinnedNotice: null,
    featured: true,
    isLiveNode: true,
  },
  {
    id: "carpenter-union-nft",
    rank: 3,
    name: "Carpenter Union NFT",
    iconAsset: "carpenter-nft-icon.png",
    heroAsset: null,
    address: pseudoAddress(3),
    status: "active",
    votes: 51_450_000,
    selfBond: 500_000,
    protocolVersion: "v2.1.0",
    latencyMs: 14,
    uptimePct: 99.95,
    blocksProduced: 1_419_850,
    missedBlocks: 2,
    dailyRewardQry: 1_160,
    apyPct: 12.1,
    commissionPct: 6,
    host: "AWS",
    region: "US West",
    website: null,
    description:
      "Southwest Carpenters Local 661 — organized labor entering decentralized infrastructure. The local operates a validator under the Quarry Decentralism movement, treating block production as collectively-held infrastructure rather than a purely financial position.",
    pinnedNotice: null,
    featured: true,
    isLiveNode: false,
  },
  {
    id: "tokenized-matrix",
    rank: 4,
    name: "Tokenized Matrix",
    iconAsset: null,
    heroAsset: null,
    address: pseudoAddress(4),
    status: "active",
    votes: 49_880_300,
    selfBond: 500_000,
    protocolVersion: "v2.1.0",
    latencyMs: 11,
    uptimePct: 99.97,
    blocksProduced: 1_420_310,
    missedBlocks: 1,
    dailyRewardQry: 1_120,
    apyPct: 11.9,
    commissionPct: 5,
    host: "AWS",
    region: "US East",
    website: null,
    description:
      "Tokenization infrastructure partner operating redundant validator capacity for real-world asset settlement.",
    pinnedNotice: null,
    featured: true,
    isLiveNode: false,
  },
  {
    id: "quarrylabs",
    rank: 5,
    name: "QuarryLabs",
    iconAsset: null,
    heroAsset: null,
    address: pseudoAddress(5),
    status: "active",
    votes: 48_500_000,
    selfBond: 500_000,
    protocolVersion: "v2.1.0",
    latencyMs: 9,
    uptimePct: 99.99,
    blocksProduced: 1_421_004,
    missedBlocks: 0,
    dailyRewardQry: 1_100,
    apyPct: 11.6,
    commissionPct: 0,
    host: "IONOS",
    region: "Frankfurt",
    website: "https://quarrychain.network",
    description:
      "Core protocol team node. Operates at 0% commission during Phase 1 to bootstrap network security.",
    pinnedNotice: null,
    featured: true,
    isLiveNode: false,
  },
];

const FILLER_NAMES = [
  "Google Cloud Validator",
  "Blue Chip Staking",
  "Global Mining Group",
  "Meridian Node Partners",
  "Atlas Consensus Labs",
  "Bedrock Infrastructure",
  "Northwind Validation",
  "Sierra Stake Collective",
  "Helix Chain Services",
  "Ironwood Digital",
  "Cascade Node Group",
  "Vantage Block Systems",
  "Summit Ledger Ops",
  "Keystone Validators",
  "Beacon Grid Networks",
  "Anchor Point Staking",
];

const FILLER: ValidatorSeed[] = FILLER_NAMES.map((name, i) => {
  const rank = i + 6;
  const host = i % 3 === 0 ? "AWS" : i % 3 === 1 ? "IONOS" : "BareMetal";
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    rank,
    name,
    iconAsset: null,
    heroAsset: null,
    address: pseudoAddress(rank),
    status: "active" as const,
    votes: 47_000_000 - i * 1_450_000,
    selfBond: 500_000,
    protocolVersion: "v2.1.0",
    latencyMs: 14 + (i % 4) * 3,
    uptimePct: Number((99.96 - i * 0.01).toFixed(2)),
    blocksProduced: 1_418_000 - i * 2_100,
    missedBlocks: i % 4 === 0 ? 1 : 0,
    dailyRewardQry: 1_060 - i * 28,
    apyPct: Number((11.4 - i * 0.19).toFixed(1)),
    commissionPct: 5 + (i % 4),
    host: host as Validator["host"],
    region: host === "IONOS" ? "Frankfurt" : host === "AWS" ? "US East" : "Rotterdam",
    website: null,
    description: null,
    pinnedNotice: null,
    featured: false,
    isLiveNode: false,
  };
});

const CANDIDATES: ValidatorSeed[] = [
  "Foundry Node Works",
  "Lumen Stake",
  "Granite Consensus",
  "Tidewater Validation",
].map((name, i) => {
  const rank = FEATURED.length + FILLER.length + i + 1;
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    rank,
    name,
    iconAsset: null,
    heroAsset: null,
    address: pseudoAddress(rank),
    status: "candidate" as const,
    votes: 12_400_000 - i * 2_100_000,
    selfBond: 500_000,
    protocolVersion: "v2.1.0",
    latencyMs: 19 + i * 2,
    uptimePct: Number((99.82 - i * 0.05).toFixed(2)),
    blocksProduced: 0,
    missedBlocks: 0,
    dailyRewardQry: 0,
    apyPct: Number((9.8 - i * 0.3).toFixed(1)),
    commissionPct: 7 + i,
    host: (i % 2 === 0 ? "AWS" : "BareMetal") as Validator["host"],
    region: i % 2 === 0 ? "EU West" : "Singapore",
    website: null,
    description:
      "Backup miner campaigning for a seat in the active consensus set.",
    pinnedNotice:
      i === 0 ? "Campaigning for a top-21 slot — X Space this Thursday." : null,
    featured: false,
    isLiveNode: false,
  };
});

/** The elected consensus set — exactly ACTIVE_SET_SIZE entries. */
export const MOCK_ACTIVE_VALIDATORS: Validator[] = [...FEATURED, ...FILLER].map(
  withStats,
);

/** Backup miners campaigning for a slot. */
export const MOCK_CANDIDATE_VALIDATORS: Validator[] = CANDIDATES.map(withStats);
