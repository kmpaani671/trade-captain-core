import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    return settings ?? null;
  },
});

export const updateSettings = mutation({
  args: {
    defaultProviderId: v.optional(v.string()),
    acceptedDisclaimerAt: v.optional(v.number()),
    marketDataMode: v.optional(v.union(v.literal("DELAYED"), v.literal("REALTIME"))),
    notifications: v.optional(
      v.object({
        email: v.boolean(),
        botAlerts: v.boolean(),
        compliance: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("userSettings", { userId: user._id, ...args });
  },
});

/** Set jurisdiction (country + optional region) on the user profile. */
export const setJurisdiction = mutation({
  args: {
    country: v.string(),
    region: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    await ctx.db.patch(user._id, {
      jurisdiction: {
        country: args.country.toUpperCase().slice(0, 2),
        region: args.region ? args.region.toUpperCase().slice(0, 3) : undefined,
        confirmedAt: Date.now(),
      },
    });
    return { ok: true as const };
  },
});
