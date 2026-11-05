import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { ValidatorIcon } from "@/components/governance/ValidatorIcon";
import { formatQry, shortenAddress, timeAgo } from "@/lib/format";
import type { StoredProfile } from "@/lib/types";

/**
 * Validators who registered through /onboarding — REAL, unlike the demo
 * registry table above it. Read from the Supabase mirror for speed, so status
 * and stake are labelled with when they were last copied from the chain; each
 * row links to a page that re-reads the chain directly.
 */

const STATUS: Record<NonNullable<StoredProfile["status"]>, { text: string; className: string }> = {
  bonded: { text: "Bonded", className: "bg-success-tint text-success-deep" },
  unbonding: { text: "Unbonding", className: "bg-warning-tint text-warning" },
  unbonded: { text: "Outside active set", className: "bg-warning-tint text-warning" },
  jailed: { text: "Jailed", className: "bg-danger/10 text-danger" },
};

const HOST_LABEL = { AWS: "AWS", IONOS: "IONOS", BareMetal: "Bare metal" } as const;

export function RegisteredValidators({ profiles }: { profiles: StoredProfile[] | null }) {
  return (
    <Card className="mt-6">
      <CardHeader
        title="Registered On-Chain"
        subtitle="Validators who joined through the onboarding portal. Real chain data — each profile page re-checks it live."
        action={
          <Link
            href="/onboarding"
            className="whitespace-nowrap rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-hover"
          >
            Become a Miner
          </Link>
        }
      />

      {profiles === null ? (
        <p className="px-6 py-5 text-xs text-danger">
          The profile store is unreachable right now. Registered validators still
          exist on-chain — try again shortly.
        </p>
      ) : profiles.length === 0 ? (
        <p className="px-6 py-5 text-xs text-muted">
          No validators have registered through the portal yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-6 py-2.5 font-semibold">Validator</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Bonded</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Host</th>
                <th scope="col" className="px-6 py-2.5 text-right font-semibold">Synced</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {profiles.map((p) => {
                const name = p.name ?? shortenAddress(p.address);
                const status = p.status ? STATUS[p.status] : null;
                return (
                  <tr key={p.address} className="transition-colors hover:bg-surface">
                    <td className="px-6 py-3">
                      <Link href={`/governance/${p.address}`} className="flex items-center gap-2.5 hover:text-brand">
                        <ValidatorIcon name={name} asset={p.logoUrl} size={28} />
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-heading">{name}</span>
                          <span className="block font-mono text-[10px] text-muted">{shortenAddress(p.address)}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      {status ? (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${status.className}`}>
                          {status.text}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-heading">
                      {p.bondedQry === null ? "—" : formatQry(p.bondedQry)}
                    </td>
                    <td className="px-3 py-3 text-body">{p.host ? HOST_LABEL[p.host] : "—"}</td>
                    <td className="px-6 py-3 text-right font-mono text-[10px] text-muted">{timeAgo(p.syncedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
