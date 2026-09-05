import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

/**
 * Delayed market snapshots for the watchlist and tape. Without a licensed
 * feed connected this is demo data, and the UI labels it as such. It is
 * never presented as live tradable prices.
 */

const SEED: Array<{
  symbol: string;
  assetClass: "EQUITIES" | "CRYPTO";
  price: number;
  changePct: number;
}> = [
  { symbol: "AAPL", assetClass: "EQUITIES", price: 231.4, changePct: 0.62 },
  { symbol: "NVDA", assetClass: "EQUITIES", price: 134.8, changePct: 1.84 },
  { symbol: "MSFT", assetClass: "EQUITIES", price: 428.1, changePct: -0.31 },
  { symbol: "TSLA", assetClass: "EQUITIES", price: 263.6, changePct: -1.12 },
  { symbol: "SPY", assetClass: "EQUITIES", price: 572.9, changePct: 0.24 },
  { symbol: "QQQ", assetClass: "EQUITIES", price: 491.3, changePct: 0.41 },
  { symbol: "BTC-USD", assetClass: "CRYPTO", price: 68420.0, changePct: 2.31 },
  { symbol: "ETH-USD", assetClass: "CRYPTO", price: 3480.5, changePct: 1.62 },
  { symbol: "SOL-USD", assetClass: "CRYPTO", price: 164.2, changePct: -0.87 },
];

/** Internal seeder, invoked via the ensureSeed action wrapper below. */
export const seedIfEmpty = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("marketCache").first();
    if (existing) return { seeded: false as const };
    for (const row of SEED) {
      await ctx.db.insert("marketCache", {
        symbol: row.symbol,
        assetClass: row.assetClass,
        price: row.price,
        changePct: row.changePct,
        updatedAt: Date.now(),
      });
    }
    return { seeded: true as const };
  },
});

/** Public query used by the UI tape and watchlist. */
export const listSnapshots = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("marketCache").collect();
  },
});

/** Idempotent seed action callable from the client. */
export const ensureSeed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("marketCache").first();
    if (existing) return { seeded: false as const };
    for (const row of SEED) {
      await ctx.db.insert("marketCache", {
        symbol: row.symbol,
        assetClass: row.assetClass,
        price: row.price,
        changePct: row.changePct,
        updatedAt: Date.now(),
      });
    }
    return { seeded: true as const };
  },
});

/** Watchlist management (per user). */
export const listWatchlist = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("watchlist")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const addToWatchlist = mutation({
  args: {
    symbol: v.string(),
    assetClass: v.union(
      v.literal("EQUITIES"),
      v.literal("OPTIONS"),
      v.literal("CRYPTO"),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const symbol = args.symbol.toUpperCase().trim();
    if (symbol.length === 0 || symbol.length > 16) {
      return { ok: false as const, error: "Invalid symbol." };
    }
    const dup = await ctx.db
      .query("watchlist")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("symbol"), symbol))
      .first();
    if (dup) return { ok: true as const, id: dup._id };
    const id = await ctx.db.insert("watchlist", {
      userId: user._id,
      symbol,
      assetClass: args.assetClass,
      addedAt: Date.now(),
    });
    return { ok: true as const, id };
  },
});

export const removeFromWatchlist = mutation({
  args: { id: v.id("watchlist") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== user._id) throw new Error("Not found");
    await ctx.db.delete(args.id);
    return { ok: true as const };
  },
});
