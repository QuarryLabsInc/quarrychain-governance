import type { Metadata } from "next";
import Link from "next/link";
import { ExplorerSearch } from "@/components/explorer/ExplorerSearch";
import { MetricCard } from "@/components/ui/MetricCard";
import { CHAIN } from "@/lib/chain";
import {
  getRecentBlocks,
  getRecentTransactions,
  getStats,
} from "@/lib/explorer/blockscout";
import { formatNumber, formatWei, shortenAddress, shortenHash, timeAgo } from "@/lib/format";

/**
 * Explorer overview.
 *
 * Real chain data, server-rendered. Unlike the rest of the suite this has no
 * mock layer — if Blockscout is unreachable the page degrades to an honest
 * empty state rather than showing invented activity.
 */

export const metadata: Metadata = {
  title: "Explorer — QuarryChain",
  description:
    "Blocks, transactions, and addresses on the QuarryChain testnet (chain 13133).",
};

export const revalidate = 10;

export default async function ExplorerPage() {
  const [stats, blocks, transactions] = await Promise.all([
    getStats(),
    getRecentBlocks(8),
    getRecentTransactions(8),
  ]);

  const unreachable = stats === null && blocks.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">QuarryChain Explorer</h1>
        <p className="mt-1 text-xs text-muted">
          Live chain data · chain ID {CHAIN.id} ·{" "}
          <a
            href={CHAIN.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="text-brand hover:underline"
          >
            Blockscout source ↗
          </a>
        </p>
      </div>

      <ExplorerSearch />

      {unreachable && (
        <p className="rounded-xl border border-warning/40 bg-warning-tint px-4 py-3 text-xs font-medium text-warning">
          Could not reach the chain indexer. This page shows live data only — it
          will populate once the indexer responds.
        </p>
      )}

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Latest Block"
            value={`#${formatNumber(stats.totalBlocks)}`}
            tone="brand"
          />
          <MetricCard
            label="Transactions"
            value={formatNumber(stats.totalTransactions)}
            hint="all time"
          />
          <MetricCard
            label="Addresses"
            value={formatNumber(stats.totalAddresses)}
          />
          <MetricCard
            label="Avg Block Time"
            value={`${(stats.averageBlockTime / 1000).toFixed(2)}s`}
            hint={`${stats.activeProposers.length} active proposers`}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent blocks */}
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-body">
              Latest Blocks
            </h2>
            <Link
              href="/explorer/blocks"
              className="text-[11px] font-semibold text-brand hover:underline"
            >
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {blocks.map((b) => (
              <li key={b.hash} className="flex items-center gap-3 px-5 py-3">
                <Link
                  href={`/explorer/block/${b.height}`}
                  className="font-mono text-xs font-bold text-brand hover:underline"
                >
                  #{formatNumber(b.height)}
                </Link>
                <span className="min-w-0 flex-1 truncate text-[11px] text-muted">
                  proposer{" "}
                  <Link
                    href={`/explorer/address/${b.proposer}`}
                    className="font-mono hover:text-brand hover:underline"
                  >
                    {shortenAddress(b.proposer)}
                  </Link>
                </span>
                <span className="font-mono text-[11px] text-body">
                  {b.transactionCount} txn{b.transactionCount === 1 ? "" : "s"}
                </span>
                <span className="w-16 text-right font-mono text-[11px] text-muted">
                  {timeAgo(b.timestamp)}
                </span>
              </li>
            ))}
            {blocks.length === 0 && (
              <li className="px-5 py-8 text-center text-xs text-muted">
                No blocks returned.
              </li>
            )}
          </ul>
        </section>

        {/* Recent transactions */}
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-body">
              Latest Transactions
            </h2>
            <Link
              href="/explorer/txs"
              className="text-[11px] font-semibold text-brand hover:underline"
            >
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {transactions.map((t) => (
              <li key={t.hash} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    t.status === "success" ? "bg-success" : "bg-danger"
                  }`}
                  aria-label={t.status}
                />
                <Link
                  href={`/explorer/tx/${t.hash}`}
                  className="min-w-0 flex-1 truncate font-mono text-xs text-brand hover:underline"
                >
                  {shortenHash(t.hash)}
                </Link>
                <span className="hidden font-mono text-[11px] text-muted sm:block">
                  {shortenAddress(t.from)}
                </span>
                <span className="w-20 text-right font-mono text-[11px] text-body">
                  {formatWei(t.value, 2)}
                </span>
                <span className="w-16 text-right font-mono text-[11px] text-muted">
                  {timeAgo(t.timestamp)}
                </span>
              </li>
            ))}
            {transactions.length === 0 && (
              <li className="px-5 py-8 text-center text-xs text-muted">
                No transactions yet on this testnet.
              </li>
            )}
          </ul>
        </section>
      </div>

      {stats && stats.totalTransactions < 100 && (
        <p className="text-[11px] text-muted">
          This is an early testnet — {formatNumber(stats.totalTransactions)}{" "}
          transactions across {formatNumber(stats.totalBlocks)} blocks. The
          explorer reflects real chain state and will fill out as the network is
          used.
        </p>
      )}
    </div>
  );
}
