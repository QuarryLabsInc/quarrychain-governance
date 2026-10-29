/**
 * The exact text a validator's wallet signs to publish its off-chain profile.
 *
 * MUST match quarrychain-governance-backend/supabase/functions/_shared/message.ts
 * byte for byte — field order, labels, lowercase, "\n" joins. Any drift makes
 * every signature fail with 401. Every field the backend writes from the
 * request is in here, so a captured signature can't be replayed with other
 * values.
 */

export interface RegisterMessageFields {
  /** lowercase 0x */
  address: string;
  /** lowercase 0x */
  txHash: string;
  /** 40 lowercase hex */
  peerId: string;
  rpcEndpoint: string;
  host: string;
  /** ISO 8601; the backend rejects > 10 min old or > 1 min in the future */
  issuedAt: string;
}

export function registerMessage(f: RegisterMessageFields): string {
  return [
    "QuarryChain validator profile",
    "action: register",
    `address: ${f.address}`,
    `tx: ${f.txHash}`,
    `peer: ${f.peerId}`,
    `rpc: ${f.rpcEndpoint}`,
    `host: ${f.host}`,
    `issued: ${f.issuedAt}`,
  ].join("\n");
}
