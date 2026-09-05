import { JurisdictionNotice } from "@/compliance/ComplianceContext";
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
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Bot, Cpu, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ModelDoc = Doc<"aiModels">;

const RISK_PROFILES = ["CONSERVATIVE", "BALANCED", "AGGRESSIVE"] as const;
const ASSET_CLASSES = ["EQUITIES", "OPTIONS", "CRYPTO"] as const;

/** Example analyst "providers" — user-labeled, no live model inference here. */
const EXAMPLE_PROVIDERS = ["openai", "anthropic", "local-rules", "custom"];

export default function Models() {
  const models = useQuery(api.aiModels.listModels, {}) ?? [];
  const membership = useQuery(api.membership.getMembership, {});
  const upsertModel = useMutation(api.aiModels.upsertModel);
  const toggleModel = useMutation(api.aiModels.toggleModel);
  const removeModel = useMutation(api.aiModels.removeModel);

  const tier = membership?.tier ?? "CORE";
  const maxSlots =
    tier === "CORE" ? 2 : tier === "PRO" ? 10 : Number.POSITIVE_INFINITY;
  const atLimit = models.length >= maxSlots;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState(EXAMPLE_PROVIDERS[0]);
  const [risk, setRisk] = useState<(typeof RISK_PROFILES)[number]>("BALANCED");
  const [classes, setClasses] = useState<string[]>(["EQUITIES"]);
  const [notes, setNotes] = useState("");

  const toggleClass = (c: string) => {
    setClasses((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };

  const create = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (classes.length === 0) {
      toast.error("Select at least one asset class");
      return;
    }
    try {
      await upsertModel({
        name: name.trim(),
        provider,
        assetClasses: classes as ("EQUITIES" | "OPTIONS" | "CRYPTO")[],
        riskProfile: risk,
        enabled: true,
        notes: notes.trim() || undefined,
      });
      toast.success(`Analyst "${name.trim()}" created`);
      setDialogOpen(false);
      setName("");
      setNotes("");
      setClasses(["EQUITIES"]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create analyst");
    }
  };

  return (
    <div className="flex flex-col gap-6 py-2">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
            AI analysts
          </p>
          <h1 className="text-2xl font-bold tracking-tight">AI Models</h1>
          <p className="text-sm text-muted-foreground">
            Configurable analyst slots that annotate signals — they never place
            orders on their own.
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          disabled={atLimit}
          className="gap-2 self-start"
        >
          <Plus className="size-4" /> New analyst
        </Button>
      </header>

      <JurisdictionNotice />

      <Card className="gold-frame">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Analyst slots</CardTitle>
            <Badge variant="outline" className="border-primary/30 text-primary">
              {models.length} / {Number.isFinite(maxSlots) ? maxSlots : "∞"}
            </Badge>
          </div>
          <CardDescription>
            {tier} tier · {atLimit ? "slot limit reached — upgrade in Membership" : "slots available"}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {models.length === 0 ? (
          <Card className="border-dashed md:col-span-2">
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <Bot className="size-8 text-primary/60" />
              <p className="font-semibold">No analysts configured</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Analysts are user-defined configurations — label, risk posture
                and asset focus. They annotate and summarize; they do not
                execute. Link them to bots on the Trading Bot page.
              </p>
            </CardContent>
          </Card>
        ) : (
          models.map((m: ModelDoc) => (
            <Card key={m._id} className="gold-frame">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Cpu className="size-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{m.name}</CardTitle>
                      <CardDescription className="text-[11px]">
                        {m.provider} · {m.riskProfile.toLowerCase()}
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={m.enabled}
                    onCheckedChange={(v) =>
                      void toggleModel({ id: m._id, enabled: v })
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-1">
                  {m.assetClasses.map((c) => (
                    <Badge
                      key={c}
                      variant="outline"
                      className="border-border/50 text-[9px] uppercase tracking-wider text-muted-foreground"
                    >
                      {c}
                    </Badge>
                  ))}
                </div>
                {m.notes && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {m.notes}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    slug: {m.slug}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      void removeModel({ id: m._id });
                      toast.success("Analyst removed");
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="gold-frame sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> New AI analyst
            </DialogTitle>
            <DialogDescription>
              Define a configuration for signal annotation. No model inference
              runs until you connect an inference provider key.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Name</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Macro Sweep · Conservative"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Provider label</span>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLE_PROVIDERS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProvider(p)}
                    className={
                      provider === p
                        ? "rounded-md border border-primary/50 bg-primary/10 px-2.5 py-1 text-xs text-primary"
                        : "rounded-md border border-border/60 px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/30"
                    }
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Risk profile</span>
              <div className="flex gap-1.5">
                {RISK_PROFILES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRisk(r)}
                    className={
                      risk === r
                        ? "flex-1 rounded-md border border-primary/50 bg-primary/10 px-2 py-1 text-xs text-primary"
                        : "flex-1 rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground hover:border-primary/30"
                    }
                  >
                    {r.charAt(0) + r.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Asset classes</span>
              <div className="flex gap-1.5">
                {ASSET_CLASSES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleClass(c)}
                    className={
                      classes.includes(c)
                        ? "flex-1 rounded-md border border-primary/50 bg-primary/10 px-2 py-1 text-xs text-primary"
                        : "flex-1 rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground hover:border-primary/30"
                    }
                  >
                    {c.charAt(0) + c.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                placeholder="What should this analyst focus on?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void create()}>Create analyst</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
