import { useCompliance } from "@/compliance/ComplianceContext";
import { StatusChip, categoryLabel } from "@/components/StatusChip";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  BookOpen,
  ExternalLink,
  KeyRound,
  ShieldAlert,
  Wallet as WalletIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/** Mirrors ProviderAdapterInfo from the registry module (client-safe copy). */
interface ProviderInfo {
  id: string;
  name: string;
  category: "BROKERAGE" | "CRYPTO" | "INFRASTRUCTURE";
  availability:
    | "AVAILABLE"
    | "SANDBOX"
    | "PARTNER_APPROVAL_REQUIRED"
    | "REGION_RESTRICTED"
    | "UNSUPPORTED"
    | "DISABLED_FOR_COMPLIANCE";
  docsUrl: string;
  authMode: string;
  capabilities: readonly string[];
  unsupported: readonly string[];
  regions: string[];
  note: string;
}

export default function Wallet() {
  const registry = useQuery(api.providerRegistry.listAdapters, {}) ?? [];
  const connections = useQuery(api.connections.listConnections, {}) ?? [];
  const upsert = useMutation(api.connections.upsertConnection);
  const remove = useMutation(api.connections.removeConnection);
  const { resolved } = useCompliance();

  const [connectTarget, setConnectTarget] = useState<ProviderInfo | null>(null);
  const [envChoice, setEnvChoice] = useState<"SANDBOX" | "LIVE">("SANDBOX");
  const [busyId, setBusyId] = useState<string | null>(null);

  const byProvider = useMemo(() => {
    const map = new Map<string, (typeof connections)[number]>();
    for (const c of connections) map.set(c.providerId, c);
    return map;
  }, [connections]);

  const grouped = useMemo(() => {
    const g: Record<string, ProviderInfo[]> = {
      BROKERAGE: [],
      CRYPTO: [],
      INFRASTRUCTURE: [],
    };
    for (const p of registry) g[p.category]?.push(p);
    return g;
  }, [registry]);

  const connectable = (p: ProviderInfo) =>
    p.availability === "AVAILABLE" || p.availability === "SANDBOX";

  const openConnect = (p: ProviderInfo) => {
    setEnvChoice("SANDBOX");
    setConnectTarget(p);
  };

  const confirmConnect = async () => {
    if (!connectTarget) return;
    setBusyId(connectTarget.id);
    try {
      const status: ConnectionState =
        envChoice === "SANDBOX"
          ? "SANDBOX"
          : connectable(connectTarget)
            ? "CONNECTED"
            : "PARTNER_APPROVAL_REQUIRED";
      const res = await upsert({
        providerId: connectTarget.id,
        category: connectTarget.category,
        status,
        environment: envChoice,
        scopes: status === "SANDBOX" ? ["read:sandbox"] : ["read"],
        note:
          envChoice === "LIVE"
            ? "Live credentials must be exchanged through the provider's official authorization flow."
            : undefined,
      });
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success(
          `${connectTarget.name} connected as ${status.replace(/_/g, " ").toLowerCase()}.`,
        );
      }
      setConnectTarget(null);
    } finally {
      setBusyId(null);
    }
  };

  const disconnect = async (providerId: string, name: string) => {
    setBusyId(providerId);
    try {
      await remove({ providerId });
      toast.success(`${name} disconnected. Credentials reference revoked.`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 py-2">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
          Connected accounts
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
        <p className="text-sm text-muted-foreground">
          Your assets remain at each provider. TradeCaptain stores only an
          opaque credential reference — never raw API keys — and transmits only
          instructions you authorize.
        </p>
      </header>

      {resolved && !resolved.posture.tradingAllowed && (
        <div className="flex items-start gap-2 rounded-md border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-200">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
          Trading is disabled for your jurisdiction. Providers can still be
          connected in read-only or sandbox state where lawful.
        </div>
      )}

      {(["BROKERAGE", "CRYPTO", "INFRASTRUCTURE"] as const).map((cat) => (
        <section key={cat} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <WalletIcon className="size-4 text-primary/70" />
            <h2 className="text-sm font-semibold tracking-wide">
              {categoryLabel(cat)}
            </h2>
            <span className="font-mono-tech text-[11px] text-muted-foreground">
              {grouped[cat]?.length ?? 0} adapters
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {(grouped[cat] ?? []).map((p) => {
              const conn = byProvider.get(p.id);
              const state: ConnectionState = conn?.status ?? p.availability;
              return (
                <Card key={p.id} className="gold-frame flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm font-semibold">
                          {p.name}
                        </CardTitle>
                        <CardDescription className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                          <BookOpen className="size-3" />
                          <a
                            href={p.docsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-primary hover:underline"
                          >
                            Official docs
                            <ExternalLink className="ml-0.5 inline size-2.5" />
                          </a>
                        </CardDescription>
                      </div>
                      <StatusChip status={state} />
                    </div>
                  </CardHeader>
                  <CardContent className="mt-auto flex flex-col gap-3">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {p.note}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge
                        variant="outline"
                        className="border-border/50 text-[9px] uppercase tracking-wider text-muted-foreground"
                      >
                        {p.authMode.replace(/_/g, " ")}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-border/50 text-[9px] uppercase tracking-wider text-muted-foreground"
                      >
                        {p.capabilities.length} caps
                      </Badge>
                      {p.unsupported.length > 0 && (
                        <Badge
                          variant="outline"
                          className="border-destructive/30 text-[9px] uppercase tracking-wider text-destructive/80"
                        >
                          {p.unsupported.length} unsupported
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {connectable(p) && !conn && (
                        <Button
                          size="sm"
                          className="flex-1 gap-1.5"
                          onClick={() => openConnect(p)}
                        >
                          <KeyRound className="size-3.5" /> Connect
                        </Button>
                      )}
                      {conn && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          disabled={busyId === p.id}
                          onClick={() => void disconnect(p.id, p.name)}
                        >
                          {busyId === p.id ? "Revoking…" : "Disconnect"}
                        </Button>
                      )}
                      {!connectable(p) && !conn && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          disabled
                        >
                          {p.availability === "UNSUPPORTED"
                            ? "No authorized API"
                            : p.availability === "PARTNER_APPROVAL_REQUIRED"
                              ? "Partner approval required"
                              : "Restricted"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}

      <p className="text-[11px] leading-relaxed text-muted-foreground/80">
        Adapter states reflect what each provider's current official developer
        documentation supports. Where a capability is unsupported, TradeCaptain
        marks it as such rather than simulating it. Custody, execution and
        eligibility are enforced by the provider.
      </p>

      <Dialog
        open={connectTarget !== null}
        onOpenChange={(open) => !open && setConnectTarget(null)}
      >
        <DialogContent className="gold-frame sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect {connectTarget?.name}</DialogTitle>
            <DialogDescription>
              Choose the credential environment. Sandbox uses the provider's
              official paper/sandbox program; live connections require
              completing the provider's own authorization flow.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Select
              value={envChoice}
              onValueChange={(v) => setEnvChoice(v as "SANDBOX" | "LIVE")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SANDBOX">Sandbox / paper</SelectItem>
                <SelectItem value="LIVE">Live credentials</SelectItem>
              </SelectContent>
            </Select>
            <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-[11px] leading-relaxed text-muted-foreground">
              By connecting you confirm that you hold an authorized account with
              this provider and that TradeCaptain may transmit instructions
              within the scopes you grant. Deposits and withdrawals are executed
              by the provider, not by TradeCaptain.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectTarget(null)}>
              Cancel
            </Button>
            <Button onClick={() => void confirmConnect()} disabled={busyId !== null}>
              {busyId !== null ? "Connecting…" : "Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
