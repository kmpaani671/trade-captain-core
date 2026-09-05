import { StatusChip } from "@/components/StatusChip";
import type { ConnectionState } from "@/components/StatusChip";
import { JurisdictionNotice, useCompliance } from "@/compliance/ComplianceContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { formatPct, formatUsd } from "@/lib/format";
import { limitLabel } from "@/lib/membership";
import { useMutation, useQuery } from "convex/react";
import {
  Activity,
  ArrowUpRight,
  Bot,
  ChevronRight,
  Radio,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router";

export default function Dashboard() {
  const { user } = useAuth();
  const { jurisdictionLabel } = useCompliance();
  const connections = useQuery(api.connections.listConnections, {}) ?? [];
  const membership = useQuery(api.membership.getMembership, {});
  const bots = useQuery(api.bots.listBots, {}) ?? [];
  const snapshots = useQuery(api.market.listSnapshots, {}) ?? [];
  const ensureSeed = useMutation(api.market.ensureSeed);

  useEffect(() => {
    // Idempotent: seeds delayed demo snapshots on first run only.
    void ensureSeed({});
  }, [ensureSeed]);

  const tradingEnabled = connections.filter(
    (c) => c.status === "TRADING_ENABLED",
  ).length;
  const liveRead = connections.filter((c) => c.status === "CONNECTED").length;
  const sandbox = connections.filter((c) => c.status === "SANDBOX").length;
  const blocked = connections.filter(
    (c) =>
      c.status === "UNSUPPORTED" ||
      c.status === "DISABLED_FOR_COMPLIANCE" ||
      c.status === "REGION_RESTRICTED",
  ).length;
  const activeBots = bots.filter((b) => b.status === "ACTIVE").length;
  const tier = membership?.tier ?? "CORE";

  const stats = [
    {
      label: "Live connections",
      value: String(tradingEnabled + liveRead),
      hint: `${sandbox} sandbox · ${blocked} gated`,
      icon: Wallet,
      to: "/wallet",
    },
    {
      label: "Active bots",
      value: String(activeBots),
      hint: `${bots.length} configured`,
      icon: Bot,
      to: "/bots",
    },
    {
      label: "Membership",
      value: tier,
      hint: `AI slots: ${limitLabel(tier === "CORE" ? 2 : tier === "PRO" ? 10 : Number.POSITIVE_INFINITY)}`,
      icon: ShieldCheck,
      to: "/membership",
    },
    {
      label: "Jurisdiction",
      value: jurisdictionLabel ?? "Unset",
      hint: "Compliance posture",
      icon: Radio,
      to: "/settings",
    },
  ];

  return (
    <div className="flex flex-col gap-6 py-2">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
          Command overview
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome{user?.name ? `, ${user.name}` : " aboard"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Orchestration layer for your connected brokers and exchanges. Assets
          remain at the provider — TradeCaptain never holds customer funds.
        </p>
      </header>

      <JurisdictionNotice />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="group">
            <Card className="gold-frame h-full transition-colors group-hover:border-primary/30">
              <CardContent className="flex h-full flex-col gap-2 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <s.icon className="size-4 text-primary/70" />
                </div>
                <span className="font-mono-tech truncate text-xl font-semibold">
                  {s.value}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {s.hint}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="gold-frame lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Market watch</CardTitle>
                <CardDescription>
                  Delayed demo snapshots — not live tradable prices.
                </CardDescription>
              </div>
              <Link to="/trade">
                <Button variant="outline" size="sm" className="gap-1">
                  Trade desk <ChevronRight className="size-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {snapshots.length === 0
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-md border border-border/50 bg-secondary/40"
                  />
                ))
              : snapshots.map((row) => (
                  <Link
                    key={row.symbol}
                    to={`/trade?symbol=${encodeURIComponent(row.symbol)}`}
                    className="rounded-md border border-border/50 bg-secondary/30 p-2.5 transition-colors hover:border-primary/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono-tech text-xs font-semibold">
                        {row.symbol.replace("-USD", "")}
                      </span>
                      <Badge
                        variant="outline"
                        className="border-border/50 px-1.5 py-0 text-[9px] uppercase tracking-wider text-muted-foreground"
                      >
                        {row.assetClass === "CRYPTO" ? "Crypto" : "Eq"}
                      </Badge>
                    </div>
                    <div className="mt-1 font-mono-tech text-sm">
                      {formatUsd(row.price)}
                    </div>
                    <div
                      className={
                        row.changePct >= 0
                          ? "font-mono-tech text-[11px] text-emerald-400"
                          : "font-mono-tech text-[11px] text-red-400"
                      }
                    >
                      {formatPct(row.changePct)}
                    </div>
                  </Link>
                ))}
          </CardContent>
        </Card>

        <Card className="gold-frame lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Connection status</CardTitle>
            <CardDescription>
              Lifecycle states across every provider adapter.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {connections.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/60 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No providers connected yet.
                </p>
                <Link to="/wallet" className="mt-2 inline-block">
                  <Button size="sm" className="gap-1">
                    Connect a provider <ArrowUpRight className="size-3.5" />
                  </Button>
                </Link>
              </div>
            ) : (
              connections.slice(0, 5).map((c) => (
                <Link
                  key={c._id}
                  to="/wallet"
                  className="flex items-center justify-between rounded-md border border-border/40 bg-secondary/20 px-3 py-2 text-sm hover:border-primary/30"
                >
                  <span className="font-mono-tech text-xs capitalize">
                    {c.providerId.replace(/_/g, " ")}
                  </span>
                  <StatusChip status={c.status as ConnectionState} />
                </Link>
              ))
            )}
            <Link
              to="/trade"
              className="mt-1 flex items-center gap-2 text-xs text-primary hover:underline"
            >
              <Activity className="size-3.5" /> Open the trade desk
            </Link>
          </CardContent>
        </Card>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground/80">
        TradeCaptain is an orchestration, analytics and interface layer.
        Brokerage, exchange and custody services are provided by independent,
        regulated third parties. TradeCaptain does not hold, transmit or
        commingle customer funds, and nothing here is investment advice.
      </p>
    </div>
  );
}
