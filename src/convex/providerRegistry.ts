/**
 * Provider adapter catalog (static metadata served through Convex).
 *
 * Each entry describes an adapter against the provider's CURRENT official
 * developer documentation. No endpoints, scopes or capabilities are
 * invented here: if a capability is not documented by the provider, the
 * adapter declares it UNSUPPORTED rather than faking it.
 */

import { v } from "convex/values";
import { query } from "./_generated/server";

export const ADAPTER_CAPABILITIES = [
  "authenticate",
  "refreshAuth",
  "getAccounts",
  "getBalances",
  "getBuyingPower",
  "getPositions",
  "getOrders",
  "getTransactions",
  "getQuotes",
  "getOrderBook",
  "getHistoricalData",
  "getOptionsChain",
  "getGreeks",
  "previewOrder",
  "placeOrder",
  "modifyOrder",
  "cancelOrder",
  "depositCapabilities",
  "withdrawalCapabilities",
  "requestWithdrawal",
  "recurringInvestmentCapabilities",
  "subscribeMarketData",
  "receiveWebhook",
  "getProviderRestrictions",
  "disconnect",
] as const;

export type AdapterCapability = (typeof ADAPTER_CAPABILITIES)[number];

export interface ProviderAdapterInfo {
  id: string;
  name: string;
  category: "BROKERAGE" | "CRYPTO" | "INFRASTRUCTURE";
  /** Status surfaced in the UI before the user connects. */
  availability:
    | "AVAILABLE"
    | "SANDBOX"
    | "PARTNER_APPROVAL_REQUIRED"
    | "REGION_RESTRICTED"
    | "UNSUPPORTED"
    | "DISABLED_FOR_COMPLIANCE";
  /** Official developer docs the adapter is written against. */
  docsUrl: string;
  authMode:
    | "OAUTH2"
    | "API_KEY"
    | "PARTNER_API"
    | "FIX_BRIDGE"
    | "MT5_MANAGER_API"
    | "NONE";
  /** Capabilities the adapter implements against official docs. */
  capabilities: readonly AdapterCapability[];
  /** Capabilities the provider does not offer — never simulated. */
  unsupported: readonly AdapterCapability[];
  regions: string[];
  note: string;
}

export const PROVIDER_REGISTRY: ProviderAdapterInfo[] = [
  // ─── Brokerage / securities ────────────────────────────────────────────
  {
    id: "interactive_brokers",
    name: "Interactive Brokers",
    category: "BROKERAGE",
    availability: "AVAILABLE",
    docsUrl: "https://interactivebrokers.github.io/cpwebapi/",
    authMode: "OAUTH2",
    capabilities: [
      "authenticate", "refreshAuth", "getAccounts", "getBalances",
      "getBuyingPower", "getPositions", "getOrders", "getTransactions",
      "getQuotes", "getOrderBook", "getHistoricalData", "getOptionsChain",
      "getGreeks", "previewOrder", "placeOrder", "modifyOrder", "cancelOrder",
      "depositCapabilities", "withdrawalCapabilities", "recurringInvestmentCapabilities",
      "subscribeMarketData", "receiveWebhook", "getProviderRestrictions", "disconnect",
    ],
    unsupported: ["requestWithdrawal"],
    regions: ["GLOBAL_EX_US_SANCTIONED"],
    note: "Client Portal Web API / TWS API. Withdrawals must be executed by the client at IBKR; no withdrawal-initiation endpoint is exposed.",
  },
  {
    id: "tradestation",
    name: "TradeStation",
    category: "BROKERAGE",
    availability: "AVAILABLE",
    docsUrl: "https://api.tradestation.com/docs/",
    authMode: "OAUTH2",
    capabilities: [
      "authenticate", "refreshAuth", "getAccounts", "getBalances",
      "getBuyingPower", "getPositions", "getOrders", "getTransactions",
      "getQuotes", "getOrderBook", "getHistoricalData", "getOptionsChain",
      "getGreeks", "previewOrder", "placeOrder", "modifyOrder", "cancelOrder",
      "subscribeMarketData", "receiveWebhook", "getProviderRestrictions", "disconnect",
    ],
    unsupported: [
      "depositCapabilities", "withdrawalCapabilities", "requestWithdrawal",
      "recurringInvestmentCapabilities",
    ],
    regions: ["US"],
    note: "TradeStation WebAPI with OAuth2. Money movement is performed at the provider, not through the API.",
  },
  {
    id: "tradier",
    name: "Tradier",
    category: "BROKERAGE",
    availability: "AVAILABLE",
    docsUrl: "https://documentation.tradier.com/",
    authMode: "OAUTH2",
    capabilities: [
      "authenticate", "refreshAuth", "getAccounts", "getBalances",
      "getBuyingPower", "getPositions", "getOrders", "getTransactions",
      "getQuotes", "getOrderBook", "getHistoricalData", "getOptionsChain",
      "getGreeks", "previewOrder", "placeOrder", "modifyOrder", "cancelOrder",
      "subscribeMarketData", "getProviderRestrictions", "disconnect",
    ],
    unsupported: [
      "depositCapabilities", "withdrawalCapabilities", "requestWithdrawal",
      "recurringInvestmentCapabilities", "receiveWebhook",
    ],
    regions: ["US"],
    note: "Tradier Brokerage API. Sandbox available for order simulation.",
  },
  {
    id: "public",
    name: "Public",
    category: "BROKERAGE",
    availability: "PARTNER_APPROVAL_REQUIRED",
    docsUrl: "https://public.com/docs",
    authMode: "PARTNER_API",
    capabilities: ["getAccounts", "getBalances", "getPositions", "getOrders"],
    unsupported: ["placeOrder", "modifyOrder", "cancelOrder", "requestWithdrawal"],
    regions: ["US"],
    note: "Access requires an approved partner agreement. Read-scope endpoints only until an agreement covers trading.",
  },
  {
    id: "alpaca",
    name: "Alpaca",
    category: "BROKERAGE",
    availability: "SANDBOX",
    docsUrl: "https://docs.alpaca.markets/",
    authMode: "API_KEY",
    capabilities: [
      "authenticate", "refreshAuth", "getAccounts", "getBalances",
      "getBuyingPower", "getPositions", "getOrders", "getTransactions",
      "getQuotes", "getOrderBook", "getHistoricalData", "getOptionsChain",
      "previewOrder", "placeOrder", "modifyOrder", "cancelOrder",
      "depositCapabilities", "withdrawalCapabilities", "recurringInvestmentCapabilities",
      "subscribeMarketData", "receiveWebhook", "getProviderRestrictions", "disconnect",
    ],
    unsupported: ["getGreeks", "requestWithdrawal"],
    regions: ["US", "GLOBAL_PAPER"],
    note: "Broker API + Trading API with paper trading. ACH transfers are provider-executed; recurring investment plan endpoints are documented.",
  },
  {
    id: "webull",
    name: "Webull",
    category: "BROKERAGE",
    availability: "PARTNER_APPROVAL_REQUIRED",
    docsUrl: "https://www.webull.com/API-doc",
    authMode: "PARTNER_API",
    capabilities: ["getAccounts", "getBalances", "getPositions", "getQuotes"],
    unsupported: ["placeOrder", "modifyOrder", "cancelOrder", "requestWithdrawal"],
    regions: ["US"],
    note: "OpenAPI access is gated behind Webull's developer/partner onboarding.",
  },
  {
    id: "moomoo",
    name: "moomoo",
    category: "BROKERAGE",
    availability: "PARTNER_APPROVAL_REQUIRED",
    docsUrl: "https://openapi.moomoo.com/",
    authMode: "PARTNER_API",
    capabilities: ["getAccounts", "getBalances", "getPositions", "getQuotes", "placeOrder"],
    unsupported: ["requestWithdrawal"],
    regions: ["US", "SG", "HK", "AU", "JP", "CA"],
    note: "OpenAPI (Futu) requires a gateway + brokerage account unlock; distribution varies by region.",
  },
  {
    id: "robinhood",
    name: "Robinhood",
    category: "BROKERAGE",
    availability: "UNSUPPORTED",
    docsUrl: "https://docs.robinhood.com/",
    authMode: "NONE",
    capabilities: ["getProviderRestrictions"],
    unsupported: [
      "placeOrder", "modifyOrder", "cancelOrder", "getBalances",
      "getPositions", "requestWithdrawal",
    ],
    regions: ["US"],
    note: "No publicly authorized retail trading API covering the full capability set; adapter remains a stub until an official partner program grants access. Nothing is simulated.",
  },

  // ─── Cryptocurrency ─────────────────────────────────────────────────────
  {
    id: "coinbase",
    name: "Coinbase",
    category: "CRYPTO",
    availability: "AVAILABLE",
    docsUrl: "https://docs.cdp.coinbase.com/",
    authMode: "OAUTH2",
    capabilities: [
      "authenticate", "refreshAuth", "getAccounts", "getBalances",
      "getTransactions", "getQuotes", "getHistoricalData",
      "depositCapabilities", "withdrawalCapabilities", "requestWithdrawal",
      "recurringInvestmentCapabilities", "subscribeMarketData", "receiveWebhook",
      "getProviderRestrictions", "disconnect",
    ],
    unsupported: ["getOptionsChain", "getGreeks"],
    regions: ["US", "EU", "UK", "CA", "SG", "AU"],
    note: "Coinbase Developer Platform. Deposit/withdrawal initiation exists on Coinbase's own ledger (provider-executed custody) — distinct from brokerage cash movement.",
  },
  {
    id: "coinbase_advanced",
    name: "Coinbase Advanced Trade",
    category: "CRYPTO",
    availability: "AVAILABLE",
    docsUrl: "https://docs.cdp.coinbase.com/advanced-trade/reference/advanced-trade-overview",
    authMode: "API_KEY",
    capabilities: [
      "authenticate", "getAccounts", "getBalances", "getPositions",
      "getOrders", "getTransactions", "getQuotes", "getOrderBook",
      "getHistoricalData", "previewOrder", "placeOrder", "modifyOrder",
      "cancelOrder", "subscribeMarketData", "receiveWebhook",
      "getProviderRestrictions", "disconnect",
    ],
    unsupported: ["getOptionsChain", "getGreeks", "requestWithdrawal"],
    regions: ["US", "EU", "UK", "CA", "SG", "AU"],
    note: "REST + WebSocket FIX for advanced orders. Withdrawals are not part of the Advanced Trade API.",
  },
  {
    id: "coinbase_wallet",
    name: "Coinbase Wallet (self-custody)",
    category: "CRYPTO",
    availability: "AVAILABLE",
    docsUrl: "https://www.coinbase.com/wallet/downloads",
    authMode: "NONE",
    capabilities: ["getBalances", "getTransactions", "getQuotes", "getHistoricalData"],
    unsupported: ["placeOrder", "modifyOrder", "cancelOrder", "requestWithdrawal"],
    regions: ["GLOBAL"],
    note: "Read-only on-chain balance/tx view via public RPC for WalletLink-compatible addresses. Keys never leave the user's wallet.",
  },
  {
    id: "crypto_com",
    name: "Crypto.com",
    category: "CRYPTO",
    availability: "PARTNER_APPROVAL_REQUIRED",
    docsUrl: "https://developer.crypto.com/",
    authMode: "PARTNER_API",
    capabilities: ["getAccounts", "getBalances", "getQuotes", "getOrderBook"],
    unsupported: ["placeOrder", "requestWithdrawal"],
    regions: ["GLOBAL_REGIONAL"],
    note: "Exchange API access requires institution/partner onboarding; the retail app API is not generally available.",
  },

  // ─── Trading infrastructure ─────────────────────────────────────────────
  {
    id: "mt5",
    name: "MetaTrader 5",
    category: "INFRASTRUCTURE",
    availability: "PARTNER_APPROVAL_REQUIRED",
    docsUrl: "https://www.mql5.com/en/docs/integration",
    authMode: "MT5_MANAGER_API",
    capabilities: ["getAccounts", "getBalances", "getPositions", "getOrders", "placeOrder"],
    unsupported: ["requestWithdrawal"],
    regions: ["GLOBAL_VIA_BROKERS"],
    note: "Requires an MT5 Manager API gateway operated by a supported broker; per-broker availability differs.",
  },
  {
    id: "bin",
    name: "Bin",
    category: "INFRASTRUCTURE",
    availability: "UNSUPPORTED",
    docsUrl: "https://example.com/placeholder",
    authMode: "NONE",
    capabilities: [],
    unsupported: ["placeOrder"],
    regions: [],
    note: "Spec cut off mid-entry ('Bin'). Adapter remains UNSUPPORTED until the provider and its official API are identified — nothing is fabricated.",
  },
];

/** Capability names rendered for the UI. */
export function capabilityLabel(cap: string): string {
  return cap
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (s) => s.toUpperCase());
}

export const listAdapters = query({
  args: {},
  handler: async () => PROVIDER_REGISTRY,
});

export const getAdapter = query({
  args: { id: v.string() },
  handler: async (_ctx, args) =>
    PROVIDER_REGISTRY.find((p) => p.id === args.id) ?? null,
});
