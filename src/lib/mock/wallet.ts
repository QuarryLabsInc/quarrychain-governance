import { MOCK_ACTIVE_VALIDATORS } from "@/lib/mock/validators";
import type { WalletSummary } from "@/lib/types";

/**
 * Demo wallet summary for the Quarry Wallet Dashboard.
 *
 * Simulated — there is no connected wallet until Phase 6. The layout mirrors
 * the RWA Marketplace demo, with the holdings section replaced by active
 * delegations. A few representative delegations are seeded so the Manage Pool
 * section is populated, exactly as the reference demo's holdings table is.
 */

const [alohaBlocks, greymass, carpenter] = MOCK_ACTIVE_VALIDATORS;

const delegations = [
  { v: alohaBlocks, qry: 120_000, rewards: 4_204.5, auto: true },
  { v: greymass, qry: 60_000, rewards: 1_151.1, auto: false },
  { v: carpenter, qry: 40_000, rewards: 812.4, auto: true },
].map(({ v, qry, rewards, auto }) => ({
  validatorId: v.id,
  validatorName: v.name,
  iconAsset: v.iconAsset,
  delegatedQry: qry,
  apyPct: v.apyPct,
  rewardsEarned: rewards,
  autoCompound: auto,
}));

const totalStaked = delegations.reduce((s, d) => s + d.delegatedQry, 0);
const totalYield = delegations.reduce((s, d) => s + d.rewardsEarned, 0);

export const MOCK_WALLET: WalletSummary = {
  address: "0xJerry000000000000000000000000000000009b5A",
  totalStakedQry: totalStaked,
  todayChangeQry: 84.2,
  todayChangePct: 0.51,
  totalYieldQry: totalYield,
  balances: [
    { symbol: "QRY", name: "Quarry Token", amount: 1_250_000 },
    { symbol: "QSD", name: "Quarry Stable Dollar", amount: 15_000 },
    { symbol: "USDT", name: "Tether USD (QRC-20)", amount: 30_000 },
  ],
  delegations,
  earnings: [
    {
      id: "e1",
      kind: "received",
      title: "Received 12.40 QRY",
      detail: "Staking reward from Aloha Blocks",
      when: "1 minute ago",
    },
    {
      id: "e2",
      kind: "compounded",
      title: "Auto-compounded 8.05 QRY",
      detail: "Reinvested into Carpenter Union NFT",
      when: "4 minutes ago",
    },
    {
      id: "e3",
      kind: "dividend",
      title: "Epoch reward distributed",
      detail: "Greymass · epoch 64",
      when: "Today",
    },
  ],
};
