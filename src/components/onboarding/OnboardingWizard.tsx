"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CollateralStep } from "@/components/onboarding/CollateralStep";
import { ConnectionCheck } from "@/components/onboarding/ConnectionCheck";
import { NodeCommandBlock } from "@/components/onboarding/NodeCommandBlock";
import { MIN_SELF_BOND_QRY } from "@/lib/chain";
import { formatQry, shortenAddress, shortenHash } from "@/lib/format";
import { getProvider } from "@/lib/providers";
import {
  DESCRIPTION_LIMITS,
  describeStakingError,
  parseConsensusPubkey,
  parsePeerId,
} from "@/lib/staking";
import type { OnChainValidator, ServerHost } from "@/lib/types";

/**
 * Module C — the "Become a Quarry Miner" onboarding wizard.
 *
 *   1. Profile & Branding
 *   2. Infrastructure Connection Config  (real RPC + consensus-key checks)
 *   3. Collateral Lockup                 (real create-validator tx)
 *
 * Registration on this chain is a Cosmos `create-validator` message carrying an
 * ed25519 consensus pubkey plus a native self-delegation — NOT an ERC-20
 * registry contract, despite the spec's wording. Step 3 sends it from the
 * operator's wallet through the staking precompile (src/lib/staking.ts). The
 * Step 1 profile is written into the validator's on-chain Description, which
 * is what /governance/[address] reads back. See docs/integration.md.
 */

const HOSTS: { value: ServerHost; label: string }[] = [
  { value: "AWS", label: "AWS Server Cluster" },
  { value: "IONOS", label: "IONOS Cloud Stack" },
  { value: "BareMetal", label: "Custom Bare Metal Host" },
];

const STEPS = ["Profile & Branding", "Connection Config", "Collateral Lockup"];

export function OnboardingWizard() {
  const [step, setStep] = useState(1);

  // Step 1
  const [minerName, setMinerName] = useState("");
  const [website, setWebsite] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [discord, setDiscord] = useState("");
  const [description, setDescription] = useState("");

  // Step 2
  const [host, setHost] = useState<ServerHost>("IONOS");
  const [peerId, setPeerId] = useState("");
  const [consensusKey, setConsensusKey] = useState("");
  const [verifiedRpc, setVerifiedRpc] = useState<string | null>(null);

  // Step 3
  const [registered, setRegistered] = useState<{
    validator: OnChainValidator;
    txHash: `0x${string}`;
    recordWarning: string | null;
  } | null>(null);

  const provider = getProvider();
  const command = provider.onboarding.buildNodeCommand(host);

  const peer = parsePeerId(peerId);
  const key = parseConsensusPubkey(consensusKey);
  const keyStatus = useConsensusKeyStatus(key.ok ? key.value : null);

  const step1Complete = minerName.trim().length > 0;
  const step2Complete =
    verifiedRpc !== null && peer.ok && key.ok && keyStatus.state === "free";

  if (registered) {
    const v = registered.validator;
    const bonded = v.status === "bonded";
    return (
      <div className="mx-auto max-w-xl animate-fade-in rounded-xl border border-success/30 bg-card p-8 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-tint text-xl text-success-deep">
          ✓
        </span>
        <h1 className="text-xl font-bold text-heading">Validator registered on-chain</h1>
        <span
          className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            bonded ? "bg-success-tint text-success-deep" : "bg-warning-tint text-warning"
          }`}
        >
          {bonded ? "Active — Bonded" : "Registered — Outside Active Set"}
        </span>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted">
          <strong className="text-heading">{minerName}</strong> bonded{" "}
          {formatQry(MIN_SELF_BOND_QRY)} from{" "}
          <span className="font-mono">{shortenAddress(v.address)}</span>.
          {bonded
            ? " Your node is in the consensus set and should start signing blocks."
            : " You'll enter the consensus set once your stake ranks high enough."}
        </p>
        <p className="mt-4 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-[11px] text-body">
          Tx:{" "}
          <Link href={`/explorer/tx/${registered.txHash}`} className="hover:text-brand">
            {shortenHash(registered.txHash)}
          </Link>
        </p>
        {registered.recordWarning && (
          <p className="mt-3 rounded-lg border border-warning/30 bg-warning-tint px-3 py-2 text-[11px] font-medium text-warning">
            {registered.recordWarning}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={`/governance/${v.address}`}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
          >
            View your validator page
          </Link>
          <Link
            href="/miner"
            className="rounded-lg border border-border-strong bg-card px-5 py-2.5 text-sm font-bold text-body transition-colors hover:bg-surface"
          >
            Go to your node dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="border-b border-border pb-4">
          <h1 className="text-xl font-bold text-heading">
            Quarry Miner Onboarding Portal
          </h1>
          <p className="mt-1 text-xs text-muted">
            Provision hardware, verify your node against the live testnet, and
            commit collateral to enter the active consensus set.
          </p>
        </div>

        {/* Step indicator */}
        <ol className="flex items-center justify-between gap-2 py-5 text-xs font-semibold text-muted">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                  step > i + 1
                    ? "bg-success text-white"
                    : step === i + 1
                      ? "bg-brand text-white"
                      : "bg-border text-muted"
                }`}
              >
                {step > i + 1 ? "✓" : i + 1}
              </span>
              <span className={step === i + 1 ? "text-brand" : ""}>{label}</span>
            </li>
          ))}
        </ol>

        {/* Step 1 — Profile & Branding */}
        {step === 1 && (
          <div className="animate-fade-in space-y-4">
            <Field
              id="miner-name"
              label="Miner Identification Name"
              value={minerName}
              onChange={setMinerName}
              placeholder="e.g., Global Mining Group"
              required
              maxLength={DESCRIPTION_LIMITS.moniker}
            />
            <Field
              id="miner-website"
              label="Website URL"
              value={website}
              onChange={setWebsite}
              placeholder="https://yournode.io"
              maxLength={DESCRIPTION_LIMITS.website}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="miner-x"
                label="X (Twitter)"
                value={xHandle}
                onChange={setXHandle}
                placeholder="@yournode"
              />
              <Field
                id="miner-discord"
                label="Discord"
                value={discord}
                onChange={setDiscord}
                placeholder="discord.gg/…"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="miner-description"
                className="text-[11px] font-bold uppercase tracking-wider text-body"
              >
                On-Chain Node Description
              </label>
              <textarea
                id="miner-description"
                rows={3}
                value={description}
                maxLength={DESCRIPTION_LIMITS.details}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Who you are and how you run your infrastructure. Shown on your public miner profile."
                className="w-full rounded-lg border border-border-strong bg-card px-3 py-2 text-sm text-ink transition-colors focus:border-brand focus:outline-none"
              />
            </div>

            <p className="text-[11px] text-muted">
              Logo upload lands with the campaign hub — drop assets in later from
              your node dashboard.
            </p>

            <button
              type="button"
              disabled={!step1Complete}
              onClick={() => setStep(2)}
              className="w-full rounded-lg bg-brand py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue to Node Configuration
            </button>
          </div>
        )}

        {/* Step 2 — Infrastructure */}
        {step === 2 && (
          <div className="animate-fade-in space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="server-host"
                className="text-[11px] font-bold uppercase tracking-wider text-body"
              >
                Server Host
              </label>
              <select
                id="server-host"
                value={host}
                onChange={(e) => setHost(e.target.value as ServerHost)}
                className="w-full rounded-lg border border-border-strong bg-card px-3 py-2 text-sm text-ink transition-colors focus:border-brand focus:outline-none"
              >
                {HOSTS.map((h) => (
                  <option key={h.value} value={h.value}>
                    {h.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-body">
                Node Deployment Command
              </span>
              <NodeCommandBlock command={command} />
              <div className="rounded-lg border border-border bg-surface px-3 py-2 text-[11px] text-body">
                <p className="font-semibold">To find your credentials on your server run:</p>
                <ul className="mt-1 space-y-0.5">
                  <li>
                    • Peer ID:{" "}
                    <code className="font-mono">quarrychaind tendermint show-node-id</code>
                  </li>
                  <li>
                    • Consensus PubKey:{" "}
                    <code className="font-mono">quarrychaind tendermint show-validator</code>
                  </li>
                </ul>
              </div>
            </div>

            <Field
              id="peer-id"
              label="Node Peer ID"
              value={peerId}
              onChange={setPeerId}
              placeholder="40-character hex node ID"
              mono
              error={peerId.trim() && !peer.ok ? peer.error : null}
            />
            <Field
              id="consensus-key"
              label="Consensus Public Key (ed25519)"
              value={consensusKey}
              onChange={setConsensusKey}
              placeholder='{"@type":"/cosmos.crypto.ed25519.PubKey","key":"…"}'
              mono
              error={
                consensusKey.trim() && !key.ok
                  ? key.error
                  : keyStatus.state === "taken"
                    ? `This key is already registered by validator ${shortenAddress(keyStatus.by)}. Each node needs its own consensus key.`
                    : keyStatus.state === "error"
                      ? `Could not check the key against the chain: ${keyStatus.message}`
                      : null
              }
              hint={
                keyStatus.state === "checking"
                  ? "Checking key against the validator set…"
                  : keyStatus.state === "free"
                    ? "✓ Valid ed25519 key, not yet registered"
                    : null
              }
            />

            <div className="rounded-lg border border-border bg-surface p-4">
              <ConnectionCheck onVerified={setVerifiedRpc} />
            </div>

            <div className="flex gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-lg border border-border-strong bg-card px-4 py-2 text-sm font-bold text-body transition-colors hover:bg-surface"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!step2Complete}
                onClick={() => setStep(3)}
                className="flex-1 rounded-lg bg-brand py-2 text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue to Collateral Lockup
              </button>
            </div>
            {!step2Complete && (
              <p className="text-[11px] text-muted">
                A verified node connection, a valid Peer ID, and an unregistered
                consensus key are all required before staking collateral.
              </p>
            )}
          </div>
        )}

        {/* Step 3 — Collateral */}
        {step === 3 && verifiedRpc && peer.ok && key.ok && (
          <CollateralStep
            input={{
              minerName,
              website,
              description,
              socials: { x: xHandle || undefined, discord: discord || undefined },
              host,
              peerId: peer.value,
              consensusPubkey: key.value,
              rpcEndpoint: verifiedRpc,
            }}
            onBack={() => setStep(2)}
            onRegistered={setRegistered}
          />
        )}
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  mono,
  maxLength,
  error,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  mono?: boolean;
  maxLength?: number;
  error?: string | null;
  hint?: string | null;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="text-[11px] font-bold uppercase tracking-wider text-body"
      >
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-note` : undefined}
        className={`w-full rounded-lg border bg-card px-3 py-2 text-sm text-ink transition-colors focus:border-brand focus:outline-none ${
          error ? "border-danger" : "border-border-strong"
        } ${mono ? "font-mono" : ""}`}
      />
      {(error || hint) && (
        <p
          id={`${id}-note`}
          className={`text-[11px] ${error ? "font-medium text-danger" : "text-success"}`}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

type KeyStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "free" }
  | { state: "taken"; by: string }
  | { state: "error"; message: string };

/**
 * Checks a well-formed consensus key against the live validator set. The
 * chain rejects a reused key anyway, but finding out at step 3 — after the
 * operator has connected a wallet and is ready to bond — is a bad time.
 */
function useConsensusKeyStatus(pubkey: string | null): KeyStatus {
  const [result, setResult] = useState<{ key: string; status: KeyStatus } | null>(null);

  useEffect(() => {
    if (!pubkey) return;
    let cancelled = false;
    getProvider()
      .onboarding.findValidatorByConsensusKey(pubkey)
      .then(
        (by): KeyStatus => (by ? { state: "taken", by } : { state: "free" }),
        (err): KeyStatus => ({ state: "error", message: describeStakingError(err) }),
      )
      .then((status) => {
        if (!cancelled) setResult({ key: pubkey, status });
      });
    return () => {
      cancelled = true;
    };
  }, [pubkey]);

  if (!pubkey) return { state: "idle" };
  return result?.key === pubkey ? result.status : { state: "checking" };
}
