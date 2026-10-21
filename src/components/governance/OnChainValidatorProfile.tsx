import Link from "next/link";
import { ValidatorIcon } from "@/components/governance/ValidatorIcon";
import { explorerAddressUrl } from "@/lib/chain";
import { formatQry, shortenAddress, shortenHash } from "@/lib/format";
import type { OnChainValidator } from "@/lib/types";

/**
 * Public profile for a validator registered through /onboarding.
 *
 * Every value here is read from the chain (staking precompile + the
 * registration tx's calldata). Unlike MinerProfile it shows no uptime,
 * latency, or APY — there is no real source for those yet, and inventing
 * them for a real operator's page would misrepresent their node. No
 * Vote/Delegate CTA either: delegation is still mock, and a fake delegation
 * to a real validator is worse than none.
 */

const STATUS_LABEL: Record<OnChainValidator["status"], { text: string; tone: "ok" | "warn" | "bad" }> = {
  bonded: { text: "Active — Bonded", tone: "ok" },
  unbonding: { text: "Unbonding", tone: "warn" },
  unbonded: { text: "Registered — Outside Active Set", tone: "warn" },
  unspecified: { text: "Unknown status", tone: "warn" },
};

const TONE = {
  ok: "bg-success-tint text-success-deep",
  warn: "bg-warning-tint text-warning",
  bad: "bg-danger/10 text-danger",
} as const;

/** Link only shapes we can resolve safely; anything else renders as text. */
function socialHref(kind: "x" | "discord", value: string): string | null {
  if (kind === "x") {
    const handle = value.replace(/^@/, "").replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "");
    return /^[A-Za-z0-9_]{1,15}$/.test(handle) ? `https://x.com/${handle}` : null;
  }
  const m = value.match(/^(?:https?:\/\/)?((?:discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]+)$/i);
  return m ? `https://${m[1]}` : null;
}

function Social({ kind, label, value }: { kind: "x" | "discord"; label: string; value: string }) {
  const href = socialHref(kind, value);
  return href ? (
    <a href={href} target="_blank" rel="noreferrer nofollow" className="text-brand hover:underline">
      {label}: {value}
    </a>
  ) : (
    <span>
      {label}: {value}
    </span>
  );
}

/** Only render http(s) links from on-chain text — anyone can write it. */
const safeUrl = (url: string | null) => (url && /^https?:\/\//i.test(url) ? url : null);

export function OnChainValidatorProfile({ validator: v }: { validator: OnChainValidator }) {
  const status = v.jailed ? { text: "Jailed", tone: "bad" as const } : STATUS_LABEL[v.status];
  const name = v.name ?? shortenAddress(v.address);
  const website = safeUrl(v.website);

  return (
    <div className="space-y-6">
      <Link
        href="/governance"
        className="inline-block text-xs text-muted transition-colors hover:text-brand"
      >
        ← Back to registry
      </Link>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex min-w-0 items-start gap-4">
            <ValidatorIcon name={name} asset={null} size={56} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-2xl font-bold text-heading">{name}</h1>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TONE[status.tone]}`}
                >
                  {status.text}
                </span>
                <span className="rounded bg-brand-tint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                  on-chain
                </span>
              </div>
              <a
                href={explorerAddressUrl(v.address)}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block font-mono text-xs text-muted transition-colors hover:text-brand"
                title={v.address}
              >
                {shortenAddress(v.address)} ↗
              </a>
              <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-body">
                {website && (
                  <a href={website} target="_blank" rel="noreferrer nofollow" className="text-brand hover:underline">
                    {website.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗
                  </a>
                )}
                {v.socials.x && <Social kind="x" label="X" value={v.socials.x} />}
                {v.socials.discord && (
                  <Social kind="discord" label="Discord" value={v.socials.discord} />
                )}
              </p>
              {!v.name && (
                <p className="mt-2 text-[11px] text-muted">
                  No registration transaction found for this validator — it
                  may be a genesis validator, or the explorer hasn&apos;t
                  indexed it yet. Name and website are read from that
                  transaction.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-body">About</h2>
            <p className="max-w-3xl whitespace-pre-line text-sm leading-relaxed text-body">
              {v.description || "No description provided."}
            </p>
          </div>
        </div>

        <aside className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-body">On-Chain Record</h2>
          <dl className="divide-y divide-border">
            <Stat label="Bonded stake" value={formatQry(v.bondedQry)} />
            <Stat label="Commission" value={`${v.commissionPct.toFixed(2)}%`} />
            <Stat label="Jailed" value={v.jailed ? "Yes" : "No"} />
            <Stat label="Consensus key" value={shortenHash(v.consensusPubkey)} title={v.consensusPubkey} />
            {v.registrationTx && (
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-xs text-muted">Registration tx</dt>
                <dd className="font-mono text-xs font-bold">
                  <Link href={`/explorer/tx/${v.registrationTx}`} className="text-brand hover:underline">
                    {shortenHash(v.registrationTx)}
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-mono text-xs font-bold tabular-nums text-heading" title={title}>
        {value}
      </dd>
    </div>
  );
}
