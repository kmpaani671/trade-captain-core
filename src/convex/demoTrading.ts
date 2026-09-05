/**
 * Demo trading — a simulated ledger completely separate from real money.
 *
 * Ported from the TradeCaptain backend foundation:
 *  - Demo cash begins fresh on reset; funds are fictitious.
 *  - Every fill prices off a VERIFIED live Coinbase quote (never a fake
 *    price). If the quote fetch fails, the order fails — nothing is
 *    substituted.
 *  - Real balances are never touched here; providers remain the only
 *    source of real money values.
 */

import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser } from "./users";
import { CRYPTO_PRODUCTS, fetchCoinbaseQuote } from "./coinbase";
import { recordAudit } from "./auditLog";

export const MAX_DEMO_FUNDS = 100_000_000;

const quantizeCash = (n: number) => Math.round(n * 100) / 100;

/** Demo account + open positions in one read. */
export const getDemoAccount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { account: null as null, positions: [] as never[] };
    const account = await ctx.db
      .query("demoAccounts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    const positions = await ctx.db
      .query("demoPositions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.neq(q.field("qty"), 0))
      .collect();
    return {
      account,
      positions: positions.map((p) => ({
        symbol: p.symbol,
        qty: p.qty,
        avgPrice: p.avgPrice,
        marketValue: p.qty * p.avgPrice,
      })),
    };
  },
});

/** Create/reset the demo ledger with fresh simulated funds. */
export const resetDemo = mutation({
  args: { amount: v.number() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    if (!(args.amount > 0) || args.amount > MAX_DEMO_FUNDS) {
      return {
        ok: false as const,
        error: `Demo funds must be between $0.01 and $${MAX_DEMO_FUNDS.toLocaleString()}.`,
      };
    }
    const amount = quantizeCash(args.amount);
    const now = Date.now();
    const existing = await ctx.db
      .query("demoAccounts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        cash: amount,
        startingCash: amount,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("demoAccounts", {
        userId: user._id,
        cash: amount,
        startingCash: amount,
        createdAt: now,
        updatedAt: now,
      });
    }
    const old = await ctx.db
      .query("demoPositions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const p of old) await ctx.db.delete(p._id);
    await recordAudit(ctx, user._id, "DEMO_RESET", { amount });
    return { ok: true as const, cash: amount };
  },
});

/** Direct demo order: verify quote (action) -> atomic accounting (mutation). */
export const demoOrder = action({
  args: {
    symbol: v.string(),
    side: v.union(v.literal("BUY"), v.literal("SELL")),
    notional: v.number(),
  },
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
    const s = args.symbol.toUpperCase();
    if (!(s in CRYPTO_PRODUCTS) && !s.includes("-")) {
      return {
        ok: false as const,
        error:
          "Demo trading currently executes Coinbase crypto products only (BTC, ETH, SOL, XRP, DOGE, ADA, LTC, BCH, AVAX).",
      };
    }
    if (!(args.notional > 0)) {
      return { ok: false as const, error: "Notional must be greater than 0." };
    }
    let price: number;
    try {
      price = (await fetchCoinbaseQuote(s)).price;
    } catch (e) {
      return {
        ok: false as const,
        error:
          e instanceof Error
            ? e.message
            : "Market data unavailable — order not executed.",
      };
    }
    return await ctx.runMutation(internal.demoExecute.executeDemoOrder, {
      symbol: s,
      side: args.side,
      notional: args.notional,
      price,
    });
  },
});