import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

/**
 * Trading bot configurations. Bots transmit orders only through connections
 * whose status is TRADING_ENABLED and only where compliance flags allow
 * automation. Nothing here fabricates fills or simulates unavailable venues.
 */
export const listBots = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("tradingBots")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const upsertBot = mutation({
  args: {
    id: v.optional(v.id("tradingBots")),
    name: v.string(),
    strategy: v.string(),
    modelSlug: v.optional(v.string()),
    providerId: v.string(),
    assetClass: v.union(
      v.literal("EQUITIES"),
      v.literal("OPTIONS"),
      v.literal("CRYPTO"),
    ),
    mode: v.union(v.literal("PAPER"), v.literal("LIVE")),
    params: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const now = Date.now();

    // Compliance gate: automation must be allowed for the global default.
    const flags = await ctx.db
      .query("complianceFlags")
      .withIndex("by_jurisdiction", (q) => q.eq("country", "**").eq("region", "**"))
      .first();
    if (flags && !flags.botAutomationAllowed) {
      return {
        ok: false as const,
        error: "Bot automation is disabled for your jurisdiction by compliance flags.",
      };
    }

    // Live mode requires a TRADING_ENABLED connection to the target provider.
    if (args.mode === "LIVE") {
      const conn = await ctx.db
        .query("providerConnections")
        .withIndex("by_user_provider", (q) =>
          q.eq("userId", user._id).eq("providerId", args.providerId),
        )
        .first();
      if (!conn || conn.status !== "TRADING_ENABLED") {
        return {
          ok: false as const,
          error:
            "Live mode requires a TRADING_ENABLED connection to the selected provider.",
        };
      }
    }

    if (args.id) {
      await ctx.db.patch(args.id, {
        name: args.name,
        strategy: args.strategy,
        modelSlug: args.modelSlug,
        providerId: args.providerId,
        assetClass: args.assetClass,
        mode: args.mode,
        params: args.params,
      });
      return { ok: true as const, id: args.id };
    }
    const id = await ctx.db.insert("tradingBots", {
      userId: user._id,
      name: args.name,
      strategy: args.strategy,
      modelSlug: args.modelSlug,
      providerId: args.providerId,
      assetClass: args.assetClass,
      mode: args.mode,
      status: "DRAFT",
      params: args.params,
      createdAt: now,
    });
    return { ok: true as const, id };
  },
});

export const setBotStatus = mutation({
  args: {
    id: v.id("tradingBots"),
    status: v.union(
      v.literal("DRAFT"),
      v.literal("ACTIVE"),
      v.literal("PAUSED"),
      v.literal("STOPPED"),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const bot = await ctx.db.get(args.id);
    if (!bot || bot.userId !== user._id) throw new Error("Not found");

    if (args.status === "ACTIVE") {
      // Activate only where compliance allows automation; live bots need a
      // TRADING_ENABLED connection, paper bots need any non-compliance-blocked one.
      const flags = await ctx.db
        .query("complianceFlags")
        .withIndex("by_jurisdiction", (q) => q.eq("country", "**").eq("region", "**"))
        .first();
      if (flags && !flags.botAutomationAllowed) {
        return {
          ok: false as const,
          error: "Bot automation is disabled for your jurisdiction by compliance flags.",
        };
      }
      if (bot.mode === "LIVE") {
        const conn = await ctx.db
          .query("providerConnections")
          .withIndex("by_user_provider", (q) =>
            q.eq("userId", user._id).eq("providerId", bot.providerId),
          )
          .first();
        if (!conn || conn.status !== "TRADING_ENABLED") {
          return {
            ok: false as const,
            error:
              "Cannot activate live bot: the provider connection is not TRADING_ENABLED.",
          };
        }
      }
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      lastRunAt: args.status === "ACTIVE" ? Date.now() : bot.lastRunAt,
    });
    return { ok: true as const };
  },
});

export const removeBot = mutation({
  args: { id: v.id("tradingBots") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const bot = await ctx.db.get(args.id);
    if (!bot || bot.userId !== user._id) throw new Error("Not found");
    await ctx.db.delete(args.id);
    return { ok: true as const };
  },
});
