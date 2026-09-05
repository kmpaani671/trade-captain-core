import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

/**
 * Membership tiers. These entitle interface features and tooling depth.
 * They are NOT fee-for-service brokerage arrangements and never alter the
 * custody model: assets stay at the connected provider.
 */
export const TIERS = ["CORE", "PRO", "INSTITUTIONAL"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_FEATURES: Record<Tier, string[]> = {
  CORE: [
    "2 AI analyst slots",
    "1 trading bot",
    "Watchlist of 20 symbols",
    "Delayed market data",
    "Community support",
  ],
  PRO: [
    "10 AI analyst slots",
    "10 trading bots",
    "Unlimited watchlist",
    "Realtime market data mode",
    "Multi-provider risk view",
    "Priority support",
  ],
  INSTITUTIONAL: [
    "Unlimited AI analysts",
    "Unlimited bots",
    "Multi-account orchestration",
    "Dedicated compliance review",
    "Onboarding support",
  ],
};

export const getMembership = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
  },
});

/** Switch tier locally (self-serve). Payment wiring can be attached later. */
export const setTier = mutation({
  args: { tier: v.union(v.literal("CORE"), v.literal("PRO"), v.literal("INSTITUTIONAL")) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    const features = TIER_FEATURES[args.tier];
    if (existing) {
      await ctx.db.patch(existing._id, {
        tier: args.tier,
        status: "ACTIVE",
        features,
      });
      return existing._id;
    }
    return await ctx.db.insert("memberships", {
      userId: user._id,
      tier: args.tier,
      status: "ACTIVE",
      startedAt: Date.now(),
      features,
    });
  },
});
