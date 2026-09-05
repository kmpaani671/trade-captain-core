/**
 * Internal atomic fill for direct demo orders. Lives in its own module so
 * the public demoOrder action in demoTrading.ts can call it through api.*
 * without a recursive-inference cycle.
 */

import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { getCurrentUser } from "./users";
import { applyDemoFill } from "./demoFill";

export const executeDemoOrder = internalMutation({
  args: {
    symbol: v.string(),
    side: v.union(v.literal("BUY"), v.literal("SELL")),
    notional: v.number(),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    return await applyDemoFill(ctx, user._id, args);
  },
});