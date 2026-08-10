"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { shortenAddress } from "@/lib/format";

/**
 * Re-skinned via ConnectButton.Custom to match the header's other pill
 * buttons (nav tabs, "Become a Miner") — RainbowKit's default ConnectButton
 * renders noticeably larger and doesn't take a size prop.
 */
export function WalletConnectButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;

        return (
          <div
            {...(!mounted && {
              "aria-hidden": true,
              style: { opacity: 0, pointerEvents: "none", userSelect: "none" },
            })}
          >
            {!connected ? (
              <button
                type="button"
                onClick={openConnectModal}
                className="whitespace-nowrap cursor-pointer rounded-lg bg-brand px-4 py-1.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
              >
                Connect Wallet
              </button>
            ) : chain.unsupported ? (
              <button
                type="button"
                onClick={openChainModal}
                className="whitespace-nowrap cursor-pointer rounded-lg border border-danger/40 bg-card px-4 py-1.5 text-sm font-bold text-danger transition-colors hover:border-danger/60"
              >
                Wrong network
              </button>
            ) : (
              <button
                type="button"
                onClick={openAccountModal}
                className="whitespace-nowrap cursor-pointer rounded-lg border border-border bg-card px-4 py-1.5 font-mono text-sm font-bold text-ink transition-colors hover:border-border-strong"
              >
                {account.displayName ?? shortenAddress(account.address)}
              </button>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
