import { CHAIN } from "@/lib/chain";
import type {
  ExplorerAddress,
  ExplorerBlock,
  ExplorerStats,
  ExplorerTransaction,
  SearchResult,
} from "@/lib/explorer/types";
import type { TokenBalance } from "@/lib/types";

/**
 * Live Blockscout REST client.
 *
 * This is the one part of the app that is real end to end — no mock layer. It
 * runs server-side in React Server Components, which sidesteps CORS entirely
 * and lets Next cache responses.
 *
 * The chain is a young testnet: at time of writing ~15 transactions and ~32
 * addresses across ~960k blocks. The explorer will legitimately look sparse.
 * Do not pad it with synthetic activity — an explorer that invents traffic is
 * worse than useless.
 */

const API = `${CHAIN.explorerUrl}/api/v2`;

/** Blockscout is a live dependency; cache briefly rather than hammering it. */
const REVALIDATE_SECONDS = 10;

async function api<T>(path: string, revalidate = REVALIDATE_SECONDS): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, {
      next: { revalidate },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // The explorer must degrade, not crash the page, if Blockscout is down.
    return null;
  }
}

/* ---------------------------------------------------------------- mapping */

interface RawBlock {
  height: number;
  hash: string;
  timestamp: string;
  transactions_count?: number;
  transaction_count?: number;
  miner: { hash: string };
  gas_used: string;
  gas_limit: string;
  size: number;
  parent_hash: string;
}

function mapBlock(b: RawBlock): ExplorerBlock {
  return {
    height: b.height,
    hash: b.hash,
    timestamp: b.timestamp,
    // Blockscout has used both spellings across versions.
    transactionCount: b.transactions_count ?? b.transaction_count ?? 0,
    proposer: b.miner?.hash ?? "",
    gasUsed: b.gas_used ?? "0",
    gasLimit: b.gas_limit ?? "0",
    size: b.size ?? 0,
    parentHash: b.parent_hash ?? "",
  };
}

interface RawTx {
  hash: string;
  result?: string;
  status?: string;
  block_number?: number | null;
  block?: number | null;
  timestamp: string | null;
  from: { hash: string };
  to: { hash: string } | null;
  method: string | null;
  transaction_types?: string[];
  value: string;
  gas_used: string | null;
  created_contract?: { hash: string } | null;
}

function mapTx(t: RawTx): ExplorerTransaction {
  const raw = (t.result ?? t.status ?? "").toLowerCase();
  return {
    hash: t.hash,
    status: raw === "success" || raw === "ok" ? "success" : raw ? "failed" : "pending",
    blockHeight: t.block_number ?? t.block ?? null,
    timestamp: t.timestamp,
    from: t.from?.hash ?? "",
    to: t.to?.hash ?? null,
    method: t.method ?? null,
    value: t.value ?? "0",
    gasUsed: t.gas_used ?? null,
    isContractCreation:
      Boolean(t.created_contract) ||
      (t.transaction_types ?? []).includes("contract_creation"),
  };
}

/* ------------------------------------------------------------------ reads */

export async function getStats(): Promise<ExplorerStats | null> {
  const [raw, blocks] = await Promise.all([
    api<{
      total_blocks: string;
      total_transactions: string;
      total_addresses: string;
      average_block_time: number;
    }>("/stats"),
    getRecentBlocks(50),
  ]);
  if (!raw) return null;

  // Derive the live validator set from who is actually proposing, rather than
  // hardcoding addresses that go stale as the set grows.
  const activeProposers = [...new Set(blocks.map((b) => b.proposer))].filter(Boolean);

  return {
    latestHeight: blocks[0]?.height ?? Number(raw.total_blocks ?? 0),
    totalBlocks: Number(raw.total_blocks ?? 0),
    totalTransactions: Number(raw.total_transactions ?? 0),
    totalAddresses: Number(raw.total_addresses ?? 0),
    averageBlockTime: raw.average_block_time ?? CHAIN.blockTimeMs,
    activeProposers,
  };
}

export async function getRecentBlocks(limit = 10): Promise<ExplorerBlock[]> {
  const data = await api<{ items: RawBlock[] }>("/blocks?type=block");
  if (!data?.items) return [];
  return data.items.slice(0, limit).map(mapBlock);
}

export async function getRecentTransactions(limit = 10): Promise<ExplorerTransaction[]> {
  const data = await api<{ items: RawTx[] }>("/transactions?filter=validated");
  if (!data?.items) return [];
  return data.items.slice(0, limit).map(mapTx);
}

export async function getBlock(heightOrHash: string): Promise<ExplorerBlock | null> {
  const raw = await api<RawBlock>(`/blocks/${heightOrHash}`, 60);
  return raw ? mapBlock(raw) : null;
}

export async function getBlockTransactions(
  heightOrHash: string,
): Promise<ExplorerTransaction[]> {
  const data = await api<{ items: RawTx[] }>(`/blocks/${heightOrHash}/transactions`, 60);
  return data?.items ? data.items.map(mapTx) : [];
}

export async function getTransaction(hash: string): Promise<ExplorerTransaction | null> {
  const raw = await api<RawTx>(`/transactions/${hash}`, 60);
  return raw ? mapTx(raw) : null;
}

export async function getAddress(hash: string): Promise<ExplorerAddress | null> {
  const raw = await api<{
    hash: string;
    coin_balance: string | null;
    is_contract: boolean;
    is_verified: boolean;
    name: string | null;
  }>(`/addresses/${hash}`, 30);
  if (!raw) return null;

  const counters = await api<{ transactions_count: string }>(
    `/addresses/${hash}/counters`,
    30,
  );

  return {
    hash: raw.hash,
    balance: raw.coin_balance ?? "0",
    transactionCount: Number(counters?.transactions_count ?? 0),
    isContract: Boolean(raw.is_contract),
    isVerifiedContract: Boolean(raw.is_verified),
    name: raw.name ?? null,
  };
}

export async function getAddressTransactions(
  hash: string,
): Promise<ExplorerTransaction[]> {
  const data = await api<{ items: RawTx[] }>(`/addresses/${hash}/transactions`, 30);
  return data?.items ? data.items.map(mapTx) : [];
}

interface RawTokenBalance {
  token: {
    address: string;
    decimals: string | null;
    name: string | null;
    symbol: string | null;
    type: string;
  };
  value: string;
}

/** ERC-20 balances for an address. Blockscout returns a bare array, no `items` wrapper. */
export async function getAddressTokenBalances(hash: string): Promise<TokenBalance[]> {
  const data = await api<RawTokenBalance[]>(`/addresses/${hash}/token-balances`, 30);
  if (!data) return [];

  return data
    .filter((b) => b.token.type === "ERC-20")
    .map((b) => {
      const decimals = Number(b.token.decimals ?? 18);
      return {
        symbol: b.token.symbol ?? "?",
        name: b.token.name ?? b.token.symbol ?? "Unknown token",
        amount: Number(b.value) / 10 ** decimals,
      };
    })
    .filter((t) => t.amount > 0);
}

/**
 * Successful txs an address sent to `to`, oldest first, with raw calldata.
 * Used to recover a validator's moniker/website from its create-validator
 * call — the staking precompile does not return them (see src/lib/staking.ts).
 * Returns null when Blockscout is unreachable, so callers can tell "no such
 * tx" apart from "couldn't look".
 */
export async function getAddressCallsTo(
  hash: string,
  to: string,
): Promise<{ hash: string; input: string }[] | null> {
  const data = await api<{
    items: { hash: string; raw_input?: string; result?: string; status?: string; to: { hash: string } | null }[];
  }>(`/addresses/${hash}/transactions?filter=from`, 30);
  if (!data?.items) return null;

  return data.items
    .filter(
      (t) =>
        t.to?.hash.toLowerCase() === to.toLowerCase() &&
        (t.result ?? t.status ?? "").toLowerCase() === "success" &&
        t.raw_input,
    )
    .map((t) => ({ hash: t.hash, input: t.raw_input! }))
    .reverse();
}

/**
 * Resolve a query to an in-app explorer route.
 *
 * Handles the obvious shapes locally (block height, 0x-hash, address) before
 * falling back to Blockscout's search, so a plain block number resolves without
 * a network round trip.
 */
export async function search(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  if (/^\d+$/.test(q)) {
    return [{ kind: "block", href: `/explorer/block/${q}`, label: `Block #${q}` }];
  }
  if (/^0x[a-fA-F0-9]{64}$/.test(q)) {
    return [
      { kind: "transaction", href: `/explorer/tx/${q}`, label: "Transaction" },
      { kind: "block", href: `/explorer/block/${q}`, label: "Block by hash" },
    ];
  }
  if (/^0x[a-fA-F0-9]{40}$/.test(q)) {
    return [{ kind: "address", href: `/explorer/address/${q}`, label: "Address" }];
  }

  const data = await api<{
    items: { type: string; block_number?: number; address_hash?: string; transaction_hash?: string }[];
  }>(`/search?q=${encodeURIComponent(q)}`, 0);

  return (data?.items ?? []).slice(0, 8).map((item) => {
    if (item.type === "block" && item.block_number != null) {
      return {
        kind: "block" as const,
        href: `/explorer/block/${item.block_number}`,
        label: `Block #${item.block_number}`,
      };
    }
    if (item.type === "transaction" && item.transaction_hash) {
      return {
        kind: "transaction" as const,
        href: `/explorer/tx/${item.transaction_hash}`,
        label: "Transaction",
      };
    }
    if (item.address_hash) {
      return {
        kind: "address" as const,
        href: `/explorer/address/${item.address_hash}`,
        label: "Address",
      };
    }
    return { kind: "unknown" as const, href: "/explorer", label: q };
  });
}
