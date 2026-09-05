import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Compliance flags: jurisdiction-scoped switches for regulated functionality.
 * These flags gate what the product may do per country/state/territory.
 * They are a control plane, not a legal determination — licensing advice
 * belongs with counsel, not with a feature flag.
 */

export const globalFlags = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("complianceFlags")
      .withIndex("by_jurisdiction", (q) => q.eq("country", "**").eq("region", "**"))
      .first();
  },
});

export const listFlags = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("complianceFlags").collect();
  },
});

export const resolveFlags = query({
  args: {
    country: v.string(),
    region: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const region = args.region && args.region.length > 0 ? args.region : "**";
    // Exact country+region match first, then country-wide, then global default.
    const exact =
      region !== "**"
        ? await ctx.db
            .query("complianceFlags")
            .withIndex("by_jurisdiction", (q) =>
              q.eq("country", args.country).eq("region", region),
            )
            .first()
        : undefined;
    const countryWide = await ctx.db
      .query("complianceFlags")
      .withIndex("by_jurisdiction", (q) =>
        q.eq("country", args.country).eq("region", "**"),
      )
      .first();
    const global = await ctx.db
      .query("complianceFlags")
      .withIndex("by_jurisdiction", (q) => q.eq("country", "**").eq("region", "**"))
      .first();

    const merged = {
      country: args.country,
      region,
      tradingAllowed: true,
      cryptoAllowed: true,
      optionsAllowed: true,
      botAutomationAllowed: true,
      note: undefined as string | undefined,
      source: "DEFAULT_OPEN" as "EXACT" | "COUNTRY" | "GLOBAL" | "DEFAULT_OPEN",
    };
    const apply = (row?: typeof exact) => {
      if (!row) return;
      merged.tradingAllowed = row.tradingAllowed;
      merged.cryptoAllowed = row.cryptoAllowed;
      merged.optionsAllowed = row.optionsAllowed;
      merged.botAutomationAllowed = row.botAutomationAllowed;
      merged.note = row.note ?? merged.note;
    };
    apply(global);
    if (merged.source === "DEFAULT_OPEN") merged.source = "GLOBAL";
    if (countryWide) {
      apply(countryWide);
      merged.source = "COUNTRY";
    }
    if (exact) {
      apply(exact);
      merged.source = "EXACT";
    }
    return merged;
  },
});

export const upsertFlag = mutation({
  args: {
    country: v.string(),
    region: v.optional(v.string()),
    tradingAllowed: v.boolean(),
    cryptoAllowed: v.boolean(),
    optionsAllowed: v.boolean(),
    botAutomationAllowed: v.boolean(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const region = args.region && args.region.length > 0 ? args.region : "**";
    const normalized = {
      country: args.country.toUpperCase().slice(0, 2),
      region: region.toUpperCase(),
    };
    const existing =
      region === "**"
        ? await ctx.db
            .query("complianceFlags")
            .withIndex("by_jurisdiction", (q) =>
              q.eq("country", normalized.country).eq("region", "**"),
            )
            .first()
        : await ctx.db
            .query("complianceFlags")
            .withIndex("by_jurisdiction", (q) =>
              q.eq("country", normalized.country).eq("region", normalized.region),
            )
            .first();
    const payload = {
      country: normalized.country,
      region: normalized.region,
      tradingAllowed: args.tradingAllowed,
      cryptoAllowed: args.cryptoAllowed,
      optionsAllowed: args.optionsAllowed,
      botAutomationAllowed: args.botAutomationAllowed,
      note: args.note,
      updatedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }
    return await ctx.db.insert("complianceFlags", payload);
  },
});

/** Seeds the global default row if absent. Safe to call from a UI button. */
export const ensureDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("complianceFlags")
      .withIndex("by_jurisdiction", (q) => q.eq("country", "**").eq("region", "**"))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("complianceFlags", {
      country: "**",
      region: "**",
      tradingAllowed: true,
      cryptoAllowed: true,
      optionsAllowed: true,
      botAutomationAllowed: true,
      note: "Default: all regulated functionality enabled pending per-jurisdiction review.",
      updatedAt: Date.now(),
    });
  },
});
