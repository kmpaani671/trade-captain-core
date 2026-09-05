import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

/**
 * Integration lifecycle states for every provider connection.
 * TradeCaptain never simulates unavailable functionality — each state maps
 * to a real, enforceable condition on the provider or compliance side.
 */
export const CONNECTION_STATES = [
  "AVAILABLE", // adapter exists; user has not connected yet
  "SANDBOX", // provider sandbox/paper credentials connected
  "CONNECTED", // live credentials connected, read scope confirmed
  "AUTHORIZATION_REQUIRED", // token expired/revoked; re-auth needed
  "PARTNER_APPROVAL_REQUIRED", // provider requires a partner agreement first
  "REGION_RESTRICTED", // provider does not serve user's jurisdiction
  "READ_ONLY", // connected with read scope only; trading disabled by scope
  "TRADING_ENABLED", // connected with trade scope; orders transmit
  "UNSUPPORTED", // no official authorized API for this capability
  "DISABLED_FOR_COMPLIANCE", // blocked by TradeCaptain compliance flags
] as const;

export const connectionStateValidator = v.union(
  ...CONNECTION_STATES.map((s) => v.literal(s)),
);
export type ConnectionStatus = Infer<typeof connectionStateValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove

      // TradeCaptain profile extensions
      jurisdiction: v.optional(
        v.object({
          country: v.optional(v.string()), // ISO 3166-1 alpha-2
          region: v.optional(v.string()), // state / territory code
          confirmedAt: v.optional(v.number()),
        }),
      ),
      tier: v.optional(
        v.union(
          v.literal("CORE"),
          v.literal("PRO"),
          v.literal("INSTITUTIONAL"),
        ),
      ),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    /**
     * One row per user x provider. Credentials (API keys / tokens) are stored
     * ONLY as opaque references issued by the server-side adapter layer —
     * never raw secrets. Customer assets remain at the connected provider.
     */
    providerConnections: defineTable({
      userId: v.id("users"),
      providerId: v.string(), // e.g. "alpaca", "coinbase_advanced"
      category: v.union(
        v.literal("BROKERAGE"),
        v.literal("CRYPTO"),
        v.literal("INFRASTRUCTURE"),
      ),
      status: connectionStateValidator,
      environment: v.union(v.literal("SANDBOX"), v.literal("LIVE")),
      credentialRef: v.optional(v.string()), // opaque server-side reference
      scopes: v.optional(v.array(v.string())),
      lastSyncedAt: v.optional(v.number()),
      connectedAt: v.optional(v.number()),
      note: v.optional(v.string()),
    })
      .index("by_user", ["userId"])
      .index("by_user_provider", ["userId", "providerId"]),

    /** Membership tiers (interface + tooling entitlements only). */
    memberships: defineTable({
      userId: v.id("users"),
      tier: v.union(
        v.literal("CORE"),
        v.literal("PRO"),
        v.literal("INSTITUTIONAL"),
      ),
      status: v.union(v.literal("ACTIVE"), v.literal("PENDING"), v.literal("NONE")),
      startedAt: v.number(),
      renewsAt: v.optional(v.number()),
      features: v.array(v.string()),
    }).index("by_user", ["userId"]),

    /** AI model registry — user-selectable analyst configurations. */
    aiModels: defineTable({
      userId: v.id("users"),
      slug: v.string(),
      name: v.string(),
      provider: v.string(), // e.g. "openai", "anthropic"
      assetClasses: v.array(v.string()),
      riskProfile: v.union(
        v.literal("CONSERVATIVE"),
        v.literal("BALANCED"),
        v.literal("AGGRESSIVE"),
      ),
      enabled: v.boolean(),
      notes: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_slug", ["userId", "slug"]),

    /**
     * Trading bot configurations. Bots transmit orders ONLY through
     * connections whose status is TRADING_ENABLED, and only where
     * compliance flags allow it.
     */
    tradingBots: defineTable({
      userId: v.id("users"),
      name: v.string(),
      strategy: v.string(),
      modelSlug: v.optional(v.string()), // linked AI analyst
      providerId: v.string(), // execution venue connection
      assetClass: v.union(
        v.literal("EQUITIES"),
        v.literal("OPTIONS"),
        v.literal("CRYPTO"),
      ),
      mode: v.union(v.literal("PAPER"), v.literal("LIVE")),
      status: v.union(
        v.literal("DRAFT"),
        v.literal("ACTIVE"),
        v.literal("PAUSED"),
        v.literal("STOPPED"),
      ),
      params: v.optional(v.string()), // JSON-encoded strategy parameters
      createdAt: v.number(),
      lastRunAt: v.optional(v.number()),
    })
      .index("by_user", ["userId"])
      .index("by_user_provider", ["userId", "providerId"]),

    /** User settings including jurisdiction + disclaimer acceptance. */
    userSettings: defineTable({
      userId: v.id("users"),
      theme: v.optional(v.union(v.literal("dark"), v.literal("light"))),
      defaultProviderId: v.optional(v.string()),
      acceptedDisclaimerAt: v.optional(v.number()),
      marketDataMode: v.optional(
        v.union(v.literal("DELAYED"), v.literal("REALTIME")),
      ),
      notifications: v.optional(
        v.object({
          email: v.boolean(),
          botAlerts: v.boolean(),
          compliance: v.boolean(),
        }),
      ),
    }).index("by_user", ["userId"]),

    /** Watchlist symbols for the trade desk. */
    watchlist: defineTable({
      userId: v.id("users"),
      symbol: v.string(),
      assetClass: v.union(
        v.literal("EQUITIES"),
        v.literal("OPTIONS"),
        v.literal("CRYPTO"),
      ),
      addedAt: v.number(),
    }).index("by_user", ["userId"]),

    /** Cached market snapshots (delayed demo data unless a licensed feed is connected). */
    marketCache: defineTable({
      symbol: v.string(),
      assetClass: v.union(
        v.literal("EQUITIES"),
        v.literal("OPTIONS"),
        v.literal("CRYPTO"),
      ),
      price: v.number(),
      changePct: v.number(),
      updatedAt: v.number(),
    }).index("by_symbol", ["symbol"]),

    /**
     * Global compliance flags. Regulated functionality can be disabled
     * per country/state/territory without a deploy.
     */
    complianceFlags: defineTable({
      country: v.string(), // ISO 3166-1 alpha-2 or "**" for global default
      region: v.optional(v.string()), // state/territory or "**"
      tradingAllowed: v.boolean(),
      cryptoAllowed: v.boolean(),
      optionsAllowed: v.boolean(),
      botAutomationAllowed: v.boolean(),
      note: v.optional(v.string()),
      updatedAt: v.number(),
    })
      .index("by_jurisdiction", ["country", "region"])
      .index("by_country", ["country"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
