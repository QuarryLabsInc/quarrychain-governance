"use client";

import { useState } from "react";
import { CHAIN } from "@/lib/chain";
import { getProvider } from "@/lib/providers";
import type { NodeCheckResult } from "@/lib/types";

/**
 * [Check Connection] — a REAL probe of the operator's own node.
 *
 * This is the one part of the onboarding flow that is not simulated. It calls
 * the operator's EVM JSON-RPC endpoint and asserts chain id, sync distance from
 * the public tip, and peer count. The spec's reference implementation is a 1.5s
 * setTimeout that always succeeds — which would tell an operator with a broken
 * node that everything is fine. We report exactly what we find.
 */

function Assertion({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-[11px]">
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${
          ok ? "bg-success" : "bg-danger"
        }`}
        aria-hidden="true"
      >
        {ok ? "✓" : "✕"}
      </span>
      <span className={ok ? "text-body" : "text-danger"}>{label}</span>
    </li>
  );
}

export function ConnectionCheck({
  onVerified,
}: {
  /** The endpoint that passed, or null whenever it is not (or no longer) verified. */
  onVerified: (verifiedUrl: string | null) => void;
}) {
  const [rpcUrl, setRpcUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<NodeCheckResult | null>(null);

  const passed = result?.reachable === true && result.synced && !result.error;

  async function runCheck() {
    setChecking(true);
    setResult(null);
    onVerified(null);
    try {
      const next = await getProvider().onboarding.checkNodeConnection(rpcUrl);
      setResult(next);
      onVerified(next.reachable && next.synced && !next.error ? rpcUrl.trim() : null);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label
          htmlFor="node-rpc"
          className="text-[11px] font-bold uppercase tracking-wider text-body"
        >
          Your Node&apos;s JSON-RPC Endpoint
        </label>
        <input
          id="node-rpc"
          type="url"
          value={rpcUrl}
          onChange={(e) => {
            setRpcUrl(e.target.value);
            setResult(null);
            onVerified(null);
          }}
          placeholder="http://your-server-ip:8545"
          className="w-full rounded-lg border border-border-strong bg-card px-3 py-2 font-mono text-sm text-ink transition-colors focus:border-brand focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runCheck}
          disabled={!rpcUrl.trim() || checking}
          className="rounded-lg border border-border-strong bg-card px-4 py-2 text-xs font-bold text-body transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
        >
          {checking ? "Pinging RPC cluster…" : "Check Connection"}
        </button>
        {passed && (
          <span className="text-xs font-semibold text-success">
            ✓ Connection Verified: Node is Synced and Responding
          </span>
        )}
      </div>

      {result && (
        <div className="animate-fade-in space-y-2 rounded-lg border border-border bg-surface p-3">
          <ul className="space-y-1.5">
            <Assertion ok={result.reachable} label="Endpoint reachable" />
            <Assertion
              ok={result.chainId === CHAIN.id}
              label={`Chain ID ${result.chainId ?? "—"} (expected ${CHAIN.id})`}
            />
            <Assertion
              ok={result.synced}
              label={
                result.blocksBehind === null
                  ? "Sync status unknown"
                  : `Synced — ${result.blocksBehind.toLocaleString()} blocks behind tip`
              }
            />
            <Assertion
              ok={(result.peerCount ?? 0) > 0}
              label={
                result.peerCount === null
                  ? "Peer count unavailable (net_ namespace disabled)"
                  : `${result.peerCount} peer${result.peerCount === 1 ? "" : "s"} connected`
              }
            />
          </ul>
          {result.error && (
            <p className="rounded border border-danger/30 bg-danger/10 px-2 py-1.5 text-[11px] font-medium text-danger">
              {result.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
