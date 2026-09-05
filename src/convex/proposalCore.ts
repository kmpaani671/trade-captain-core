/**
 * Proposal core: TTL constant + atomic claim helper. Kept dependency-free
 * so proposals.ts (actions) and proposalInternals.ts (internal mutations)
 * can both use it without a module cycle.
 */

import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const PROPOSAL_TTL_MS = 5 * 60 * 1000;

export type ProposalRow = NonNullable<Awaited<ReturnType<MutationCtx["db"]["get"]>>>;

/**
 * Atomic claim: only one concurrent approval may win the PENDING row, and
 * expiry/state changes race safely. Returns the claimed row or a reason.
 */
export async function claimProposal(
  ctx: MutationCtx,
  proposalId: Id<"tradeProposals">,
): Promise<
  { ok: true; row: ProposalRow } | { ok: false; error: string }
> {
  const row = await ctx.db.get(proposalId);
  if (!row) return { ok: false as const, error: "Proposal not found." };
  if (row.status !== "PENDING") {
    return { ok: false as const, error: `Proposal is ${row.status}.` };
  }
  if (Date.now() > row.expiresAt) {
    await ctx.db.patch(proposalId, { status: "EXPIRED" });
    return { ok: false as const, error: "Proposal expired." };
  }
  await ctx.db.patch(proposalId, { status: "EXECUTING" });
  return { ok: true as const, row };
}