/**
 * Shared demo fill engine — single serializable writer for the simulated
 * ledger, used by both direct demo orders and approved proposals.
 * Kept in its own module so demoTrading and proposals don't import each
 * other (which breaks recursive type inference in Convex actions).
 */

import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { recordAudit } from "./auditLog";

const quantizeCash = (n: number) => Math.round(n * 100) / 100;
const quantizeQty = (n: number) => Math.round(n * 1e8) / 1e8;

export async function applyDemoFill(
  ctx: MutationCtx,
  userId: Id<"users">,
  args: {
    symbol: string;
    side: "BUY" | "SELL";
    notional: number;
    price: number;
  },
) {
  const symbol = args.symbol.toUpperCase();
  const side = args.side;
  const notional = quantizeCash(args.notional);
  const price = args.price;
  const quantity = quantizeQty(notional / price);

  const account = await ctx.db
    .query("demoAccounts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (!account) {
    return { ok: false as const, error: "Create/reset the demo account first." };
  }

  let cash = account.cash;
  const position = await ctx.db
    .query("demoPositions")
    .withIndex("by_user_symbol", (q) =>
      q.eq("userId", userId).eq("symbol", symbol),
    )
    .first();
  const oldQty = position?.qty ?? 0;
  const oldAvg = position?.avgPrice ?? 0;
  let newQty = oldQty;
  let newAvg = oldAvg;

  if (side === "BUY") {
    if (cash < notional) {
      return { ok: false as const, error: "Insufficient demo cash." };
    }
    newQty = quantizeQty(oldQty + quantity);
    newAvg = newQty > 0 ? (oldQty * oldAvg + quantity * price) / newQty : 0;
    cash -= notional;
  } else {
    if (oldQty < quantity) {
      return { ok: false as const, error: "Insufficient demo position." };
    }
    newQty = quantizeQty(oldQty - quantity);
    newAvg = newQty > 0 ? oldAvg : 0;
    cash += notional;
  }

  cash = quantizeCash(cash);
  await ctx.db.patch(account._id, { cash, updatedAt: Date.now() });
  if (position) {
    await ctx.db.patch(position._id, { qty: newQty, avgPrice: newAvg });
  } else if (newQty > 0) {
    await ctx.db.insert("demoPositions", {
      userId,
      symbol,
      qty: newQty,
      avgPrice: newAvg,
    });
  }

  await recordAudit(ctx, userId, "DEMO_ORDER", {
    symbol,
    side,
    notional,
    price,
    quantity,
  });

  return {
    ok: true as const,
    mode: "DEMO" as const,
    symbol,
    side,
    price,
    quantity,
    cash,
  };
}