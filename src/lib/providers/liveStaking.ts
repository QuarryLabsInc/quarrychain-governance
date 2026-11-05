import {
  decodeFunctionData,
  formatEther,
  isAddress,
  type WalletClient,
} from "viem";
import { getAddressCallsTo } from "@/lib/explorer/blockscout";
import { getProfile } from "@/lib/providers/profileStore";
import {
  COMMISSION,
  MIN_SELF_DELEGATION_WEI,
  SELF_BOND_WEI,
  STAKING_PRECOMPILE,
  bondStatusFromId,
  decodeDetails,
  encodeDetails,
  stakingAbi,
} from "@/lib/staking";
import { quarryChain } from "@/lib/wallet/chain";
import { publicClient } from "@/lib/wallet/publicClient";
import type { CreateValidatorRequest, OnChainValidator } from "@/lib/types";

/**
 * Real validator registration + reads, via the staking precompile.
 *
 * Live in both data modes, like checkNodeConnection: none of this needs the
 * (still unexposed) Cosmos REST API — only the public EVM JSON-RPC and the
 * operator's own wallet. Nothing here is simulated, and failures surface as
 * errors rather than as zeros or fake success.
 */

/** Cosmos `DoNotModifyDesc` — editValidator's "leave this field alone". */
const DO_NOT_MODIFY = "[do-not-modify]";

async function readValidator(address: `0x${string}`) {
  const v = await publicClient.readContract({
    address: STAKING_PRECOMPILE,
    abi: stakingAbi,
    functionName: "validator",
    args: [address],
  });
  // A non-validator comes back as an empty struct, not a revert.
  return v.operatorAddress ? v : null;
}

/** Native QRY balance in aqry — the denom staking actually draws from. Throws on RPC failure. */
export async function getStakingBalance(address: `0x${string}`): Promise<bigint> {
  return publicClient.getBalance({ address });
}

/**
 * Operator address already using this consensus key, or null. Checked across
 * every bond status — the chain rejects a reused key even if its validator is
 * unbonded.
 */
export async function findValidatorByConsensusKey(pubkey: string): Promise<string | null> {
  for (const status of ["BOND_STATUS_BONDED", "BOND_STATUS_UNBONDING", "BOND_STATUS_UNBONDED"]) {
    let key: `0x${string}` = "0x";
    do {
      const [validators, page] = await publicClient.readContract({
        address: STAKING_PRECOMPILE,
        abi: stakingAbi,
        functionName: "validators",
        args: [status, { key, offset: 0n, limit: 200n, countTotal: false, reverse: false }],
      });
      const hit = validators.find((v) => v.consensusPubkey === pubkey);
      if (hit) return hit.operatorAddress;
      key = page.nextKey;
    } while (key !== "0x");
  }
  return null;
}

/**
 * Sign and send create-validator from the operator's wallet. Simulates first,
 * so a doomed registration (duplicate key, short balance) fails with the
 * chain's reason before the wallet ever prompts.
 */
export async function registerValidator(
  req: CreateValidatorRequest,
  wallet: WalletClient,
): Promise<{ txHash: `0x${string}` }> {
  const { request } = await publicClient.simulateContract({
    account: req.validatorAddress,
    address: STAKING_PRECOMPILE,
    abi: stakingAbi,
    functionName: "createValidator",
    args: [
      {
        moniker: req.minerName.trim(),
        identity: "",
        website: req.website.trim(),
        securityContact: "",
        details: encodeDetails(req.description, req.socials),
      },
      COMMISSION,
      MIN_SELF_DELEGATION_WEI,
      req.validatorAddress,
      req.consensusPubkey,
      SELF_BOND_WEI,
    ],
  });

  const txHash = await wallet.writeContract({ ...request, chain: quarryChain });
  return { txHash };
}

/** Wait for the tx, then confirm the validator really exists on-chain. */
export async function waitForRegistration(
  txHash: `0x${string}`,
  address: `0x${string}`,
): Promise<OnChainValidator> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 120_000 });
  if (receipt.status !== "success") {
    throw new Error(`Registration transaction reverted (${txHash}).`);
  }
  const v = await getOnChainValidator(address, txHash);
  if (!v) throw new Error("Transaction confirmed, but the validator was not found on-chain.");
  return v;
}

/**
 * Recover moniker + website from the address's create-/edit-validator calls.
 * Prefers a known tx hash (straight from the RPC, no indexer); otherwise asks
 * Blockscout for the address's precompile calls.
 */
async function recoverDescription(
  address: `0x${string}`,
  knownTx?: `0x${string}`,
): Promise<{ name: string | null; website: string | null; tx: string | null }> {
  let calls: { hash: string; input: string }[] = [];
  if (knownTx) {
    const tx = await publicClient.getTransaction({ hash: knownTx }).catch(() => null);
    if (tx) calls = [{ hash: tx.hash, input: tx.input }];
  } else {
    calls = (await getAddressCallsTo(address, STAKING_PRECOMPILE)) ?? [];
  }

  let name: string | null = null;
  let website: string | null = null;
  let regTx: string | null = null;
  for (const call of calls) {
    let decoded;
    try {
      decoded = decodeFunctionData({ abi: stakingAbi, data: call.input as `0x${string}` });
    } catch {
      continue;
    }
    if (decoded.functionName === "createValidator") {
      const [d] = decoded.args;
      name = d.moniker || null;
      website = d.website || null;
      regTx = call.hash;
    } else if (decoded.functionName === "editValidator") {
      const [d] = decoded.args;
      if (d.moniker !== DO_NOT_MODIFY) name = d.moniker || null;
      if (d.website !== DO_NOT_MODIFY) website = d.website || null;
    }
  }
  return { name, website, tx: regTx };
}

export async function getOnChainValidator(
  address: string,
  knownTx?: `0x${string}`,
): Promise<OnChainValidator | null> {
  if (!isAddress(address)) return null;
  const v = await readValidator(address);
  if (!v) return null;

  const { description, socials } = decodeDetails(v.description.details);
  // Chain first: Cosmos EVM returns moniker and website directly. Calldata
  // recovery still supplies the registration tx; the Supabase mirror only
  // fills what the chain has no field for (logo, host), or a name/website if
  // the read came back empty.
  const [recovered, stored] = await Promise.all([
    recoverDescription(address, knownTx),
    getProfile(address),
  ]);

  return {
    address: v.operatorAddress,
    name: v.description.moniker || recovered.name || stored?.name || null,
    website: v.description.website || recovered.website || stored?.website || null,
    description,
    socials,
    consensusPubkey: v.consensusPubkey,
    status: bondStatusFromId(v.status),
    jailed: v.jailed,
    bondedQry: Number(formatEther(v.tokens)),
    commissionPct: Number(formatEther(v.commission)) * 100,
    registrationTx: recovered.tx ?? stored?.registrationTx ?? null,
    logoUrl: stored?.logoUrl ?? null,
    host: stored?.host ?? null,
  };
}
