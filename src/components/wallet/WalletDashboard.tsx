"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ValidatorIcon } from "@/components/governance/ValidatorIcon";
import { MetricCard } from "@/components/ui/MetricCard";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { WalletConnectButton } from "@/components/wallet/WalletConnectButton";
import { formatNumber, shortenAddress } from "@/lib/format";
import { getProvider } from "@/lib/providers";
import type { ActiveDelegation, EarningsEvent, TokenBalance, WalletSummary } from "@/lib/types";

/**
 * Quarry Wallet Dashboard.
 *
 * Layout is based on the RWA Marketplace demo Alec referenced, with the RWA
 * Holdings section replaced by Manage Pool / Active Delegations (moved out of
 * the voting flow). Reports on whatever wallet is actually connected via the
 * header's ConnectButton — see src/lib/providers/liveWallet.ts for what's
 * real (QRY balance) versus honestly empty (delegations/staking rewards,
 * blocked on Cosmos REST not being public yet).
 */
export function WalletDashboard() {
  const { address, isConnected } = useAccount();
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  // Tracks which address `summary` was fetched for, so "loading" can be
  // derived instead of tracked via its own setState call in the effect below
  // (eslint's react-hooks/set-state-in-effect rule disallows calling setState
  // synchronously in an effect body — only from within the .then callback).
  const [fetchedFor, setFetchedFor] = useState<string | null>(null);
  const loading = Boolean(address) && fetchedFor !== address;

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    getProvider()
      .wallet.getSummary(address)
      .then((result) => {
        if (cancelled) return;
        setSummary(result);
        setFetchedFor(address);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint text-xl text-brand">
          <TokenLogo size={22} />
        </span>
        <h1 className="text-xl font-bold text-heading">Connect Your Wallet</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          Connect a wallet to view your real QRY balance on the QuarryChain
          testnet. Staking positions and rewards need the Cosmos staking
          module, which isn&apos;t publicly exposed yet — they&apos;ll show up
          here once it is.
        </p>
        <div className="mt-6 flex justify-center">
          <WalletConnectButton />
        </div>
      </div>
    );
  }

  if (loading || !summary) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted shadow-sm">
        Loading wallet…
      </div>
    );
  }

  return <ConnectedWallet summary={summary} />;
}

function ConnectedWallet({ summary }: { summary: WalletSummary }) {
  // Local delegation state so Vote Out / auto-compound feel live in the demo.
  const [delegations, setDelegations] = useState(summary.delegations);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const activeCount = delegations.length;
  const totalStaked = delegations.reduce((s, d) => s + d.delegatedQry, 0);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(summary.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  async function voteOut(id: string) {
    setBusy(id);
    try {
      await getProvider().delegation.undelegate(id);
      setDelegations((prev) => prev.filter((d) => d.validatorId !== id));
    } finally {
      setBusy(null);
    }
  }

  async function toggleAuto(id: string) {
    const target = delegations.find((d) => d.validatorId === id);
    if (!target) return;
    const next = !target.autoCompound;
    setDelegations((prev) =>
      prev.map((d) => (d.validatorId === id ? { ...d, autoCompound: next } : d)),
    );
    await getProvider().delegation.setAutoCompound(id, next);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-heading">
          <TokenLogo size={28} />
          QuarryWallet Dashboard
        </h1>
        <p className="mt-1 text-xs text-muted">
          Your QRY balances, delegations, and staking rewards.
        </p>
      </div>

      {/* Wallet address */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Wallet Address
          </span>
          <div className="mt-1 flex items-center gap-3">
            <span className="font-mono text-lg font-bold text-heading">
              {shortenAddress(summary.address)}
            </span>
            <button
              type="button"
              onClick={copyAddress}
              className="rounded-md border border-border-strong px-2 py-1 text-[11px] font-bold text-body transition-colors hover:border-brand hover:text-brand"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      {delegations.length === 0 && summary.balances.length > 0 && (
        <p className="rounded-xl border border-warning/40 bg-warning-tint px-4 py-3 text-xs font-medium text-warning">
          Staking positions and rewards aren&apos;t available yet — they read
          from the Cosmos staking module, which isn&apos;t publicly exposed on
          this testnet. QRY balance below is real.{" "}
          <Link href="/onboarding" className="underline">
            Become a miner
          </Link>{" "}
          to delegate once it is.
        </p>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Staked"
          value={
            totalStaked === 0 ? (
              "N/A"
            ) : (
              <span className="flex items-center gap-1.5">
                {formatNumber(totalStaked)} <TokenLogo size={16} />
              </span>
            )
          }
          tone="brand"
        />
        <MetricCard
          label="Today's Change"
          value={
            summary.todayChangeQry === 0 ? "N/A" : `+${summary.todayChangeQry.toFixed(1)} QRY`
          }
          hint={summary.todayChangeQry === 0 ? undefined : `+${summary.todayChangePct.toFixed(2)}%`}
          tone={summary.todayChangeQry === 0 ? "default" : "success"}
        />
        <MetricCard
          label="Total Yield Earned"
          value={summary.totalYieldQry === 0 ? "N/A" : `${formatNumber(summary.totalYieldQry)} QRY`}
        />
        <MetricCard label="Active Delegations" value={activeCount === 0 ? "N/A" : activeCount} />
      </div>

      {/* Crypto balances */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-body">
          Cryptocurrency Balances
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {summary.balances.map((b) => (
            // Symbol alone isn't unique — native QRY and the bridged QRY
            // ERC-20 both use `QRY`; name disambiguates them.
            <BalanceCard key={`${b.symbol}-${b.name}`} balance={b} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Manage Pool / Active Delegations (replaces RWA Holdings) */}
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-body">
              Manage Pool / Active Delegations
            </h2>
          </div>
          {delegations.length === 0 ? (
            <p className="px-6 py-10 text-center text-xs text-muted">
              No active delegations. Freeze QRY and vote to start earning.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-surface text-[11px] font-bold uppercase tracking-wider text-body">
                    {["Miner", "Delegated", "APY", "Rewards", "Auto", ""].map(
                      (h, i) => (
                        <th key={`${h}-${i}`} className="whitespace-nowrap px-4 py-3">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {delegations.map((d) => (
                    <DelegationRow
                      key={d.validatorId}
                      d={d}
                      busy={busy === d.validatorId}
                      onVoteOut={() => voteOut(d.validatorId)}
                      onToggleAuto={() => toggleAuto(d.validatorId)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Earnings feed */}
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-body">
              Earnings Feed
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {summary.earnings.map((e) => (
              <EarningsRow key={e.id} event={e} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function BalanceCard({ balance }: { balance: TokenBalance }) {
  const isQuarry = balance.symbol === "QRY";
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
      {isQuarry ? (
        <TokenLogo size={36} />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success text-sm font-bold text-white">
          ₮
        </span>
      )}
      <div>
        <span className="block text-sm font-bold text-heading">{balance.symbol}</span>
        <span className="block text-[11px] text-muted">{balance.name}</span>
        <span className="font-mono text-sm font-bold tabular-nums text-heading">
          {formatNumber(balance.amount)}
        </span>
      </div>
    </div>
  );
}

function DelegationRow({
  d,
  busy,
  onVoteOut,
  onToggleAuto,
}: {
  d: ActiveDelegation;
  busy: boolean;
  onVoteOut: () => void;
  onToggleAuto: () => void;
}) {
  return (
    <tr className="hover:bg-surface">
      <td className="px-4 py-3">
        <span className="flex items-center gap-2.5">
          <ValidatorIcon name={d.validatorName} asset={d.iconAsset} size={28} />
          <span className="font-semibold text-heading">{d.validatorName}</span>
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-1.5 font-mono tabular-nums text-heading">
          {formatNumber(d.delegatedQry)} <TokenLogo size={13} />
        </span>
      </td>
      <td className="px-4 py-3 font-mono font-bold text-success">{d.apyPct}%</td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-1.5 font-mono tabular-nums text-brand">
          +{formatNumber(d.rewardsEarned)} <TokenLogo size={13} />
        </span>
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          role="switch"
          aria-checked={d.autoCompound}
          aria-label={`Auto-compound for ${d.validatorName}`}
          onClick={onToggleAuto}
          className={`h-5 w-9 rounded-full p-0.5 transition-colors ${
            d.autoCompound ? "bg-success" : "bg-border-strong"
          }`}
        >
          <span
            className={`block h-4 w-4 rounded-full bg-white transition-transform ${
              d.autoCompound ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={onVoteOut}
          disabled={busy}
          className="rounded-md bg-danger px-2.5 py-1 text-[11px] font-bold text-white transition-colors hover:bg-danger-hover disabled:opacity-50"
        >
          {busy ? "…" : "Vote Out"}
        </button>
      </td>
    </tr>
  );
}

const EARNING_ICON: Record<EarningsEvent["kind"], string> = {
  received: "↓",
  compounded: "⟳",
  dividend: "✦",
};

function EarningsRow({ event }: { event: EarningsEvent }) {
  return (
    <li className="flex gap-3 px-6 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-sm text-brand">
        {EARNING_ICON[event.kind]}
      </span>
      <div className="min-w-0">
        <span className="block text-xs font-bold text-heading">{event.title}</span>
        <span className="block truncate text-[11px] text-muted">{event.detail}</span>
        <span className="text-[10px] text-faint">{event.when}</span>
      </div>
    </li>
  );
}
