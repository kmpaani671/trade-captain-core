/**
 * Verified live market data via Coinbase's PUBLIC market data endpoint.
 *
 * https://api.exchange.coinbase.com/products/{product}/ticker requires no
 * API key. Only crypto products are covered here — equities remain delayed
 * demo data. Verified prices are never fabricated: if the fetch fails, the
 * caller receives an error and nothing is substituted.
 */

import { v } from "convex/values";
import { action, query } from "./_generated/server";

/** Symbol -> Coinbase exchange product id (mirrors the backend foundation). */
export const CRYPTO_PRODUCTS: Record<string, string> = {
  BTC: "BTC-USD",
  ETH: "ETH-USD",
  SOL: "SOL-USD",
  XRP: "XRP-USD",
  DOGE: "DOGE-USD",
  ADA: "ADA-USD",
  LTC: "LTC-USD",
  BCH: "BCH-USD",
  AVAX: "AVAX-USD",
};

/** Public ticker for a symbol. Throws on failure — never returns fake data. */
export async function fetchCoinbaseQuote(symbol: string): Promise<{
  product: string;
  price: number;
}> {
  const s = symbol.toUpperCase();
  const product =
    CRYPTO_PRODUCTS[s] ?? (s.includes("-") ? s : `${s}-USD`);
  const url = `https://api.exchange.coinbase.com/products/${product}/ticker`;
  const response = await fetch(url, {
    headers: { "User-Agent": "TradeCaptain/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Market data unavailable for ${product}`);
  }
  const payload = (await response.json()) as { price: string };
  return { product, price: parseFloat(payload.price) };
}

/** Crypto products tradable with verified quotes. */
export const listCryptoProducts = query({
  args: {},
  handler: async () =>
    Object.entries(CRYPTO_PRODUCTS).map(([symbol, product]) => ({
      symbol,
      product,
    })),
});

/** Verified live quote — status LIVE only when Coinbase actually responded. */
export const getLiveQuote = action({
  args: { symbol: v.string() },
  handler: async (_ctx, args) => {
    const s = args.symbol.toUpperCase();
    if (!(s in CRYPTO_PRODUCTS) && !s.includes("-")) {
      return {
        ok: false as const,
        error:
          "Verified live quotes are currently available for Coinbase crypto products only.",
      };
    }
    try {
      const { product, price } = await fetchCoinbaseQuote(s);
      return {
        ok: true as const,
        symbol: s,
        product,
        price,
        source: "Coinbase public market data",
        status: "LIVE" as const,
        timestamp: Date.now(),
      };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "Market data unavailable",
      };
    }
  },
});