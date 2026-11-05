import type { WalletClient } from "viem";
import { registerMessage } from "@/lib/profileMessage";
import type { ServerHost, StoredProfile, ValidatorApplication } from "@/lib/types";

/**
 * Supabase validator profile store (quarrychain-governance-backend).
 *
 * Reads go straight to the REST API with the publishable key — the table is
 * public-read by RLS. Writes go ONLY through the `register-profile` Edge
 * Function, which verifies the wallet signature and the on-chain tx before
 * writing; the publishable key cannot write anything.
 *
 * The chain is the source of truth. Treat everything read here as a cache.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Columns the UI may render. Peer ID and RPC endpoint are never selected. */
const PUBLIC_COLUMNS = [
  "wallet_address",
  "miner_name",
  "website_url",
  "description",
  "social_x",
  "social_discord",
  "onchain_status",
  "bonded_qry",
  "logo_url",
  "server_host",
  "registration_tx",
  "chain_synced_at",
].join(",");

interface Row {
  wallet_address: string;
  miner_name: string | null;
  website_url: string | null;
  description: string | null;
  social_x: string | null;
  social_discord: string | null;
  onchain_status: StoredProfile["status"];
  bonded_qry: string | number | null;
  logo_url: string | null;
  server_host: ServerHost | null;
  registration_tx: string | null;
  chain_synced_at: string | null;
}

function fromRow(r: Row): StoredProfile {
  return {
    address: r.wallet_address,
    name: r.miner_name,
    website: r.website_url,
    description: r.description,
    socials: {
      ...(r.social_x ? { x: r.social_x } : {}),
      ...(r.social_discord ? { discord: r.social_discord } : {}),
    },
    status: r.onchain_status,
    bondedQry: r.bonded_qry === null ? null : Number(r.bonded_qry),
    logoUrl: r.logo_url,
    host: r.server_host,
    registrationTx: r.registration_tx,
    syncedAt: r.chain_synced_at,
  };
}

function requireConfig(): { url: string; key: string } {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Profile store not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return { url: SUPABASE_URL, key: SUPABASE_KEY };
}

async function select(query: string): Promise<Row[]> {
  const { url, key } = requireConfig();
  const res = await fetch(`${url}/rest/v1/validator_profiles?select=${PUBLIC_COLUMNS}&${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    // Cache briefly server-side; it's a mirror, not a live feed.
    next: { revalidate: 30 },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Profile store HTTP ${res.status}`);
  return (await res.json()) as Row[];
}

/** All stored profiles, largest stake first. Throws if the store is unreachable. */
export async function listProfiles(): Promise<StoredProfile[]> {
  const rows = await select("order=bonded_qry.desc.nullslast,miner_name.asc&limit=500");
  return rows.map(fromRow);
}

/** One profile, or null if none / store unreachable (callers fall back to the chain). */
export async function getProfile(address: string): Promise<StoredProfile | null> {
  try {
    const rows = await select(`wallet_address=eq.${encodeURIComponent(address.toLowerCase())}&limit=1`);
    return rows[0] ? fromRow(rows[0]) : null;
  } catch {
    return null;
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Publish the off-chain half of a registration. Asks the operator's wallet to
 * sign the register message (a signature, not a transaction — no gas), then
 * calls `register-profile`, which re-derives everything chain-known itself.
 *
 * Retries a 404 a few times: the function's RPC can be a block behind the one
 * the portal just saw the receipt on.
 */
export async function registerProfile(
  app: ValidatorApplication,
  wallet: WalletClient,
): Promise<{ id: string }> {
  const { url, key } = requireConfig();
  if (!app.validatorAddress || !app.txHash) {
    throw new Error("Register the validator on-chain before publishing its profile.");
  }

  const fields = {
    address: app.validatorAddress.toLowerCase(),
    txHash: app.txHash.toLowerCase(),
    peerId: app.nodePeerId,
    rpcEndpoint: app.rpcEndpoint,
    host: app.host,
    issuedAt: new Date().toISOString(),
  };
  const signature = await wallet.signMessage({
    account: app.validatorAddress as `0x${string}`,
    message: registerMessage(fields),
  });

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${url}/functions/v1/register-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key },
      body: JSON.stringify({ ...fields, signature }),
      signal: AbortSignal.timeout(30_000),
    });
    if (res.ok) return { id: fields.address };

    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    if (res.status === 404 && attempt < 3) {
      await delay(4000);
      continue;
    }
    throw new Error(body?.error ?? `Profile store returned HTTP ${res.status}.`);
  }
}
