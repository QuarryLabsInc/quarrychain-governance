import { createPublicClient, http } from "viem";
import { CHAIN } from "@/lib/chain";
import { quarryChain } from "@/lib/wallet/chain";

/** Read-only client on the public EVM JSON-RPC. Shared by every live provider. */
export const publicClient = createPublicClient({
  chain: quarryChain,
  transport: http(CHAIN.rpcUrl),
});
