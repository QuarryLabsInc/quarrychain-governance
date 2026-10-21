import { ACTIVE_SET_SIZE, CHAIN, MIN_SELF_BOND_QRY } from "@/lib/chain";
import { bandwidthFor, energyFor } from "@/lib/voting";
import {
  MOCK_ACTIVE_VALIDATORS,
  MOCK_CANDIDATE_VALIDATORS,
} from "@/lib/mock/validators";
import { MOCK_WALLET } from "@/lib/mock/wallet";
import {
  findValidatorByConsensusKey,
  getOnChainValidator,
  getStakingBalance,
  registerValidator,
  waitForRegistration,
} from "@/lib/providers/liveStaking";
import { checkNodeConnection } from "@/lib/providers/node-check";
import type { DataProvider } from "@/lib/providers/types";
import type {
  Proposal,
  ServerHost,
  Validator,
  ValidatorApplication,
} from "@/lib/types";

/**
 * Mock provider — drives the entire app with simulated data.
 *
 * Per the Phase 6 spec, telemetry is deliberately simulated to give a "living
 * network" feel without depending on early-testnet stability. The one thing
 * that is NOT simulated is checkNodeConnection, which makes a real RPC call.
 */

const latency = <T,>(value: T, ms = 120): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

const MOCK_PROPOSALS: Proposal[] = [
  {
    id: "QC-Prop-04",
    title: "Adjust Block Size Limit",
    description:
      "Raise the per-block gas ceiling to accommodate higher throughput ahead of the QuarrySwap deployment.",
    status: "voting",
    tally: { aye: 12, nay: 3, abstain: 2 },
  },
  {
    id: "QC-Prop-05",
    title: "Reduce Minimum Self-Bond to 400,000 QRY",
    description:
      "Lower the validator entry threshold to broaden geographic participation during Phase 1.",
    status: "voting",
    tally: { aye: 6, nay: 9, abstain: 4 },
  },
];

/** Candidacies awaiting Phase-1 manual authorisation in the admin console. */
const MOCK_PENDING_APPLICATIONS: ValidatorApplication[] = [
  {
    minerName: "Northstar Validation",
    website: "https://northstar.example",
    description:
      "Independent operator running redundant capacity across two EU regions.",
    socials: { x: "@northstarval" },
    host: "IONOS",
    nodePeerId: "69929af9dd04b2e3537b0cc38d1180f2ff56691c",
    consensusPubkey: "0vV61WxyWU5Lz/tuhGHEkkpaYJZccVg/e8IIrk4m8ns=",
    rpcEndpoint: "https://rpc.northstar.example:8545",
    selfBondQry: MIN_SELF_BOND_QRY,
    validatorAddress: null,
    txHash: null,
  },
  {
    minerName: "Cinder Block Labs",
    website: "https://cinderblock.example",
    description: "Infrastructure co-op focused on low-cost bare-metal validation.",
    socials: { discord: "discord.gg/cinderblock" },
    host: "BareMetal",
    nodePeerId: "479b4f2a51f0818f429af607c588085cef410882",
    consensusPubkey: "N8xkmMghfx0IPp7Cp+hEfeJG9BpmB0EGwTQUWkDruyA=",
    rpcEndpoint: "https://rpc.cinderblock.example:8545",
    selfBondQry: MIN_SELF_BOND_QRY,
    validatorAddress: null,
    txHash: null,
  },
  {
    minerName: "Harbor Point Staking",
    website: "https://harborpoint.example",
    description: "Regional staking provider onboarding community delegators.",
    socials: {},
    host: "AWS",
    nodePeerId: "eb8413d79e052c162cfa2f206579bc5e248c6cf3",
    consensusPubkey: "0iI3quFFe1tzcoTIvkSSK5WaGKTV+srZUbgw4uVyyWg=",
    rpcEndpoint: "https://rpc.harborpoint.example:8545",
    selfBondQry: MIN_SELF_BOND_QRY,
    validatorAddress: null,
    txHash: null,
  },
];

function hostBreakdown(validators: Validator[]): Record<ServerHost, number> {
  const counts: Record<ServerHost, number> = { AWS: 0, IONOS: 0, BareMetal: 0 };
  for (const v of validators) counts[v.host] += 1;
  return counts;
}

export function createMockProvider(): DataProvider {
  // Seeded from the real observed tip so the demo starts plausibly.
  let height = 650_538;

  return {
    mode: "mock",

    registry: {
      listActive: () => latency(MOCK_ACTIVE_VALIDATORS.slice(0, ACTIVE_SET_SIZE)),
      listCandidates: () => latency(MOCK_CANDIDATE_VALIDATORS),
      getById: (id) =>
        latency(
          [...MOCK_ACTIVE_VALIDATORS, ...MOCK_CANDIDATE_VALIDATORS].find(
            (v) => v.id === id,
          ) ?? null,
        ),
      // Real read, even in mock mode — validators who onboarded are on-chain.
      getOnChain: (address) => getOnChainValidator(address),
    },

    telemetry: {
      getNetworkStatus: () =>
        latency({
          height,
          chainId: CHAIN.id,
          // Only nodes flagged isLiveNode actually exist today.
          activeNodes: MOCK_ACTIVE_VALIDATORS.filter((v) => v.isLiveNode).length,
          hostBreakdown: hostBreakdown(MOCK_ACTIVE_VALIDATORS),
          isLive: false,
        }),
      subscribeHeight: (onHeight) => {
        const timer = setInterval(() => {
          height += 1;
          onHeight(height);
        }, CHAIN.blockTimeMs);
        return () => clearInterval(timer);
      },
    },

    onboarding: {
      // Real calls, even in mock mode — onboarding never fakes the chain.
      checkNodeConnection,
      getStakingBalance,
      findValidatorByConsensusKey,
      registerValidator,
      waitForRegistration,
      submitApplication: (application: ValidatorApplication) =>
        latency({ id: `app_${application.minerName.toLowerCase().replace(/\s+/g, "_")}` }, 600),
      /*
       * Bring-up command, per the onboarding spec's template. Ports are right
       * for a CometBFT + EVM node; the image tag and Cosmos chain-id are NOT
       * confirmed by the chain team (integration.md, open questions 1-2), and
       * the UI says so next to the block. The spec's `quarrychain_1234-1` was
       * replaced: Evmos-style chain-ids embed the EVM id, which is 1129.
       *
       * No inline comments after a trailing `\` — that ends the line
       * continuation and breaks the command when pasted.
       */
      buildNodeCommand: (host) => {
        const firewall: Record<ServerHost, string[]> = {
          AWS: [
            "# AWS: allow inbound TCP 26656 (p2p) and 8545 (EVM RPC)",
            "# in the instance's security group before starting.",
          ],
          IONOS: [
            "# IONOS: allow inbound TCP 26656 (p2p) and 8545 (EVM RPC)",
            "# in the server's firewall policy before starting.",
          ],
          BareMetal: [
            "# Bare metal: open p2p and EVM RPC on the host firewall",
            "sudo ufw allow 26656/tcp && sudo ufw allow 8545/tcp",
          ],
        };
        return [
          ...firewall[host],
          "",
          "# Pull & launch QuarryChain Testnet Node Container",
          "# (CometBFT RPC 26657 stays bound to localhost)",
          "docker run -d --name quarrychain-node \\",
          "  -p 26656:26656 -p 8545:8545 -p 127.0.0.1:26657:26657 \\",
          "  -v ~/.quarrychain:/root/.quarrychain \\",
          "  quarrychain/node:testnet-latest \\",
          `  quarrychaind start --chain-id=quarrychain_${CHAIN.id}-1`,
        ].join("\n");
      },
    },

    delegation: {
      listForWallet: () => latency([]),
      // Ratios match the DPoS demo: Energy 0.1x, Bandwidth 0.3x.
      freeze: (amountQry) =>
        latency({ energy: energyFor(amountQry), bandwidth: bandwidthFor(amountQry) }, 400),
      delegate: () => latency({ txHash: `0x${"de1e6a7e".repeat(8)}` }, 700),
      undelegate: () => latency({ txHash: `0x${"c0ffee11".repeat(8)}` }, 700),
      setAutoCompound: () => latency(undefined, 200),
    },

    wallet: {
      getSummary: () => latency(MOCK_WALLET),
    },

    governance: {
      listProposals: () => latency(MOCK_PROPOSALS),
      castVote: () => latency({ txHash: `0x${"a1e0ba11".repeat(8)}` }, 600),
    },

    admin: {
      listPendingApplications: () => latency(MOCK_PENDING_APPLICATIONS),
      approveApplication: () => latency(undefined, 400),
      jail: () => latency(undefined, 400),
      slashAndEvict: () => latency(undefined, 600),
    },
  };
}
