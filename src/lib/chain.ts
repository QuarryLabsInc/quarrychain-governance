/**
 * QuarryChain testnet constants.
 *
 * Restarted testnet (2026-11-05): Cosmos EVM v0.7.3 (`quarrychaind`), Cosmos
 * chain-id `quarrychain_13133-1`, EVM chain-id 13133 (0x334d), ~3.2s blocks.
 * (The first testnet, an Evmos v20 fork on EVM chain-id 1129, is retired.)
 *   - Cosmos-SDK chain, CometBFT consensus, EVM module
 *   - Public: EVM JSON-RPC + Blockscout. NOT public: Cosmos REST (:1317), CometBFT RPC (:26657)
 *
 * Validators are CometBFT validators: they register via a Cosmos `create-validator`
 * transaction carrying an ed25519 consensus pubkey plus a self-delegation of the
 * native QRY staking coin. There is NO ERC-20 "validator registry contract" —
 * see docs/integration.md before wiring the live provider.
 */

export const CHAIN = {
  /** EVM chain id. Verified via eth_chainId => 0x334d. */
  id: 13133,
  /** Cosmos chain id (gentx, `quarrychaind start --chain-id`). */
  cosmosChainId: "quarrychain_13133-1",
  name: "QuarryChain Testnet",
  nativeCurrency: { name: "Quarry", symbol: "QRY", decimals: 18 },
  rpcUrl: "https://rpc.testnet.quarrychain.network",
  /** Same EVM JSON-RPC node, over WebSocket. Public already — see guide.md. */
  wsUrl: "wss://rpc.testnet.quarrychain.network/ws",
  explorerUrl: "https://explorer.testnet.quarrychain.network",
  /** Observed average block time in ms. Drives the telemetry ticker cadence. */
  blockTimeMs: 3200,
} as const;

/**
 * Minimum self-bond to register as a validator — 10,000 QRY "for now", per
 * the onboarding requirements (2026-10-13; was 500,000 in the Phase 6 note).
 * Native QRY, not the bridged ERC-20: staking draws from the aqry bank balance.
 */
export const MIN_SELF_BOND_QRY = 10_000;

/** Size of the active consensus set. */
export const ACTIVE_SET_SIZE = 21;

export function explorerAddressUrl(address: string): string {
  return `${CHAIN.explorerUrl}/address/${address}`;
}

export function explorerBlockUrl(height: number): string {
  return `${CHAIN.explorerUrl}/block/${height}`;
}
