import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { metaMaskWallet, rainbowWallet, safeWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { CHAIN } from "@/lib/chain";
import { quarryChain } from "@/lib/wallet/chain";

/**
 * WalletConnect needs a project id from cloud.reown.com (formerly
 * cloud.walletconnect.com) to talk to the relay — see NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
 * in .env.example. Without one, WalletConnect's QR/deep-link flow won't
 * authenticate; injected wallets (MetaMask etc.) are unaffected either way.
 * We don't fake a working id here — an honest connection failure beats a
 * silently broken one.
 */
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId && process.env.NODE_ENV !== "production") {
  console.warn(
    "[wallet] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set — the WalletConnect " +
      "connect option will fail. Get a free project id at https://cloud.reown.com. " +
      "Injected wallets (MetaMask, etc.) still work without it.",
  );
}

/**
 * A curated wallet list, not RainbowKit's `getDefaultConfig`/`getDefaultWallets`:
 * their default set includes a "Coinbase Wallet" entry that RainbowKit now
 * implements via wagmi's `baseAccount` connector (Coinbase's "Base Account"
 * SDK). That connector transitively pulls in `@coinbase/cdp-sdk`, which does
 * dynamic `import()`s of an experimental `@x402/*` payments SDK that isn't
 * published as a real installable package — Turbopack tries to statically
 * resolve those imports at build time and the whole app fails to compile.
 * Excluding it here is a build workaround, not a product decision; revisit if
 * a fixed RainbowKit/wagmi release lands.
 */
const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, walletConnectWallet, rainbowWallet, safeWallet],
    },
  ],
  {
    appName: "QuarryChain Governance",
    projectId: projectId || "unconfigured",
  },
);

export const wagmiConfig = createConfig({
  connectors,
  chains: [quarryChain],
  transports: { [quarryChain.id]: http(CHAIN.rpcUrl) },
  ssr: true,
});
