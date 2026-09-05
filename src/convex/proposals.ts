/**
 * Semi-automatic trade proposals — the human-approval safety layer ported
 * from the TradeCaptain backend foundation.
 *
 * Flow: create (PENDING, 5-min TTL) -> human Approve or Decline.
 * Approval claims the proposal atomically (see proposalCore / internal
 * mutations), prices it against a VERIFIED live Coinbase quote, then
 * executes on the DEMO ledger only. LIVE-mode proposals are deliberately
 * refused until a real TRADING_ENABLED provider connection exists —
 * execution is never faked.
 */

import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getCurrentUser } from "./users";
import { fetchCoinbaseQuote } from "./coinbase";
import { recordAudit } from "./auditLog";
import { PROPOSAL_TTL_MS } from "./proposalCore";

/** Create a proposal (PENDING) that must be approved by a human. */
export const createProposal = mutation({
  args: {
    symbol: v.string(),
    side: v.union(v.literal("BUY"), v.literal("SELL")),
    notional: v.number(),
    strategy: v.string(),
    rationale: v.optional(v.string()),
    mode: v.optional(v.union(v.literal("DEMO"), v.literal("LIVE"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const symbol = args.symbol.toUpperCase().trim();
    if (!symbol || symbol.length > 16) {
      return { ok: false as const, error: "Invalid symbol." };
    }
    if (!(args.notional > 0)) {
      return { ok: false as const, error: "Notional must be greater than 0." };
    }
    const now = Date.now();
    const id = await ctx.db.insert("tradeProposals", {
      userId: user._id,
      mode: args.mode ?? "DEMO",
      symbol,
      side: args.side,
      notional: args.notional,
      strategy: args.strategy,
      rationale: args.rationale,
      status: "PENDING",
      createdAt: now,
      expiresAt: now + PROPOSAL_TTL_MS,
    });
    await recordAudit(ctx, user._id, "PROPOSAL_CREATED", {
      id,
      symbol,
      side: args.side,
      notional: args.notional,
      mode: args.mode ?? "DEMO",
    });
    return { ok: true as const, id };
  },
});

/** List own proposals, newest first, with server-assessed status. */
export const listProposals = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("tradeProposals")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
    const now = Date.now();
    return rows.map((r) => ({
      ...r,
      status: r.status === "PENDING" && now > r.expiresAt ? "EXPIRED" : r.status,
    }));
  },
});

/** Approve a proposal: claim -> execute on the demo ledger. */
export const approveProposal = action({
  args: { id: v.id("tradeProposals") },
  handler: async (ctx, args): Promise<
    | { ok: false; error: string }
    | {
        ok: true;
        mode: "DEMO";
        symbol: string;
        side: "BUY" | "SELL";
        price: number;
        quantity: number;
        cash: number;
      }
  > => {
    const userId = await ctx.runQuery(api.users.currentUser, {});
    if (!userId) return { ok: false as const, error: "Not authenticated" };
    const id = args.id;

    // LIVE proposals are deliberately blocked: real execution requires a
    // real authorized provider connection, which is not configured.
    const claim = await ctx.runMutation(internal.proposalInternals.claimProposalInternal, { id });
    if (!claim.ok) return claim;

    if (claim.row.mode !== "DEMO") {
      await ctx.runMutation(internal.proposalInternals.releaseProposalInternal, { id });
      return {
        ok: false as const,
        error:
          "Real trading is disabled until an authorized provider connection and production credentials are configured. Only DEMO mode executes.",
      };
    }

    let price: number;
    try {
      price = (await fetchCoinbaseQuote(claim.row.symbol)).price;
    } catch (e) {
      await ctx.runMutation(internal.proposalInternals.releaseProposalInternal, { id });
      return {
        ok: false as const,
        error:
          e instanceof Error
            ? e.message
            : "Market data unavailable — proposal not executed.",
      };
    }

    const fill = await ctx.runMutation(internal.proposalInternals.executeProposalInternal, {
      id,
      symbol: claim.row.symbol,
      side: claim.row.side,
      notional: claim.row.notional,
      price,
    });
    if (!fill.ok) {
      await ctx.runMutation(internal.proposalInternals.releaseProposalInternal, { id });
      return fill;
    }
    return { ...fill, ok: true as const };
  },
});

/** Decline a pending proposal. */
export const declineProposal = mutation({
  args: { id: v.id("tradeProposals") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== user._id) {
      return { ok: false as const, error: "Proposal not found." };
    }
    if (row.status === "PENDING") {
      await ctx.db.patch(args.id, { status: "DECLINED" });
      await recordAudit(ctx, user._id, "PROPOSAL_DECLINED", { id: args.id });
      return { ok: true as const };
    }
    return { ok: false as const, error: `Proposal is ${row.status}.` };
  },
});