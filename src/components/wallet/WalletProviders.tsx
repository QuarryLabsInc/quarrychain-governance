"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { useTheme } from "@/hooks/useTheme";
import { wagmiConfig } from "@/lib/wallet/wagmiConfig";

// Brand blue differs per theme (see AGENTS.md) — match RainbowKit's modal to it
// rather than leaving its default purple.
const rainbowLight = lightTheme({ accentColor: "#007BFF", borderRadius: "medium" });
const rainbowDark = darkTheme({ accentColor: "#3b82f6", borderRadius: "medium" });

export function WalletProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const { theme } = useTheme();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={theme === "dark" ? rainbowDark : rainbowLight}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
