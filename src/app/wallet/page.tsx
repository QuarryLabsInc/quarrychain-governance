import type { Metadata } from "next";
import { WalletDashboard } from "@/components/wallet/WalletDashboard";

export const metadata: Metadata = {
  title: "Quarry Wallet — QuarryChain",
  description:
    "Your QRY balances, active delegations, and staking rewards on the QuarryChain testnet.",
};

/**
 * The dashboard reports on whichever wallet the header's ConnectButton
 * connected — an inherently client-only, per-browser concept — so it fetches
 * its own summary client-side (still through getProvider(), same seam the
 * rest of the app uses). See WalletDashboard + src/lib/providers/liveWallet.ts.
 */
export default function WalletPage() {
  return <WalletDashboard />;
}
