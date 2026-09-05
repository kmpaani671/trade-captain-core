import { useCapability, ComplianceGate } from "@/compliance/ComplianceContext";
import { StatusChip } from "@/components/StatusChip";
import type { ConnectionState } from "@/components/StatusChip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import { formatPct, formatQty, formatUsd } from "@/lib/format";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  BadgeCheck,
  Clock,
  Eye,
  FlaskConical,
  Lock,
  Plus,
  RotateCcw,
  Trash2,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

type Side = "BUY" | "SELL";

export default function Trade() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = searchParams.get("symbol") ?? "AAPL";

  const snapshots = useQuery(api.market.listSnapshots, {}) ?? [];
  const watchlist = useQuery(api.market.listWatchlist, {}) ?? [];
  const connections = useQuery(api.connections.listConnections, {}) ?? [];
  const cryptoProducts = useQuery(api.coinbase.listCryptoProducts, {}) ?? [];
  const demo = useQuery(api.demoTrading.getDemoAccount, {});
  const addToWatchlist = useMutation(api.market.addToWatchlist);
  const removeFromWatchlist = useMutation(api.market.removeFromWatchlist);
  const resetDemo = useMutation(api.demoTrading.resetDemo);
  const getLiveQuote = useAction(api.coinbase.getLiveQuote);
  const demoOrderAction = useAction(api.demoTrading.demoOrder);

  const tradingAllowed = useCapability("trading");
  const cryptoAllowed = useCapability("crypto");

  const [symbol, setSymbol] = useState(initial);
  const [newSymbol, setNewSymbol] = useState("");
  const [side, setSide] = useState<Side>("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [qty, setQty] = useState("1");
  const [limitPrice, setLimitPrice] = useState("");
  const [acceptedRisk, setAcceptedRisk] = useState(false);
  const [liveQuote, setLiveQuote] = useState<
    | { ok: true; symbol: string; product: string; price: number; source: string; status: string; timestamp: number }
    | { ok: false; error: string }
    | null
  >(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [demoNotional, setDemoNotional] = useState("100");
  const [demoAmount, setDemoAmount] = useState("10000");
  const [demoBusy, setDemoBusy] = useState(false);

  const assetClass = symbol.includes("-USD") ? "CRYPTO" : "EQUITIES";
  const baseSymbol = symbol.replace("-USD", "");
  const cryptoProduct = cryptoProducts.find(
    (p) => p.symbol === baseSymbol || p.product === symbol,
  );
  const quote = snapshots.find((s) => s.symbol === symbol);
  const notional =
    quote && qty !== "" ? quote.price * (parseFloat(qty) || 0) : undefined;

  const tradingConnections = useMemo(
    () => connections.filter((c) => c.status === "TRADING_ENABLED"),
    [connections],
  );
  const readOnlyConnections = useMemo(
    () => connections.filter((c) => c.status === "READ_ONLY" || c.status === "CONNECTED"),
    [connections],
  );

  const addSymbol = async () => {
    const s = newSymbol.trim().toUpperCase();
    if (!s) return;
    const res = await addToWatchlist({
      symbol: s,
      assetClass: s.includes("-USD") ? "CRYPTO" : "EQUITIES",
    });
    if (!res.ok) {
      toast.error(res.error ?? "Could not add symbol");
      return;
    }
    setNewSymbol("");
    toast.success(`${s} added to watchlist`);
  };

  const gated =
    (assetClass === "CRYPTO" && !cryptoAllowed) || !tradingAllowed;

  const submitDisabled =
    gated ||
    !acceptedRisk ||
    qty === "" ||
    parseFloat(qty) <= 0 ||
    (orderType === "LIMIT" && (limitPrice === "" || parseFloat(limitPrice) <= 0));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitDisabled) return;
    toast.info(
      `Order preview — ${side} ${qty} ${symbol} @ ${orderType === "LIMIT" ? formatUsd(parseFloat(limitPrice)) : "market"}. Transmission requires a TRADING_ENABLED provider connection.`,
      { duration: 6000 },
    );
  };

  const verifyLive = async () => {
    setLiveLoading(true);
    try {
      setLiveQuote(await getLiveQuote({ symbol: baseSymbol }));
    } finally {
      setLiveLoading(false);
    }
  };

  const startDemo = async () => {
    const amt = parseFloat(demoAmount);
    if (!(amt > 0)) {
      toast.error("Enter a demo funding amount greater than 0");
      return;
    }
    setDemoBusy(true);
    try {
      const res = await resetDemo({ amount: amt });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Demo ledger funded with ${formatUsd(res.cash)} — simulated funds only.`,
      );
    } finally {
      setDemoBusy(false);
    }
  };

  const runDemo = async (demoSide: "BUY" | "SELL") => {
    const n = parseFloat(demoNotional);
    if (!(n > 0)) {
      toast.error("Enter a demo notional greater than 0");
      return;
    }
    setDemoBusy(true);
    try {
      const res = await demoOrderAction({
        symbol: baseSymbol,
        side: demoSide,
        notional: n,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Demo ${res.side} ${res.symbol}: ${formatQty(res.quantity)} @ ${formatUsd(res.price)} (live Coinbase quote) — demo cash ${formatUsd(res.cash)}.`,
      );
    } finally {
      setDemoBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 py-2">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
          Trade desk
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Trade</h1>
        <p className="text-sm text-muted-foreground">
          Quotes are delayed demo data. Order transmission requires an
          authorized TRADING_ENABLED connection at a regulated provider.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Watchlist + quote panel */}
        <div className="flex flex-col gap-4 lg:col-span-3">
          <Card className="gold-frame">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Watchlist</CardTitle>
              <CardDescription>Your tracked symbols (demo feed).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                  placeholder="Add symbol (e.g. NVDA or BTC-USD)"
                  className="font-mono-tech"
                  onKeyDown={(e) => e.key === "Enter" && void addSymbol()}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => void addSymbol()}>
                  <Plus className="size-4" />
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {watchlist.length === 0 ? (
                  <p className="col-span-full text-xs text-muted-foreground">
                    Watchlist empty — add symbols above or from the market grid.
                  </p>
                ) : (
                  watchlist.map((w) => {
                    const snap = snapshots.find((s) => s.symbol === w.symbol);
                    return (
                      <div
                        key={w._id}
                        className="group flex items-center justify-between rounded-md border border-border/50 bg-secondary/30 px-2.5 py-2"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSymbol(w.symbol);
                            setSearchParams({ symbol: w.symbol }, { replace: true });
                          }}
                          className="text-left"
                        >
                          <span className="font-mono-tech text-xs font-semibold">
                            {w.symbol.replace("-USD", "")}
                          </span>
                          <div className="font-mono-tech text-[11px] text-muted-foreground">
                            {snap ? formatUsd(snap.price) : "—"}
                          </div>
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${w.symbol}`}
                          onClick={() => void removeFromWatchlist({ id: w._id })}
                          className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <Trash2 className="size-3.5 hover:text-destructive" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quote detail */}
          <Card className="gold-frame">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-mono-tech text-lg">{symbol}</CardTitle>
                  <CardDescription>
                    {assetClass === "CRYPTO" ? "Digital asset" : "Equity"} ·
                    delayed demo snapshot
                  </CardDescription>
                </div>
                <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
                  <Clock className="size-3" /> 15m delayed
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-6">
              <div>
                <div className="text-xs text-muted-foreground">Last</div>
                <div className="font-mono-tech text-3xl font-semibold">
                  {formatUsd(quote?.price)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Change</div>
                <div
                  className={
                    (quote?.changePct ?? 0) >= 0
                      ? "font-mono-tech text-lg text-emerald-400"
                      : "font-mono-tech text-lg text-red-400"
                  }
                >
                  {formatPct(quote?.changePct)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Est. notional</div>
                <div className="font-mono-tech text-lg">{formatUsd(notional)}</div>
              </div>
            </CardContent>
            {cryptoProduct && (
              <CardContent className="border-t border-border/40 pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={liveLoading}
                    onClick={() => void verifyLive()}
                  >
                    <BadgeCheck className="size-3.5" />
                    {liveLoading ? "Checking…" : "Verify live price"}
                  </Button>
                  {liveQuote && liveQuote.ok && liveQuote.symbol === baseSymbol && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono-tech text-sm font-semibold">
                        {formatUsd(liveQuote.price)}
                      </span>
                      <Badge
                        variant="outline"
                        className="gap-1 border-emerald-400/40 text-[9px] uppercase tracking-wider text-emerald-300"
                      >
                        LIVE · Coinbase public data
                      </Badge>
                    </div>
                  )}
                </div>
                {liveQuote && !liveQuote.ok && (
                  <p className="mt-1.5 text-[11px] text-destructive">
                    {liveQuote.error} — no price is substituted.
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        </div>

        {/* Order ticket */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="gold-frame-strong">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Order ticket</CardTitle>
              <CardDescription>
                Previews only until a TRADING_ENABLED connection transmits to
                the provider.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ComplianceGate
                capability={assetClass === "CRYPTO" ? "crypto" : "trading"}
                fallback={
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm">
                    <p className="flex items-center gap-2 font-semibold text-destructive">
                      <AlertTriangle className="size-4" />
                      {assetClass === "CRYPTO"
                        ? "Crypto trading disabled in your jurisdiction"
                        : "Trading disabled in your jurisdiction"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Compliance flags block this capability for your region.
                      Adjust your jurisdiction in Settings if this is
                      incorrect — provider eligibility rules still apply.
                    </p>
                  </div>
                }
              >
                <form onSubmit={onSubmit} className="flex flex-col gap-3">
                  <Tabs
                    value={side}
                    onValueChange={(v) => setSide(v as Side)}
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="BUY" className="data-[state=active]:text-emerald-300">
                        Buy
                      </TabsTrigger>
                      <TabsTrigger value="SELL" className="data-[state=active]:text-red-300">
                        Sell
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-muted-foreground">Type</span>
                      <Select
                        value={orderType}
                        onValueChange={(v) => setOrderType(v as "MARKET" | "LIMIT")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MARKET">Market</SelectItem>
                          <SelectItem value="LIMIT">Limit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-muted-foreground">Quantity</span>
                      <Input
                        inputMode="decimal"
                        value={qty}
                        onChange={(e) => setQty(e.target.value.replace(/[^0-9.]/g, ""))}
                        className="font-mono-tech"
                      />
                    </div>
                  </div>

                  {orderType === "LIMIT" && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-muted-foreground">Limit price</span>
                      <Input
                        inputMode="decimal"
                        value={limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                        placeholder={quote ? formatUsd(quote.price) : "0.00"}
                        className="font-mono-tech"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between rounded-md border border-border/50 bg-secondary/20 px-3 py-2">
                    <span className="text-xs text-muted-foreground">
                      Estimated cost
                    </span>
                    <span className="font-mono-tech text-sm font-semibold">
                      {formatUsd(
                        orderType === "LIMIT" && limitPrice
                          ? parseFloat(limitPrice) * (parseFloat(qty) || 0)
                          : notional,
                      )}
                    </span>
                  </div>

                  <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={acceptedRisk}
                      onCheckedChange={setAcceptedRisk}
                    />
                    <span>
                      I understand this preview is not an order, that execution
                      occurs at the connected provider, and that market data
                      shown is delayed demo data.
                    </span>
                  </label>

                  <Button type="submit" disabled={submitDisabled} className="gap-2">
                    {gated ? (
                      <Lock className="size-4" />
                    ) : tradingConnections.length === 0 ? (
                      <Eye className="size-4" />
                    ) : (
                      <Zap className="size-4" />
                    )}
                    Preview order
                  </Button>

                  <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Trading-enabled connections</span>
                      <span className="font-mono-tech">
                        {tradingConnections.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Read-only connections</span>
                      <span className="font-mono-tech">
                        {readOnlyConnections.length}
                      </span>
                    </div>
                  </div>
                </form>
              </ComplianceGate>
            </CardContent>
          </Card>

          {/* Demo trading — separate simulated ledger */}
          <Card className="gold-frame">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Demo trading</CardTitle>
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-400/40 text-[9px] uppercase tracking-wider text-amber-300"
                >
                  <FlaskConical className="size-3" /> simulated funds
                </Badge>
              </div>
              <CardDescription>
                A separate demo ledger priced at verified live Coinbase quotes.
                Never your real balances.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ComplianceGate
                capability="trading"
                fallback={
                  <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-muted-foreground">
                    Demo trading is disabled in your jurisdiction by compliance
                    flags.
                  </p>
                }
              >
                {demo === undefined ? (
                  <div className="h-16 animate-pulse rounded-md bg-secondary/40" />
                ) : !demo.account ? (
                  <div className="flex flex-col gap-2.5">
                    <p className="text-xs text-muted-foreground">
                      Start a demo account with fresh simulated funds. Real
                      money is never involved.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        inputMode="decimal"
                        value={demoAmount}
                        onChange={(e) =>
                          setDemoAmount(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        className="font-mono-tech"
                        placeholder="10000"
                      />
                      <Button
                        variant="outline"
                        disabled={demoBusy}
                        onClick={() => void startDemo()}
                      >
                        Start demo
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md border border-border/40 bg-secondary/20 px-3 py-2">
                        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                          Demo cash
                        </span>
                        <span className="font-mono-tech text-lg font-semibold">
                          {formatUsd(demo.account.cash)}
                        </span>
                      </div>
                      <div className="rounded-md border border-border/40 bg-secondary/20 px-3 py-2">
                        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                          Starting cash
                        </span>
                        <span className="font-mono-tech text-lg">
                          {formatUsd(demo.account.startingCash)}
                        </span>
                      </div>
                    </div>

                    {demo.positions.length > 0 && (
                      <div className="flex flex-col gap-1">
                        {demo.positions.map((p) => (
                          <div
                            key={p.symbol}
                            className="flex items-center justify-between rounded-md border border-border/40 bg-secondary/20 px-3 py-1.5 text-xs"
                          >
                            <span className="font-mono-tech font-semibold">
                              {p.symbol.replace("-USD", "")}
                            </span>
                            <span className="font-mono-tech text-muted-foreground">
                              {formatQty(p.qty)} @ {formatUsd(p.avgPrice)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-muted-foreground">
                        Demo notional (USD)
                      </span>
                      <Input
                        inputMode="decimal"
                        value={demoNotional}
                        onChange={(e) =>
                          setDemoNotional(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        className="font-mono-tech"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        disabled={demoBusy || !cryptoProduct}
                        onClick={() => void runDemo("BUY")}
                        className="gap-1.5"
                      >
                        <Zap className="size-3.5" /> Demo buy
                      </Button>
                      <Button
                        variant="outline"
                        disabled={demoBusy || !cryptoProduct}
                        onClick={() => void runDemo("SELL")}
                        className="gap-1.5"
                      >
                        <Zap className="size-3.5" /> Demo sell
                      </Button>
                    </div>
                    {!cryptoProduct && (
                      <p className="text-[11px] text-muted-foreground">
                        Demo execution covers Coinbase crypto products only
                        (BTC, ETH, SOL, XRP, DOGE, ADA, LTC, BCH, AVAX) —
                        verified live quotes; equities stay delayed-demo.
                      </p>
                    )}

                    <div className="flex items-center gap-2 border-t border-border/40 pt-3">
                      <Input
                        inputMode="decimal"
                        value={demoAmount}
                        onChange={(e) =>
                          setDemoAmount(e.target.value.replace(/[^0-9.]/g, ""))
                        }
                        className="h-8 font-mono-tech text-xs"
                        placeholder="Reset amount"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-xs"
                        disabled={demoBusy}
                        onClick={() => void startDemo()}
                      >
                        <RotateCcw className="size-3.5" /> Reset demo
                      </Button>
                    </div>
                  </div>
                )}
              </ComplianceGate>
            </CardContent>
          </Card>
          <Card className="gold-frame">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Execution venues</CardTitle>
              <CardDescription>Provider connections for routing.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {connections.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No connections yet — add one in Wallet.
                </p>
              ) : (
                connections
                  .filter((c) => c.category !== "INFRASTRUCTURE")
                  .map((c) => (
                    <div
                      key={c._id}
                      className="flex items-center justify-between rounded-md border border-border/40 bg-secondary/20 px-3 py-2"
                    >
                      <span className="font-mono-tech text-xs capitalize">
                        {c.providerId.replace(/_/g, " ")}
                        <span className="ml-2 text-[10px] uppercase text-muted-foreground">
                          {c.environment}
                        </span>
                      </span>
                      <StatusChip status={c.status as ConnectionState} />
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
