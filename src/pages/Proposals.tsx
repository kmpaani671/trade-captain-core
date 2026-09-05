import { ComplianceGate } from "@/compliance/ComplianceContext";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { formatUsd } from "@/lib/format";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  CircleCheck,
  CircleX,
  ClipboardList,
  Hourglass,
  ListTodo,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ProposalDoc = Doc<"tradeProposals">;
type Side = "BUY" | "SELL";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "border-primary/40 bg-primary/10 text-primary",
  EXECUTING: "border-sky-400/40 bg-sky-400/10 text-sky-300",
  EXECUTED: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  DECLINED: "border-border/60 bg-secondary/40 text-muted-foreground",
  EXPIRED: "border-amber-400/40 bg-amber-400/10 text-amber-300",
};

function countdown(ms: number): string {
  if (ms <= 0) return "expired";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Proposals() {
  const proposals = useQuery(api.proposals.listProposals, {}) ?? [];
  const strategies = useQuery(api.strategies.listStrategies, {});
  const products = useQuery(api.coinbase.listCryptoProducts, {}) ?? [];
  const createProposal = useMutation(api.proposals.createProposal);
  const declineProposal = useMutation(api.proposals.declineProposal);
  const approveProposal = useAction(api.proposals.approveProposal);

  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [notional, setNotional] = useState("100");
  const [strategy, setStrategy] = useState("Momentum");
  const [rationale, setRationale] = useState("");
  const [mode, setMode] = useState<"DEMO" | "LIVE">("DEMO");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [now, setNow] = useState(Date.now());

  // 1s tick so pending-expiry countdowns stay live.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Default symbol once products load.
  useEffect(() => {
    if (!symbol && products.length > 0) setSymbol(products[0].symbol);
  }, [products, symbol]);

  const pendingCount = useMemo(
    () => proposals.filter((p) => p.status === "PENDING").length,
    [proposals],
  );

  const onCreate = async () => {
    const n = parseFloat(notional);
    if (!symbol) {
      toast.error("Select a symbol");
      return;
    }
    if (!(n > 0)) {
      toast.error("Notional must be greater than 0");
      return;
    }
    setCreating(true);
    try {
      const res = await createProposal({
        symbol,
        side,
        notional: n,
        strategy,
        rationale: rationale.trim() || undefined,
        mode,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Proposal created — expires in 5 minutes.`);
      setRationale("");
    } finally {
      setCreating(false);
    }
  };

  const onApprove = async (p: ProposalDoc) => {
    setBusyId(p._id);
    try {
      const res = await approveProposal({ id: p._id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Executed on the demo ledger — ${res.side} ${res.symbol} @ ${formatUsd(res.price)}.`,
      );
    } finally {
      setBusyId(null);
    }
  };

  const onDecline = async (p: ProposalDoc) => {
    setBusyId(p._id);
    try {
      const res = await declineProposal({ id: p._id });
      if (!res.ok) toast.error(res.error);
      else toast.success("Proposal declined.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 py-2">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
          Human-in-the-loop
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Trade Proposals</h1>
        <p className="text-sm text-muted-foreground">
          Semi-automatic proposals expire in 5 minutes and execute only after
          explicit approval. Only DEMO mode executes — real transmission
          requires an authorized TRADING_ENABLED provider connection.
        </p>
      </header>

      <ComplianceGate
        capability="trading"
        fallback={
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-destructive">
              <ShieldAlert className="size-4" />
              Trading disabled in your jurisdiction
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Compliance flags block proposal execution for your region.
            </p>
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Create proposal */}
          <Card className="gold-frame-strong lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">New proposal</CardTitle>
              <CardDescription>
                Verified live Coinbase quotes price every execution.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Symbol</span>
                <Select value={symbol} onValueChange={setSymbol}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select crypto product" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {products.map((p) => (
                      <SelectItem key={p.symbol} value={p.symbol}>
                        <span className="font-mono-tech">{p.symbol}</span>
                        <span className="ml-2 text-[10px] text-muted-foreground">
                          {p.product}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Tabs value={side} onValueChange={(v) => setSide(v as Side)}>
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
                  <span className="text-xs text-muted-foreground">
                    Notional (USD)
                  </span>
                  <Input
                    inputMode="decimal"
                    value={notional}
                    onChange={(e) => setNotional(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="font-mono-tech"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">Mode</span>
                  <Select value={mode} onValueChange={(v) => setMode(v as "DEMO" | "LIVE")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEMO">Demo (simulated)</SelectItem>
                      <SelectItem value="LIVE">Live (blocked)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Strategy</span>
                <Select value={strategy} onValueChange={setStrategy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {strategies &&
                      Object.entries(strategies).map(([cat, list]) => (
                        <SelectGroup key={cat}>
                          <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {cat.replace(/_/g, " ")}
                          </SelectLabel>
                          {list.map((s) => (
                            <SelectItem key={`${cat}-${s}`} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">
                  Rationale (optional)
                </span>
                <textarea
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  rows={2}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  placeholder="Why is this trade proposed?"
                />
              </div>

              <Button onClick={() => void onCreate()} disabled={creating} className="gap-2">
                <ClipboardList className="size-4" />
                {creating ? "Creating…" : "Create proposal"}
              </Button>

              {mode === "LIVE" && (
                <p className="rounded-md border border-amber-400/30 bg-amber-400/5 p-2.5 text-[11px] leading-relaxed text-amber-200">
                  LIVE proposals are recorded but approval is refused until a
                  real authorized provider connection is configured. Execution
                  is never simulated as live.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Approval queue */}
          <Card className="gold-frame lg:col-span-3">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Approval queue</CardTitle>
                <Badge variant="outline" className="border-primary/30 text-primary">
                  {pendingCount} pending
                </Badge>
              </div>
              <CardDescription>
                Approve or decline before the 5-minute TTL lapses.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {proposals.length === 0 ? (
                <div className="rounded-md border border-dashed border-border/60 p-6 text-center">
                  <ListTodo className="mx-auto size-7 text-primary/60" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No proposals yet. Create one on the left.
                  </p>
                </div>
              ) : (
                proposals.map((p) => {
                  const pending = p.status === "PENDING";
                  const remaining = p.expiresAt - now;
                  return (
                    <div
                      key={p._id}
                      className="flex flex-col gap-2 rounded-md border border-border/40 bg-secondary/20 px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono-tech text-sm font-semibold">
                            {p.side} {formatUsd(p.notional)}{" "}
                            {p.symbol.replace("-USD", "")}
                          </span>
                          <span
                            className={
                              p.mode === "LIVE"
                                ? "ml-2 text-[10px] font-semibold uppercase tracking-wider text-amber-300"
                                : "ml-2 text-[10px] font-semibold uppercase tracking-wider text-sky-300"
                            }
                          >
                            {p.mode}
                          </span>
                          <div className="text-[11px] text-muted-foreground">
                            {p.strategy}
                            {p.rationale ? ` · ${p.rationale}` : ""}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={STATUS_STYLES[p.status] ?? STATUS_STYLES.DECLINED}
                        >
                          {p.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                          <Hourglass className="size-3" />
                          {pending
                            ? `expires in ${countdown(remaining)}`
                            : `created ${new Date(p.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`}
                        </span>
                        {pending && (
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 px-2.5 text-xs"
                              disabled={busyId === p._id}
                              onClick={() => void onDecline(p)}
                            >
                              <CircleX className="size-3.5" /> Decline
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 gap-1 px-2.5 text-xs"
                              disabled={busyId === p._id}
                              onClick={() => void onApprove(p)}
                            >
                              <CircleCheck className="size-3.5" />
                              {busyId === p._id ? "Executing…" : "Approve"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground/80">
          Approval prices the proposal against a verified live Coinbase quote
          at execution time and fills the separate demo ledger. Real balances
          are never touched: live execution remains blocked until a
          TRADING_ENABLED provider connection exists.
        </p>
      </ComplianceGate>
    </div>
  );
}