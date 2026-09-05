/**
 * Audit trail for sensitive financial events (ported from the backend
 * foundation). recordAudit is a plain helper so any mutation can log
 * without nested runMutation (which mutations cannot call).
 */

import { query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";

export async function recordAudit(
  ctx: MutationCtx,
  userId: Id<"users">,
  event: string,
  data?: Record<string, unknown>,
) {
  const row: {
    userId: Id<"users">;
    event: string;
    data?: string;
    createdAt: number;
  } = {
    userId,
    event,
    createdAt: Date.now(),
  };
  if (data !== undefined && Object.keys(data).length > 0) {
    row.data = JSON.stringify(data);
  }
  await ctx.db.insert("auditLog", row);
}

/** Most recent financial events for the current user. */
export const listAudit = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("auditLog")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);
  },
});