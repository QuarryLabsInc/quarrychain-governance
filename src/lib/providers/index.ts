import { createLiveWalletProvider } from "@/lib/providers/liveWallet";
import { createMockProvider } from "@/lib/providers/mock";
import type { DataProvider } from "@/lib/providers/types";

/**
 * Runtime provider resolution.
 *
 * NEXT_PUBLIC_DATA_MODE=mock  → simulated data (default; ships standalone)
 * NEXT_PUBLIC_DATA_MODE=live  → real chain data
 *
 * TO GO LIVE (registry/governance/delegation/admin): implement
 * createLiveProvider() satisfying the DataProvider interface in
 * src/lib/providers/types.ts, import it below, and set the env var. Blocked
 * today on Cosmos REST / CometBFT RPC not being publicly exposed — see
 * docs/integration.md §5.
 *
 * `wallet` is composed in for real regardless of NEXT_PUBLIC_DATA_MODE: it
 * reports on whatever address the RainbowKit ConnectButton actually
 * connected, which has nothing to do with the mock/live chain-state toggle —
 * and now that a real wallet can connect, showing that wallet fabricated
 * balances would be actively misleading rather than just a placeholder. See
 * src/lib/providers/liveWallet.ts for what is and isn't real there.
 */

let cached: DataProvider | null = null;

export function getProvider(): DataProvider {
  if (cached) return cached;

  const mode = process.env.NEXT_PUBLIC_DATA_MODE ?? "mock";

  if (mode === "live") {
    console.warn(
      "[quarrychain] NEXT_PUBLIC_DATA_MODE=live but no live provider is implemented yet for registry/governance/delegation/admin — falling back to mock for those. See docs/integration.md.",
    );
  }

  cached = { ...createMockProvider(), wallet: createLiveWalletProvider() };
  return cached;
}

export type { DataProvider } from "@/lib/providers/types";
