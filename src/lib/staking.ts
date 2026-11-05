import {
  BaseError,
  ContractFunctionRevertedError,
  UserRejectedRequestError,
  parseAbi,
  parseEther,
} from "viem";
import { MIN_SELF_BOND_QRY } from "@/lib/chain";

/**
 * QuarryChain staking precompile — how a browser wallet sends `create-validator`.
 *
 * The chain is Evmos-lineage (Cosmos-EVM), which exposes the Cosmos staking
 * module to the EVM at a fixed precompile address. Calling `createValidator`
 * there from MetaMask/Rabby IS the Cosmos `MsgCreateValidator` — same
 * validation, same bonded stake — with no Cosmos REST or Keplr needed.
 *
 * Verified against the live testnet 2026-10-13 by eth_call simulation:
 *   - selector and struct shapes below are accepted
 *   - staking denom is `aqry` (18 decimals, same as native EVM QRY)
 *   - `validatorAddress` must equal the tx sender
 *   - pubkey is a base64 ed25519 key; duplicates are rejected
 *   - create-validator is NOT permissioned on-chain: a funded wallet registers
 *     directly, there is no QuarryLabs approval gate at the protocol level
 *
 * The ABI matches Evmos v20, where `validator()` returns `description` as the
 * Details string only — moniker and website are not readable back from the
 * precompile and must be recovered from the registration tx calldata.
 */

export const STAKING_PRECOMPILE = "0x0000000000000000000000000000000000000800" as const;

export const stakingAbi = parseAbi([
  "struct Description { string moniker; string identity; string website; string securityContact; string details; }",
  "struct CommissionRates { uint256 rate; uint256 maxRate; uint256 maxChangeRate; }",
  "struct Validator { string operatorAddress; string consensusPubkey; bool jailed; uint8 status; uint256 tokens; uint256 delegatorShares; string description; int64 unbondingHeight; int64 unbondingTime; uint256 commission; uint256 minSelfDelegation; }",
  "struct PageRequest { bytes key; uint64 offset; uint64 limit; bool countTotal; bool reverse; }",
  "struct PageResponse { bytes nextKey; uint64 total; }",
  "function createValidator(Description description, CommissionRates commissionRates, uint256 minSelfDelegation, address validatorAddress, string pubkey, uint256 value) returns (bool success)",
  "function editValidator(Description description, address validatorAddress, int256 commissionRate, int256 minSelfDelegation) returns (bool success)",
  "function validator(address validatorAddress) view returns (Validator validator)",
  "function validators(string status, PageRequest pageRequest) view returns (Validator[] validators, PageResponse pageResponse)",
]);

/** Self-bond sent with create-validator, in aqry. */
export const SELF_BOND_WEI = parseEther(String(MIN_SELF_BOND_QRY));

/**
 * Commission terms. Not editable in the wizard (the spec has no field for
 * them); 5% matches every validator currently bonded on the testnet.
 * maxRate and maxChangeRate are PERMANENT once the validator exists — only
 * `rate` can be edited later, within those bounds.
 */
export const COMMISSION = {
  rate: parseEther("0.05"),
  maxRate: parseEther("0.20"),
  maxChangeRate: parseEther("0.01"),
} as const;

/**
 * On-chain `minSelfDelegation`, in aqry. Deliberately 1 (as the existing
 * validators use), not the 10,000 QRY floor: this value can only ever be
 * raised, and if self-stake falls below it the validator is jailed. The
 * 10,000 QRY floor is still enforced — by the amount bonded at creation.
 */
export const MIN_SELF_DELEGATION_WEI = 1n;

/** Cosmos SDK `Description` field limits (x/staking ValidateBasic). */
export const DESCRIPTION_LIMITS = {
  moniker: 70,
  website: 140,
  details: 280,
} as const;

/** Precompile status enum → label. */
export type BondStatus = "unspecified" | "unbonded" | "unbonding" | "bonded";
const STATUS_BY_ID: BondStatus[] = ["unspecified", "unbonded", "unbonding", "bonded"];
export const bondStatusFromId = (id: number): BondStatus => STATUS_BY_ID[id] ?? "unspecified";

/* ------------------------------------------------------- input parsing */

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * CometBFT node ID: 40 hex chars (`quarrychaind tendermint show-node-id`).
 * Also accepts the full `id@host:port` peer string and keeps the id.
 *
 * Rejects libp2p "12D3KooW…" IDs explicitly — the spec's example format is
 * from a different networking stack, and CometBFT will never emit one.
 */
export function parsePeerId(raw: string): Parsed<string> {
  const input = raw.trim();
  if (!input) return { ok: false, error: "Enter your node's Peer ID." };
  if (/^12D3KooW/.test(input) || /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(input)) {
    return {
      ok: false,
      error:
        "That's a libp2p peer ID. QuarryChain runs CometBFT, whose node IDs are 40 hex characters — run `quarrychaind tendermint show-node-id`.",
    };
  }
  const id = input.split("@")[0].toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(id)) {
    return {
      ok: false,
      error: "A CometBFT node ID is exactly 40 hex characters (0-9, a-f).",
    };
  }
  return { ok: true, value: id };
}

function base64ToBytes(b64: string): Uint8Array | null {
  try {
    const bin = atob(b64);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * ed25519 consensus pubkey, normalised to the base64 form the precompile
 * takes. Accepts, in order of how operators will most likely paste it:
 *   - the JSON `quarrychaind tendermint show-validator` prints
 *     {"@type":"/cosmos.crypto.ed25519.PubKey","key":"<base64>"}
 *   - the bare base64 key
 *   - 64-char hex (from priv_validator_key.json tooling)
 *
 * Legacy bech32 `…valconspub1…` keys are rejected with guidance rather than
 * decoded: current SDK versions don't print them, so seeing one means the
 * operator is reading stale docs or running the wrong binary.
 */
export function parseConsensusPubkey(raw: string): Parsed<string> {
  const input = raw.trim();
  if (!input) return { ok: false, error: "Enter your node's consensus public key." };

  let candidate = input;
  if (input.startsWith("{")) {
    try {
      const json = JSON.parse(input) as { "@type"?: string; key?: string };
      if (json["@type"] && !json["@type"].includes("ed25519")) {
        return { ok: false, error: `Expected an ed25519 key, got ${json["@type"]}.` };
      }
      if (!json.key) return { ok: false, error: "JSON is missing the \"key\" field." };
      candidate = json.key;
    } catch {
      return { ok: false, error: "That looks like JSON but doesn't parse." };
    }
  } else if (/valconspub1/.test(input)) {
    return {
      ok: false,
      error:
        "Legacy bech32 keys aren't accepted. Paste the JSON output of `quarrychaind tendermint show-validator` instead.",
    };
  }

  const hex = candidate.replace(/^0x/i, "");
  if (/^[0-9a-fA-F]{64}$/.test(hex)) {
    const bytes = Uint8Array.from(hex.match(/../g)!, (b) => Number.parseInt(b, 16));
    return { ok: true, value: bytesToBase64(bytes) };
  }

  const bytes = base64ToBytes(candidate);
  if (!bytes || bytes.length !== 32) {
    return {
      ok: false,
      error: "Not a valid ed25519 key — expected 32 bytes as base64, hex, or the show-validator JSON.",
    };
  }
  return { ok: true, value: bytesToBase64(bytes) };
}

/* ---------------------------------------- profile ↔ on-chain Description */

/**
 * Socials have no field in the Cosmos `Description`, so they ride at the end
 * of `details` in a fixed, parseable trailer. `details` is the one field the
 * precompile returns, so this keeps the whole public profile on-chain and
 * readable without an indexer.
 */
const SOCIALS_SEPARATOR = "\n\n";
const SOCIALS_TRAILER = /\n\n((?:X: \S+)(?: · Discord: \S+)?|(?:Discord: \S+))$/;

export function encodeDetails(
  description: string,
  socials: { x?: string; discord?: string },
): string {
  const parts = [
    socials.x?.trim() && `X: ${socials.x.trim().replace(/\s+/g, "")}`,
    socials.discord?.trim() && `Discord: ${socials.discord.trim().replace(/\s+/g, "")}`,
  ].filter(Boolean);
  const body = description.trim();
  if (parts.length === 0) return body;
  return `${body}${SOCIALS_SEPARATOR}${parts.join(" · ")}`;
}

export function decodeDetails(details: string): {
  description: string;
  socials: { x?: string; discord?: string };
} {
  const match = details.match(SOCIALS_TRAILER);
  if (!match) return { description: details.trim(), socials: {} };
  const trailer = match[1];
  return {
    description: details.slice(0, match.index).trim(),
    socials: {
      x: trailer.match(/X: (\S+)/)?.[1],
      discord: trailer.match(/Discord: (\S+)/)?.[1],
    },
  };
}

/* ----------------------------------------------------------- errors */

/**
 * Turn a viem/chain error into something an operator can act on. The chain's
 * own reason ("validator already exist for this pubkey", "insufficient
 * funds") is far more useful than viem's generic wrapper, so dig it out.
 */
export function describeStakingError(err: unknown): string {
  if (err instanceof BaseError) {
    if (err.walk((e) => e instanceof UserRejectedRequestError)) {
      return "Transaction rejected in your wallet. Nothing was sent.";
    }
    const reverted = err.walk((e) => e instanceof ContractFunctionRevertedError);
    const raw = (reverted as BaseError | null)?.details || err.details || err.shortMessage;
    // Cosmos errors arrive as "rpc error: code = Internal desc = <reason>".
    const reason = raw.split("desc = ").pop()?.trim() || raw;
    if (/insufficient funds/i.test(reason)) {
      return "Insufficient QRY balance to cover the self-bond plus gas. Request test tokens from the Faucet.";
    }
    return reason;
  }
  return err instanceof Error ? err.message : "Unknown error";
}
