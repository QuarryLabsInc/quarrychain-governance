import { GovernanceDashboard } from "@/components/governance/GovernanceDashboard";
import { RegisteredValidators } from "@/components/governance/RegisteredValidators";
import { getStats } from "@/lib/explorer/blockscout";
import { getProvider } from "@/lib/providers";

/**
 * Module A — Main Governance Dashboard.
 *
 * Server component: fetches the initial snapshot through the provider, then
 * hands off to the client shell which owns the live telemetry ticker.
 */
export default async function GovernancePage() {
  const provider = getProvider();
  // The validator registry is simulated, but the count of nodes actually
  // producing blocks comes from the real chain — see NetworkTopology.
  const [validators, status, chainStats, registered] = await Promise.all([
    provider.registry.listActive(),
    provider.telemetry.getNetworkStatus(),
    getStats(),
    // null = store unreachable; the section says so instead of showing "none".
    provider.registry.listRegistered().catch(() => null),
  ]);

  return (
    <GovernanceDashboard
      initialValidators={validators}
      // Seed the ticker from the real chain tip when reachable. The mock
      // provider's seed height drifts stale within hours, which made the
      // governance page and the explorer disagree about the same chain.
      status={{ ...status, height: chainStats?.latestHeight ?? status.height }}
      liveProposerCount={chainStats?.activeProposers.length ?? null}
      registered={<RegisteredValidators profiles={registered} />}
    />
  );
}
