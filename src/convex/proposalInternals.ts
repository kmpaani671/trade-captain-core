/**
 * Internal proposal mutations, isolated from proposals.ts so the public
 * approveProposal action can call them through api.* without creating a
 * recursive-inference cycle.
 */

import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { getCurrentUser } from "./users";
import { claimProposal } from "./proposalCore";
import { applyDemoFill } from "./demoFill";
import { recordAudit } from "./auditLog";

/** Internal: claim a proposal atomically (used by the approve action). */
export const claimProposalInternal = internalMutation({
  args: { id: v.id("tradeProposals") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { ok: false as const, error: "Not authenticated" };
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== user._id) {
      return { ok: false as const, error: "Proposal not found." };
    }
    return await claimProposal(ctx, args.id);
  },
});

/** Internal: return a claimed proposal to PENDING (quote failed, etc). */
export const releaseProposalInternal = internalMutation({
  args: { id: v.id("tradeProposals") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { ok: false as const, error: "Not authenticated" };
    const row = await ctx.db.get(args.id);
    if (!row) return { ok: false as const, error: "Proposal not found." };
    if (row.status === "EXECUTING") {
      await ctx.db.patch(args.id, { status: "PENDING" });
    }
    return { ok: true as const };
  },
});

/** Internal: atomic demo fill for a claimed proposal, then mark EXECUTED. */
export const executeProposalInternal = internalMutation({
  args: {
    id: v.id("tradeProposals"),
    symbol: v.string(),
    side: v.union(v.literal("BUY"), v.literal("SELL")),
    notional: v.number(),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { ok: false as const, error: "Not authenticated" };
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== user._id) {
      return { ok: false as const, error: "Proposal not found." };
    }
    if (row.status !== "EXECUTING") {
      return { ok: false as const, error: `Proposal is ${row.status}.` };
    }
    const fill = await applyDemoFill(ctx, user._id, {
      symbol: args.symbol,
      side: args.side,
      notional: args.notional,
      price: args.price,
    });
    if (!fill.ok) return fill;
    await ctx.db.patch(args.id, { status: "EXECUTED" });
    await recordAudit(ctx, user._id, "PROPOSAL_APPROVED_EXECUTED", {
      id: args.id,
      symbol: args.symbol,
      side: args.side,
      notional: args.notional,
      price: args.price,
    });
    return { ...fill, ok: true as const };
  },
});