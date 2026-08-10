import { createPublicClient, formatEther, http, isAddress } from "viem";
import { CHAIN } from "@/lib/chain";
import { getAddressTokenBalances } from "@/lib/explorer/blockscout";
import { quarryChain } from "@/lib/wallet/chain";
import type { WalletProvider } from "@/lib/providers/types";
import type { TokenBalance, WalletSummary } from "@/lib/types";

/**
 * Real WalletProvider for the connected browser wallet.
 *
 * Unlike the rest of the app (still mock, pending Cosmos REST exposure — see
 * docs/integration.md), this is genuinely live for both balance sources:
 * `eth_getBalance` (native QRY, via the public EVM JSON-RPC) and every
 * ERC-20 Blockscout has indexed for the address (`getAddressTokenBalances`)
 * — no contract addresses hardcoded here. Balances are sorted descending by
 * amount. Native QRY and the "Bridged QRY" ERC-20 both use the symbol `QRY`;
 * both are shown, disambiguated by `name` — see TokenSymbol in
 * src/lib/types.ts.
 *
 * What's deliberately NOT here: totalStakedQry, totalYieldQry, delegations,
 * and earnings all come from the Cosmos staking/distribution modules, which
 * are not publicly exposed yet (`guide.md`, `docs/integration.md` §5). They're
 * zeroed/empty rather than fabricated — a real connected wallet showing fake
 * staking positions would be a much worse lie than the old all-mock page ever
 * was. Same reasoning for dropping the "KYC Certified / Accredited Investor /
 * ZKP Protected" badges the RWA-demo layout shipped with (WalletDashboard.tsx)
 * — there is no real attestation system behind them.
 */

const publicClient = createPublicClient({
  chain: quarryChain,
  transport: http(CHAIN.rpcUrl),
});

function emptySummary(address: string): WalletSummary {
  return {
    address,
    totalStakedQry: 0,
    todayChangeQry: 0,
    todayChangePct: 0,
    totalYieldQry: 0,
    balances: [],
    delegations: [],
    earnings: [],
  };
}

export function createLiveWalletProvider(): WalletProvider {
  return {
    async getSummary(address) {
      if (!address || !isAddress(address)) {
        return emptySummary(address ?? "");
      }

      // Independent sources (EVM RPC vs Blockscout REST) — fetch in parallel.
      // getAddressTokenBalances already degrades to [] on failure; the native
      // balance gets the same treatment here rather than crashing the page.
      const [qry, tokenBalances] = await Promise.all([
        publicClient
          .getBalance({ address })
          .then((wei) => Number(formatEther(wei)))
          .catch(() => 0),
        getAddressTokenBalances(address),
      ]);

      const balances: TokenBalance[] = [
        { symbol: "QRY", name: "Quarry Token", amount: qry },
        ...tokenBalances,
      ].sort((a, b) => b.amount - a.amount);

      return {
        ...emptySummary(address),
        balances,
      };
    },
  };
}
