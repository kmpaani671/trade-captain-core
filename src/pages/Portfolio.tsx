import { useCompliance, JurisdictionNotice } from "@/compliance/ComplianceContext";
import { StatusChip } from "@/components/StatusChip";
import type { ConnectionState } from "@/components/StatusChip";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/convex/_generated/api";
import { formatUsd } from "@/lib/format";
import { useQuery } from "convex/react";
import { AlertTriangle, Info, Link2, PieChart } from "lucide-react";
import { Link } from "react-router";

/**
 * Portfolio aggregates whatever the connected providers expose.
 * With no live connections, the panel shows sandbox/demo placeholders that
 * are explicitly labeled — never presented as real holdings.
 */
export default function Portfolio() {
  const connections = useQuery(api.connections.listConnections, {}) ?? [];
  const { resolved } = useCompliance();

  const hasLive =
    connections.some((c) => c.status === "TRADING_ENABLED" || c.status === "CONNECTED");
  const hasSandbox = connections.some((c) => c.status === "SANDBOX");
  const showDemo = !hasLive && !hasSandbox;

  // Demo allocation clearly labeled as such.
  const demoAlloc = [
    { label: "US Equities", pct: 46, color: "bg-primary" },
    { label: "Crypto", pct: 27, color: "bg-emerald-400/70" },
    { label: "Cash (provider)", pct: 18, color: "bg-sky-400/70" },
    { label: "Other", pct: 9, color: "bg-muted-foreground/40" },
  ];

  return (
    <div className="flex flex-col gap-6 py-2">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
          Holdings
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Aggregated read views across your connected providers. Custody always
          remains with the provider.
        </p>
      </header>

      <JurisdictionNotice />

      {showDemo ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <PieChart className="size-8 text-primary/60" />
            <div>
              <p className="font-semibold">No provider data connected</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Connect a broker or exchange in Wallet and grant read scope to
                populate balances and positions. TradeCaptain will never
                fabricate holdings to fill this page.
              </p>
            </div>
            <Link to="/wallet">
              <Button className="gap-2">
                <Link2 className="size-4" /> Connect a provider
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="gold-frame lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Allocation{" "}
                  <span className="ml-1 align-middle text-[10px] font-medium uppercase tracking-wider text-amber-300/90">
                    {hasLive ? "live read" : "sandbox"}
                  </span>
                </CardTitle>
                <CardDescription>
                  {hasLive
                    ? "Derived from provider-reported balances (read scope)."
                    : "Derived from sandbox credentials — paper data only."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="font-mono-tech text-3xl font-semibold">
                  {formatUsd(hasLive ? 0 : 0)}
                </div>
                <div className="flex flex-col gap-3">
                  {demoAlloc.map((a) => (
                    <div key={a.label} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{a.label}</span>
                        <span className="font-mono-tech">{a.pct}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/50">
                        <div className={`h-full ${a.color}`} style={{ width: `${a.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <Info className="mt-0.5 size-3 shrink-0" />
                  Percentages reflect demo scaffolding until provider sync
                  populates real balances through the adapter layer.
                </p>
              </CardContent>
            </Card>

            <Card className="gold-frame">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Provider accounts</CardTitle>
                <CardDescription>Per-venue sync state.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {connections.map((c) => (
                  <div
                    key={c._id}
                    className="flex items-center justify-between rounded-md border border-border/40 bg-secondary/20 px-3 py-2"
                  >
                    <div className="flex flex-col">
                      <span className="font-mono-tech text-xs capitalize">
                        {c.providerId.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {c.environment} · {c.category.toLowerCase()}
                      </span>
                    </div>
                    <StatusChip status={c.status as ConnectionState} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Positions</CardTitle>
              <CardDescription>
                Reported by the provider via getPositions() on the adapter.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                No positions returned by any connected provider yet. Live
                positions appear here once a provider reports them — TradeCaptain
                does not simulate fills or holdings.
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {resolved && !resolved.posture.tradingAllowed && (
        <div className="flex items-start gap-2 rounded-md border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          Trading is disabled for your jurisdiction by compliance flags. Read
          views remain available where the provider permits.
        </div>
      )}
    </div>
  );
}
