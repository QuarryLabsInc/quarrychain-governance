import { CHAIN } from "@/lib/chain";
import type { NodeCheckResult } from "@/lib/types";

/**
 * Real EVM JSON-RPC probe against a prospective validator's own node.
 *
 * This runs in BOTH mock and live mode — it needs no backend, just the
 * operator's RPC endpoint. It is the honest core of the onboarding wizard's
 * "Check Connection" step: we verify the node is actually up, on chain 13133,
 * synced, and peered. We never fake a pass.
 *
 * CAVEAT for the live integration: this is a browser-origin request, so the
 * operator's node must send permissive CORS headers. Most default node configs
 * do not. If that proves painful in the field, move this behind a tiny
 * server-side proxy route — the interface does not change.
 */

/** How far behind the network tip we still consider "synced". */
const SYNC_TOLERANCE_BLOCKS = 10;

/** Per-call timeout, per the onboarding spec. */
const RPC_TIMEOUT_MS = 5000;

async function rpc<T>(url: string, method: string, params: unknown[] = []): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? "RPC error");
  return json.result as T;
}

const hexToNumber = (hex: string) => Number.parseInt(hex, 16);

/** Current tip according to the public QuarryChain RPC, for comparison. */
async function networkTip(): Promise<number | null> {
  try {
    return hexToNumber(await rpc<string>(CHAIN.rpcUrl, "eth_blockNumber"));
  } catch {
    return null;
  }
}

export async function checkNodeConnection(rpcUrl: string): Promise<NodeCheckResult> {
  const empty: NodeCheckResult = {
    reachable: false,
    chainId: null,
    synced: false,
    height: null,
    blocksBehind: null,
    peerCount: null,
    error: null,
  };

  const trimmed = rpcUrl.trim();
  if (!trimmed) return { ...empty, error: "Enter your node's RPC endpoint." };
  if (!/^https?:\/\//i.test(trimmed)) {
    return { ...empty, error: "Endpoint must start with http:// or https://" };
  }

  try {
    const [chainIdHex, heightHex] = await Promise.all([
      rpc<string>(trimmed, "eth_chainId"),
      rpc<string>(trimmed, "eth_blockNumber"),
    ]);

    const chainId = hexToNumber(chainIdHex);
    const height = hexToNumber(heightHex);

    if (chainId !== CHAIN.id) {
      return {
        ...empty,
        reachable: true,
        chainId,
        height,
        error: `Node is on chain ${chainId}, expected ${CHAIN.id} (${CHAIN.name}). Check your genesis and chain-id config.`,
      };
    }

    // Peer count is advisory — some nodes disable the net_ namespace.
    let peerCount: number | null = null;
    try {
      peerCount = hexToNumber(await rpc<string>(trimmed, "net_peerCount"));
    } catch {
      peerCount = null;
    }

    const tip = await networkTip();
    const blocksBehind = tip === null ? null : Math.max(0, tip - height);
    const synced = blocksBehind === null ? false : blocksBehind <= SYNC_TOLERANCE_BLOCKS;

    return {
      reachable: true,
      chainId,
      synced,
      height,
      blocksBehind,
      peerCount,
      error: synced
        ? null
        : blocksBehind === null
          ? "Could not reach the public QuarryChain RPC to compare heights."
          : `Node is ${blocksBehind.toLocaleString()} blocks behind the network tip — still syncing.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      ...empty,
      error: `Unable to reach RPC (${message}). Check that port 8545 is open and CORS is enabled.`,
    };
  }
}
