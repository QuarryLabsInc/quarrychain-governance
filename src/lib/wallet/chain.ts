import { defineChain } from "viem";
import { CHAIN } from "@/lib/chain";

/** QuarryChain testnet, described for wagmi/viem/RainbowKit. Reuses the same constants the rest of the app reads off `CHAIN` — one source of truth for chain-id, RPC, and explorer URLs. */
export const quarryChain = defineChain({
  id: CHAIN.id,
  name: CHAIN.name,
  nativeCurrency: CHAIN.nativeCurrency,
  rpcUrls: {
    default: { http: [CHAIN.rpcUrl], webSocket: [CHAIN.wsUrl] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: CHAIN.explorerUrl },
  },
  testnet: true,
});
