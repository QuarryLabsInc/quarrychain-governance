import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAddress } from "viem";
import { MinerProfile } from "@/components/governance/MinerProfile";
import { OnChainValidatorProfile } from "@/components/governance/OnChainValidatorProfile";
import { getProvider } from "@/lib/providers";

/**
 * Quarry Miner detail page.
 *
 * Note the Next 16 signature: `params` is a Promise and must be awaited.
 *
 * Two kinds of id resolve here: registry slugs (prerendered), and 0x
 * addresses of validators registered on-chain via /onboarding (rendered on
 * demand from the staking precompile — new ones appear without a rebuild).
 */

/** On-chain lookups: cheap reads, but the chain changes — don't cache long. */
export const revalidate = 30;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const provider = getProvider();
  const [active, candidates] = await Promise.all([
    provider.registry.listActive(),
    provider.registry.listCandidates(),
  ]);
  return [...active, ...candidates].map((v) => ({ id: v.id }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const validator = await getProvider().registry.getById(id);
  if (!validator) {
    const onChain = isAddress(id) ? await getProvider().registry.getOnChain(id).catch(() => null) : null;
    if (!onChain) return { title: "Miner not found — QuarryChain" };
    const name = onChain.name ?? id;
    return {
      title: `${name} — QuarryChain Validator`,
      description: onChain.description || `On-chain validator record for ${name}.`,
    };
  }
  return {
    title: `${validator.name} — QuarryChain Quarry Miner`,
    description:
      validator.description ??
      `Consensus performance and delegation for ${validator.name}.`,
  };
}

export default async function MinerPage({ params }: PageProps) {
  const { id } = await params;
  const validator = await getProvider().registry.getById(id);
  if (validator) return <MinerProfile validator={validator} />;

  if (isAddress(id)) {
    // A chain outage should read as an error page, not "this validator
    // doesn't exist" — so only notFound() on a successful empty read.
    const onChain = await getProvider().registry.getOnChain(id);
    if (onChain) return <OnChainValidatorProfile validator={onChain} />;
  }

  notFound();
}
