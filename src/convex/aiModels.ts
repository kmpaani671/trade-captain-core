import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

/** AI model registry — user-configurable analyst slots. */
export const listModels = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("aiModels")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const upsertModel = mutation({
  args: {
    id: v.optional(v.id("aiModels")),
    name: v.string(),
    provider: v.string(),
    assetClasses: v.array(
      v.union(v.literal("EQUITIES"), v.literal("OPTIONS"), v.literal("CRYPTO")),
    ),
    riskProfile: v.union(
      v.literal("CONSERVATIVE"),
      v.literal("BALANCED"),
      v.literal("AGGRESSIVE"),
    ),
    enabled: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const slug = args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48);
    const payload = {
      userId: user._id,
      slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`,
      name: args.name,
      provider: args.provider,
      assetClasses: args.assetClasses,
      riskProfile: args.riskProfile,
      enabled: args.enabled,
      notes: args.notes,
      createdAt: Date.now(),
    };
    if (args.id) {
      await ctx.db.patch(args.id, {
        name: payload.name,
        provider: payload.provider,
        assetClasses: payload.assetClasses,
        riskProfile: payload.riskProfile,
        enabled: payload.enabled,
        notes: payload.notes,
      });
      return args.id;
    }
    return await ctx.db.insert("aiModels", payload);
  },
});

export const removeModel = mutation({
  args: { id: v.id("aiModels") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const model = await ctx.db.get(args.id);
    if (!model || model.userId !== user._id) throw new Error("Not found");
    await ctx.db.delete(args.id);
    return { ok: true as const };
  },
});

export const toggleModel = mutation({
  args: { id: v.id("aiModels"), enabled: v.boolean() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    const model = await ctx.db.get(args.id);
    if (!model || model.userId !== user._id) throw new Error("Not found");
    await ctx.db.patch(args.id, { enabled: args.enabled });
    return { ok: true as const };
  },
});
