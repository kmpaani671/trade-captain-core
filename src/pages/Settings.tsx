import { useCompliance } from "@/compliance/ComplianceContext";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import { JURISDICTIONS } from "@/lib/compliance";
import { formatDate, formatTime } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import {
  Globe,
  History,
  Save,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const settings = useQuery(api.settings.getSettings, {}) ?? null;
  const flags = useQuery(api.compliance.listFlags, {});
  const audit = useQuery(api.auditLog.listAudit, {}) ?? [];
  const updateSettings = useMutation(api.settings.updateSettings);
  const setJurisdiction = useMutation(api.settings.setJurisdiction);
  const ensureDefaults = useMutation(api.compliance.ensureDefaults);

  const { jurisdictionLabel } = useCompliance();

  const [country, setCountry] = useState("US");
  const [region, setRegion] = useState("");
  const [regionOptions, setRegionOptions] = useState(
    JURISDICTIONS.find((j) => j.code === "US")?.regions ?? [],
  );
  const [notifications, setNotifications] = useState({
    email: true,
    botAlerts: true,
    compliance: true,
  });
  const [marketDataMode, setMarketDataMode] = useState<"DELAYED" | "REALTIME">("DELAYED");

  useEffect(() => {
    if (!settings) return;
    if (settings.notifications) setNotifications(settings.notifications);
    if (settings.marketDataMode) setMarketDataMode(settings.marketDataMode);
  }, [settings]);

  const onCountryChange = (c: string) => {
    setCountry(c);
    setRegionOptions(JURISDICTIONS.find((j) => j.code === c)?.regions ?? []);
    setRegion("");
  };

  const saveJurisdiction = async () => {
    await setJurisdiction({ country, region: region || undefined });
    toast.success(
      `Jurisdiction set to ${country}${region ? ` · ${region}` : ""}. Compliance flags resolved.`,
    );
  };

  const savePreferences = async () => {
    await updateSettings({ notifications, marketDataMode });
    toast.success("Preferences saved.");
  };

  const acceptDisclaimer = async () => {
    await updateSettings({ acceptedDisclaimerAt: Date.now() });
    toast.success("Disclaimer accepted for this session of record.");
  };

  return (
    <div className="flex flex-col gap-6 py-2">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
          Account
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Jurisdiction, compliance posture and product preferences.
        </p>
      </header>

      {/* Jurisdiction */}
      <Card className="gold-frame">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-primary" />
            <CardTitle className="text-base">Jurisdiction</CardTitle>
          </div>
          <CardDescription>
            Resolves which regulated capabilities are enabled for your account.
            Current: {jurisdictionLabel ?? "not set"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Country / territory</Label>
              <Select value={country} onValueChange={onCountryChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {JURISDICTIONS.map((j) => (
                    <SelectItem key={j.code} value={j.code}>
                      {j.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                State / region (where applicable)
              </Label>
              <Select
                value={region || "none"}
                onValueChange={(v) => setRegion(v === "none" ? "" : v)}
                disabled={regionOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={regionOptions.length === 0 ? "Not applicable" : "Select region"} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="none">—</SelectItem>
                  {regionOptions.map((r) => (
                    <SelectItem key={r.code} value={r.code}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => void saveJurisdiction()} className="gap-2">
              <Save className="size-4" /> Apply jurisdiction
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Flags take effect immediately across Trade, Portfolio and Bots.
            </p>
          </div>

          <Separator />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Compliance flag matrix
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void ensureDefaults({})}
                className="text-[11px]"
              >
                Seed global default
              </Button>
            </div>
            <div className="overflow-hidden rounded-md border border-border/50">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Scope</th>
                    <th className="px-3 py-2">Trading</th>
                    <th className="px-3 py-2">Crypto</th>
                    <th className="px-3 py-2">Options</th>
                    <th className="px-3 py-2">Bots</th>
                  </tr>
                </thead>
                <tbody>
                  {(flags ?? []).map((f) => (
                    <tr key={`${f.country}-${f.region}`} className="border-t border-border/40">
                      <td className="px-3 py-2 font-mono-tech">
                        {f.country === "**" ? "Global" : f.country}
                        {f.region && f.region !== "**" ? ` · ${f.region}` : ""}
                      </td>
                      {[f.tradingAllowed, f.cryptoAllowed, f.optionsAllowed, f.botAutomationAllowed].map(
                        (allowed, i) => (
                          <td key={i} className="px-3 py-2">
                            <span
                              className={
                                allowed
                                  ? "font-mono-tech text-emerald-400"
                                  : "font-mono-tech text-destructive"
                              }
                            >
                              {allowed ? "ON" : "OFF"}
                            </span>
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                  {(flags ?? []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-3 text-muted-foreground">
                        No flags recorded — default open posture applies pending
                        review.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <TriangleAlert className="mt-0.5 size-3 shrink-0" />
              Flags are a product control plane, not a legal determination.
              Provider KYC/AML, suitability and geographic rules apply
              independently on top of these switches.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card className="gold-frame">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Preferences</CardTitle>
          <CardDescription>
            Notification and market data settings for your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {(
              [
                ["email", "Email notifications"],
                ["botAlerts", "Bot status alerts"],
                ["compliance", "Compliance & policy notices"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-sm">{label}</Label>
                <Switch
                  checked={notifications[key]}
                  onCheckedChange={(v) =>
                    setNotifications((prev) => ({ ...prev, [key]: v }))
                  }
                />
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Market data mode</Label>
            <Select
              value={marketDataMode}
              onValueChange={(v) => setMarketDataMode(v as "DELAYED" | "REALTIME")}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DELAYED">Delayed (demo feed)</SelectItem>
                <SelectItem value="REALTIME">
                  Realtime (requires licensed feed entitlement)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Realtime mode requires a licensed market data entitlement; without
              one, the desk falls back to delayed snapshots.
            </p>
          </div>

          <Button onClick={() => void savePreferences()} className="gap-2 self-start">
            <Save className="size-4" /> Save preferences
          </Button>
        </CardContent>
      </Card>

      {/* Activity log */}
      <Card className="gold-frame">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <History className="size-4 text-primary" />
            <CardTitle className="text-base">Activity log</CardTitle>
          </div>
          <CardDescription>
            Audit trail of financial events on your account (demo resets, demo
            orders, proposal lifecycle).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {audit.length === 0 ? (
            <p className="rounded-md border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
              No financial activity recorded yet.
            </p>
          ) : (
            <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-1">
              {audit.slice(0, 30).map((row) => (
                <div
                  key={row._id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border/40 bg-secondary/20 px-3 py-1.5 text-xs"
                >
                  <span className="font-mono-tech font-medium">
                    {row.event.replace(/_/g, " ").toLowerCase()}
                  </span>
                  <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {row.data && (
                      <span className="hidden max-w-64 truncate font-mono-tech sm:inline">
                        {row.data}
                      </span>
                    )}
                    <span className="whitespace-nowrap">
                      {formatDate(row.createdAt)} {formatTime(row.createdAt)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <CardTitle className="text-base">Risk & no-advice disclaimer</CardTitle>
          </div>
          <CardDescription>
            {settings?.acceptedDisclaimerAt
              ? `Accepted ${formatDate(settings.acceptedDisclaimerAt)} at ${formatTime(settings.acceptedDisclaimerAt)}`
              : "Not yet accepted"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="rounded-md border border-border/50 bg-secondary/30 p-3 text-xs leading-relaxed text-muted-foreground">
            TradeCaptain provides orchestration, analytics and interface tooling
            only. It is not a broker-dealer, exchange, investment adviser, money
            transmitter or custodian; it does not hold or move customer funds,
            and it transmits instructions only to independent, regulated
            providers you connect. Market data may be delayed or demo. Nothing
            in the product is investment, legal, tax or accounting advice, and
            no outcome is guaranteed. Trading involves substantial risk of loss.
          </div>
          <Button
            variant="outline"
            onClick={() => void acceptDisclaimer()}
            disabled={settings?.acceptedDisclaimerAt !== undefined}
            className="self-start"
          >
            {settings?.acceptedDisclaimerAt ? "Disclaimer on record" : "Accept disclaimer"}
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Badge variant="outline" className="border-border/50">
          Region: {jurisdictionLabel ?? "unset"}
        </Badge>
      </div>
    </div>
  );
}
