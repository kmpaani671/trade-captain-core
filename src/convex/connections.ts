import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

/**
 * Provider connection registry.
 *
 * TradeCaptain is an orchestration/analytics/interface layer: customer assets
 * remain at the connected third-party provider, deposits/withdrawals are
 * executed by the provider, and TradeCaptain transmits authorized API
 * instructions. This table tracks the lifecycle state of each integration —
 * it never fabricates capabilities a provider does not offer.
 */

export const listConnections = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("providerConnections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const getConnection = query({
  args: { providerId: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return await ctx.db
      .query("providerConnections")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", user._id).eq("providerId", args.providerId),
      )
      .first();
  },
});

export const upsertConnection = mutation({
  args: {
    providerId: v.string(),
    category: v.union(
      v.literal("BROKERAGE"),
      v.literal("CRYPTO"),
      v.literal("INFRASTRUCTURE"),
    ),
    status: v.union(
      v.literal("AVAILABLE"),
      v.literal("SANDBOX"),
      v.literal("CONNECTED"),
      v.literal("AUTHORIZATION_REQUIRED"),
      v.literal("PARTNER_APPROVAL_REQUIRED"),
      v.literal("REGION_RESTRICTED"),
      v.literal("READ_ONLY"),
      v.literal("TRADING_ENABLED"),
      v.literal("UNSUPPORTED"),
      v.literal("DISABLED_FOR_COMPLIANCE"),
    ),
    environment: v.union(v.literal("SANDBOX"), v.literal("LIVE")),
    scopes: v.optional(v.array(v.string())),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const now = Date.now();

    // Enforce compliance gating at the data layer: a connection cannot be
    // moved to TRADING_ENABLED where flags disallow trading/crypto.
    if (
      args.status === "TRADING_ENABLED" ||
      args.status === "SANDBOX" ||
      args.status === "CONNECTED" ||
      args.status === "READ_ONLY"
    ) {
      const flags = await ctx.db
        .query("complianceFlags")
        .withIndex("by_jurisdiction", (q) => q.eq("country", "**").eq("region", "**"))
        .first();
      if (flags && !flags.tradingAllowed) {
        return {
          ok: false as const,
          error: "Trading is disabled for your jurisdiction by compliance flags.",
        };
      }
      if (
        flags &&
        !flags.cryptoAllowed &&
        args.category === "CRYPTO" &&
        args.status !== "SANDBOX"
      ) {
        return {
          ok: false as const,
          error: "Crypto connectivity is disabled for your jurisdiction by compliance flags.",
        };
      }
    }

    const existing = await ctx.db
      .query("providerConnections")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", user._id).eq("providerId", args.providerId),
      )
      .first();

    const payload = {
      userId: user._id,
      providerId: args.providerId,
      category: args.category,
      status: args.status,
      environment: args.environment,
      scopes: args.scopes,
      note: args.note,
      lastSyncedAt: now,
      connectedAt: existing?.connectedAt ?? (args.status === "AVAILABLE" ? undefined : now),
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return { ok: true as const, id: existing._id };
    }
    const id = await ctx.db.insert("providerConnections", payload);
    return { ok: true as const, id };
  },
});

export const removeConnection = mutation({
  args: { providerId: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("providerConnections")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", user._id).eq("providerId", args.providerId),
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);
    return { ok: true as const };
  },
});

/**
 * Demo-mode portfolio derived from sandbox connections. Clearly labeled as
 * paper/sandbox — never presented as live brokerage data.
 */
export const sandboxPositions = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const connections = await ctx.db
      .query("providerConnections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "SANDBOX"))
      .collect();
    return connections.map((c) => ({
      providerId: c.providerId,
      category: c.category,
      environment: c.environment,
    }));
  },
});
