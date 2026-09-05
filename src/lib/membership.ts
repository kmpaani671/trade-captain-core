/** Membership tier definitions shared by Convex functions and the client UI. */

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

export const TIER_BLURB: Record<Tier, string> = {
  CORE: "Everything you need to connect your first venue and observe.",
  PRO: "Deeper tooling for active multi-market operators.",
  INSTITUTIONAL: "Orchestration depth and dedicated compliance review.",
};

/** Entitlement limits enforced in the UI and mirrored by tier tooling. */
export const TIER_LIMITS: Record<Tier, { aiModels: number; bots: number }> = {
  CORE: { aiModels: 2, bots: 1 },
  PRO: { aiModels: 10, bots: 10 },
  INSTITUTIONAL: { aiModels: Number.POSITIVE_INFINITY, bots: Number.POSITIVE_INFINITY },
};

export function limitLabel(n: number): string {
  return Number.isFinite(n) ? String(n) : "Unlimited";
}
