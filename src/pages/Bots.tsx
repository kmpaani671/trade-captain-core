import { ComplianceGate, useCapability } from "@/compliance/ComplianceContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { formatDate } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import {
  Bot,
  CircleAlert,
  CirclePause,
  CirclePlay,
  Cpu,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

type BotDoc = Doc<"tradingBots">;

const STRATEGIES = [
  "DCA ladder",
  "Mean reversion",
  "Momentum breakout",
  "Grid (manual params)",
] as const;

export default function Bots() {
  const bots = useQuery(api.bots.listBots, {}) ?? [];
  const models = useQuery(api.aiModels.listModels, {}) ?? [];
  const connections = useQuery(api.connections.listConnections, {}) ?? [];
  const membership = useQuery(api.membership.getMembership, {});
  const upsertBot = useMutation(api.bots.upsertBot);
  const setBotStatus = useMutation(api.bots.setBotStatus);
  const removeBot = useMutation(api.bots.removeBot);

  const botAutomationAllowed = useCapability("botAutomation");
  const tier = membership?.tier ?? "CORE";
  const maxBots = tier === "CORE" ? 1 : tier === "PRO" ? 10 : Number.POSITIVE_INFINITY;
  const atLimit = bots.length >= maxBots;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [strategy, setStrategy] = useState<string>(STRATEGIES[0]);
  const [providerId, setProviderId] = useState("");
  const [assetClass, setAssetClass] = useState<"EQUITIES" | "OPTIONS" | "CRYPTO">("EQUITIES");
  const [mode, setMode] = useState<"PAPER" | "LIVE">("PAPER");
  const [modelSlug, setModelSlug] = useState<string>("none");

  const tradingProviders = connections.filter(
    (c) => c.status === "TRADING_ENABLED",
  );
  const sandboxProviders = connections.filter((c) => c.status === "SANDBOX");

  const openDialog = () => {
    setProviderId(sandboxProviders[0]?.providerId ?? "");
    setDialogOpen(true);
  };

  const create = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!providerId) {
      toast.error("Select an execution venue connection");
      return;
    }
    const res = await upsertBot({
      name: name.trim(),
      strategy,
      providerId,
      assetClass,
      mode,
      modelSlug: modelSlug === "none" ? undefined : modelSlug,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Bot "${name.trim()}" saved as DRAFT`);
    setDialogOpen(false);
    setName("");
  };

  const activate = async (bot: BotDoc) => {
    const res = await setBotStatus({ id: bot._id, status: "ACTIVE" });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      bot.mode === "LIVE"
        ? "Live bot active — orders transmit to the provider within authorized scopes."
        : "Paper bot active — signals are logged, no orders are transmitted.",
    );
  };

  return (
    <div className="flex flex-col gap-6 py-2">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
            Automation
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Trading Bot</h1>
          <p className="text-sm text-muted-foreground">
            Bots transmit orders only through TRADING_ENABLED connections and
            only where jurisdiction flags allow automation.
          </p>
        </div>
        <Button onClick={openDialog} disabled={atLimit} className="gap-2 self-start">
          <Plus className="size-4" /> New bot
        </Button>
      </header>

      <ComplianceGate capability="botAutomation">
        <Card className="gold-frame">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Bot fleet</CardTitle>
              <Badge variant="outline" className="border-primary/30 text-primary">
                {bots.length} / {Number.isFinite(maxBots) ? maxBots : "∞"}
              </Badge>
            </div>
            <CardDescription>
              {tier} tier · live activation requires a trading-enabled venue.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {bots.length === 0 ? (
            <Card className="border-dashed md:col-span-2">
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <Bot className="size-8 text-primary/60" />
                <p className="font-semibold">No bots configured</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  Create a bot, bind it to an execution venue and an optional AI
                  analyst, then activate in paper mode before considering live
                  mode.
                </p>
              </CardContent>
            </Card>
          ) : (
            bots.map((b: BotDoc) => (
              <Card key={b._id} className="gold-frame">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm">{b.name}</CardTitle>
                      <CardDescription className="text-[11px]">
                        {b.strategy} · {b.assetClass.toLowerCase()}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        b.status === "ACTIVE"
                          ? "border-emerald-400/40 text-emerald-300"
                          : b.status === "PAUSED"
                            ? "border-amber-400/40 text-amber-300"
                            : "border-border/60 text-muted-foreground"
                      }
                    >
                      {b.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md border border-border/40 bg-secondary/20 px-2.5 py-1.5">
                      <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                        Venue
                      </span>
                      <span className="font-mono-tech capitalize">
                        {b.providerId.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="rounded-md border border-border/40 bg-secondary/20 px-2.5 py-1.5">
                      <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                        Mode
                      </span>
                      <span
                        className={
                          b.mode === "LIVE"
                            ? "font-mono-tech text-amber-300"
                            : "font-mono-tech text-sky-300"
                        }
                      >
                        {b.mode}
                      </span>
                    </div>
                  </div>
                  {b.modelSlug && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Cpu className="size-3" /> analyst: {b.modelSlug}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span>Created {formatDate(b.createdAt)}</span>
                    {b.lastRunAt && <span>run {formatDate(b.lastRunAt)}</span>}
                  </div>
                  <div className="flex gap-2">
                    {b.status !== "ACTIVE" ? (
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => void activate(b)}
                      >
                        <CirclePlay className="size-3.5" /> Activate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5"
                        onClick={() =>
                          void setBotStatus({ id: b._id, status: "PAUSED" })
                        }
                      >
                        <CirclePause className="size-3.5" /> Pause
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        void removeBot({ id: b._id });
                        toast.success("Bot removed");
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {tradingProviders.length === 0 && bots.some((b) => b.mode === "LIVE") && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-200">
            <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
            A live bot exists but no connection is TRADING_ENABLED. Live
            activation is blocked until you connect a venue with trade scope in
            Wallet.
          </div>
        )}
      </ComplianceGate>

      {!botAutomationAllowed && (
        <p className="text-xs text-muted-foreground">
          Bot automation is disabled by compliance flags for your jurisdiction.
          Configurations are preserved and will resume when posture allows.
        </p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="gold-frame sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New trading bot</DialogTitle>
            <DialogDescription>
              Bots start as DRAFT. Paper mode never transmits orders; live mode
              requires a TRADING_ENABLED connection.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Name</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. DCA · BTC weekly"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Strategy</span>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STRATEGIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">
                Execution venue
              </span>
              {sandboxProviders.length === 0 ? (
                <p className="rounded-md border border-dashed border-border/60 p-2.5 text-xs text-muted-foreground">
                  No connections yet.{" "}
                  <Link to="/wallet" className="text-primary hover:underline">
                    Connect a provider in Wallet
                  </Link>{" "}
                  first.
                </p>
              ) : (
                <Select value={providerId} onValueChange={setProviderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select venue" />
                  </SelectTrigger>
                  <SelectContent>
                    {sandboxProviders.map((c) => (
                      <SelectItem key={c._id} value={c.providerId}>
                        <span className="capitalize">
                          {c.providerId.replace(/_/g, " ")} ({c.environment})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Asset class</span>
                <Select
                  value={assetClass}
                  onValueChange={(v) =>
                    setAssetClass(v as "EQUITIES" | "OPTIONS" | "CRYPTO")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EQUITIES">Equities</SelectItem>
                    <SelectItem value="OPTIONS">Options</SelectItem>
                    <SelectItem value="CRYPTO">Crypto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Mode</span>
                <Select
                  value={mode}
                  onValueChange={(v) => setMode(v as "PAPER" | "LIVE")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAPER">Paper</SelectItem>
                    <SelectItem value="LIVE">Live</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">
                Linked AI analyst (optional)
              </span>
              <Select value={modelSlug} onValueChange={setModelSlug}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {models
                    .filter((m) => m.enabled)
                    .map((m) => (
                      <SelectItem key={m._id} value={m.slug}>
                        {m.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void create()}>Save bot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
