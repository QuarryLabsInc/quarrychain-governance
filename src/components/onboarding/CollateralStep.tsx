"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount, useSwitchChain, useWalletClient } from "wagmi";
import { WalletConnectButton } from "@/components/wallet/WalletConnectButton";
import { CHAIN, MIN_SELF_BOND_QRY } from "@/lib/chain";
import { formatQry, formatWei, shortenAddress, shortenHash } from "@/lib/format";
import { getProvider } from "@/lib/providers";
import {
  DESCRIPTION_LIMITS,
  SELF_BOND_WEI,
  describeStakingError,
  encodeDetails,
} from "@/lib/staking";
import type { OnChainValidator, ServerHost } from "@/lib/types";

/**
 * Step 3 — Collateral Lockup & Staking Activation.
 *
 * REAL: bonds MIN_SELF_BOND_QRY of the connected wallet's native QRY by
 * sending create-validator through the staking precompile. The wallet that
 * signs becomes the validator — the same wallet shown on /wallet.
 *
 * Gating is honest: the button stays disabled until the balance has actually
 * been read and covers the bond. A failed balance read is shown as a failure,
 * never as "0 QRY".
 */

export interface RegistrationInput {
  minerName: string;
  website: string;
  description: string;
  socials: { x?: string; discord?: string };
  host: ServerHost;
  peerId: string;
  consensusPubkey: string;
  rpcEndpoint: string;
}

type Balance =
  | { state: "loading" }
  | { state: "ok"; wei: bigint }
  | { state: "error"; message: string };

type Phase =
  | { kind: "idle" }
  | { kind: "signing" }
  | { kind: "confirming"; txHash: `0x${string}` }
  | { kind: "failed"; message: string; txHash?: `0x${string}` };

export function CollateralStep({
  input,
  onBack,
  onRegistered,
}: {
  input: RegistrationInput;
  onBack: () => void;
  onRegistered: (result: {
    validator: OnChainValidator;
    txHash: `0x${string}`;
    recordWarning: string | null;
  }) => void;
}) {
  const provider = getProvider();
  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain, isPending: switching } = useSwitchChain();

  const [balance, setBalance] = useState<Balance>({ state: "loading" });
  const [existing, setExisting] = useState<OnChainValidator | null>(null);
  // Which address `balance`/`existing` were read for, so stale results from a
  // previous account never gate the current one.
  const [readFor, setReadFor] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    Promise.all([
      provider.onboarding.getStakingBalance(address).then(
        (wei): Balance => ({ state: "ok", wei }),
        (err): Balance => ({ state: "error", message: describeStakingError(err) }),
      ),
      provider.registry.getOnChain(address).catch(() => null),
    ]).then(([nextBalance, nextExisting]) => {
      if (cancelled) return;
      setBalance(nextBalance);
      setExisting(nextExisting);
      setReadFor(address);
    });
    return () => {
      cancelled = true;
    };
  }, [address, provider]);

  const details = encodeDetails(input.description, input.socials);
  const limitErrors = [
    input.minerName.trim().length > DESCRIPTION_LIMITS.moniker &&
      `Miner name is ${input.minerName.trim().length}/${DESCRIPTION_LIMITS.moniker} characters.`,
    input.website.trim().length > DESCRIPTION_LIMITS.website &&
      `Website URL is ${input.website.trim().length}/${DESCRIPTION_LIMITS.website} characters.`,
    details.length > DESCRIPTION_LIMITS.details &&
      `Description plus socials is ${details.length}/${DESCRIPTION_LIMITS.details} characters on-chain.`,
  ].filter((e): e is string => Boolean(e));

  const ready = isConnected && address && readFor === address;
  const wrongChain = isConnected && chainId !== CHAIN.id;
  const currentBalance = ready ? balance : ({ state: "loading" } as Balance);
  const sufficient = currentBalance.state === "ok" && currentBalance.wei >= SELF_BOND_WEI;
  const busy = phase.kind === "signing" || phase.kind === "confirming";

  const canExecute =
    ready &&
    !wrongChain &&
    sufficient &&
    !existing &&
    limitErrors.length === 0 &&
    Boolean(walletClient) &&
    !busy;

  async function execute() {
    if (!address || !walletClient) return;
    setPhase({ kind: "signing" });
    let txHash: `0x${string}` | undefined;
    try {
      ({ txHash } = await provider.onboarding.registerValidator(
        {
          minerName: input.minerName,
          website: input.website,
          description: input.description,
          socials: input.socials,
          consensusPubkey: input.consensusPubkey,
          validatorAddress: address,
        },
        walletClient,
      ));
      setPhase({ kind: "confirming", txHash });
      const validator = await provider.onboarding.waitForRegistration(txHash, address);

      // The on-chain registration is done; the off-chain record (peer ID, RPC,
      // host) is best-effort and must not mask that success if it fails.
      let recordWarning: string | null = null;
      try {
        await provider.onboarding.submitApplication({
          minerName: input.minerName,
          website: input.website,
          description: input.description,
          socials: input.socials,
          host: input.host,
          nodePeerId: input.peerId,
          consensusPubkey: input.consensusPubkey,
          rpcEndpoint: input.rpcEndpoint,
          selfBondQry: MIN_SELF_BOND_QRY,
          validatorAddress: address,
          txHash,
        });
      } catch {
        recordWarning =
          "Your validator is registered on-chain, but saving your Peer ID and RPC endpoint failed.";
      }

      onRegistered({ validator, txHash, recordWarning });
    } catch (err) {
      setPhase({ kind: "failed", message: describeStakingError(err), txHash });
    }
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5 text-center">
          <span className="block text-[11px] uppercase tracking-wide text-muted">
            Required Self-Bond
          </span>
          <span className="font-mono text-2xl font-bold tabular-nums text-heading">
            {formatQry(MIN_SELF_BOND_QRY)}
          </span>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 text-center">
          <span className="block text-[11px] uppercase tracking-wide text-muted">
            Your Connected Balance
          </span>
          <span
            className={`font-mono text-2xl font-bold tabular-nums ${
              currentBalance.state === "ok" && !sufficient ? "text-danger" : "text-heading"
            }`}
          >
            {!isConnected
              ? "—"
              : currentBalance.state === "ok"
                ? formatWei(currentBalance.wei.toString(), 2)
                : currentBalance.state === "error"
                  ? "Unavailable"
                  : "…"}
          </span>
        </div>
      </div>
      <p className="-mt-2 text-center text-[11px] text-muted">
        Locked as your validator collateral. Slashable for double-signing or
        sustained downtime.
      </p>

      {/* Wallet state */}
      {!isConnected ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <span className="text-xs text-body">
            Connect the QRY wallet that will operate this validator.
          </span>
          <WalletConnectButton />
        </div>
      ) : wrongChain ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3">
          <span className="text-xs font-medium text-danger">
            Your wallet is on another network. Switch to {CHAIN.name} (chain {CHAIN.id}).
          </span>
          <button
            type="button"
            onClick={() => switchChain({ chainId: CHAIN.id })}
            disabled={switching}
            className="rounded-lg bg-brand px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {switching ? "Switching…" : "Switch network"}
          </button>
        </div>
      ) : currentBalance.state === "error" ? (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
          Could not read your QRY balance: {currentBalance.message}
        </p>
      ) : currentBalance.state === "ok" && !sufficient ? (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
          Insufficient QRY balance. Request test tokens from the Faucet.
        </p>
      ) : null}

      {existing && (
        <p className="rounded-lg border border-warning/30 bg-warning-tint px-3 py-2 text-xs font-medium text-warning">
          {shortenAddress(existing.address)} is already a validator.{" "}
          <Link href={`/governance/${existing.address}`} className="underline">
            View its validator page
          </Link>
          . Use a different wallet to register another node.
        </p>
      )}

      {limitErrors.length > 0 && (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
          {limitErrors.map((e) => (
            <p key={e}>{e} Shorten it in Profile &amp; Branding.</p>
          ))}
        </div>
      )}

      <dl className="divide-y divide-border rounded-lg border border-border bg-card px-4 text-xs">
        <Row label="Miner" value={input.minerName} />
        <Row label="Validator wallet" value={address ? shortenAddress(address) : "Not connected"} mono />
        <Row label="Infrastructure" value={input.host} />
        <Row label="Node verified" value={input.rpcEndpoint} mono />
        <Row label="Peer ID" value={shortenHash(input.peerId)} mono />
        <Row label="Commission" value="5% (max 20%, ±1%/day)" mono />
      </dl>

      <p className="rounded-lg border border-border bg-surface px-3 py-2 text-[11px] text-muted">
        This sends a real <code className="font-mono">create-validator</code>{" "}
        transaction from your wallet. Your name, website, description, and
        socials are written on-chain and appear on your validator page. The
        commission ceiling (20%) and max daily change (1%) are permanent.
      </p>

      {phase.kind === "failed" && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
          {phase.message}
          {phase.txHash && (
            <>
              {" "}
              <Link href={`/explorer/tx/${phase.txHash}`} className="font-mono underline">
                {shortenHash(phase.txHash)}
              </Link>
            </>
          )}
        </p>
      )}

      {phase.kind === "confirming" && (
        <p aria-live="polite" className="rounded-lg border border-brand/20 bg-brand-tint px-3 py-2 text-xs font-medium text-brand">
          Transaction sent — waiting for on-chain confirmation…{" "}
          <Link href={`/explorer/tx/${phase.txHash}`} className="font-mono underline">
            {shortenHash(phase.txHash)}
          </Link>
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="rounded-lg border border-border-strong bg-card px-4 py-2 text-sm font-bold text-body transition-colors hover:bg-surface disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={execute}
          disabled={!canExecute}
          className="flex-1 rounded-lg bg-brand py-2 text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {phase.kind === "signing"
            ? "Confirm in your wallet…"
            : phase.kind === "confirming"
              ? "Activating validator…"
              : "Execute Bond Deposit & Activate Validator"}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className={`truncate font-medium text-heading ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
