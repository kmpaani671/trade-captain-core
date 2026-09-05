import { useAuth } from "@/hooks/use-auth";
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
import {
  TIERS,
  TIER_BLURB,
  TIER_FEATURES,
  type Tier,
} from "@/lib/membership";
import { formatDate } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { Check, CreditCard, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function Membership() {
  const { user } = useAuth();
  const membership = useQuery(api.membership.getMembership, {});
  const setTier = useMutation(api.membership.setTier);

  const currentTier: Tier = membership?.tier ?? "CORE";

  const choose = async (tier: Tier) => {
    await setTier({ tier });
    toast.success(`Membership switched to ${tier}. Entitlements applied immediately.`);
  };

  return (
    <div className="flex flex-col gap-6 py-2">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
          Plan & entitlements
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Membership</h1>
        <p className="text-sm text-muted-foreground">
          Tiers entitle interface features and tooling depth. They never alter
          custody: assets always remain at your connected providers.
        </p>
      </header>

      <Card className="gold-frame">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Current plan</CardTitle>
              <CardDescription>
                {user?.email ?? "Account"}
                {membership?.startedAt
                  ? ` · member since ${formatDate(membership.startedAt)}`
                  : ""}
              </CardDescription>
            </div>
            <Badge className="bg-primary/15 text-primary">{currentTier}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {TIER_FEATURES[currentTier].map((f) => (
            <Badge
              key={f}
              variant="outline"
              className="border-border/50 text-[11px] font-normal text-muted-foreground"
            >
              <Check className="size-3 text-primary" /> {f}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {TIERS.map((tier) => {
          const isCurrent = tier === currentTier;
          return (
            <Card
              key={tier}
              className={
                isCurrent
                  ? "gold-frame-strong flex flex-col"
                  : "gold-frame flex flex-col"
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono-tech tracking-wide">
                    {tier}
                  </CardTitle>
                  {isCurrent && (
                    <Badge variant="outline" className="border-primary/40 text-primary">
                      Current
                    </Badge>
                  )}
                </div>
                <CardDescription className="leading-relaxed">
                  {TIER_BLURB[tier]}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex flex-col gap-4">
                <ul className="flex flex-col gap-2">
                  {TIER_FEATURES[tier].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent}
                  onClick={() => void choose(tier)}
                  className="gap-2"
                >
                  <CreditCard className="size-4" />
                  {isCurrent ? "Active plan" : `Switch to ${tier}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col gap-2 py-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="size-4 text-primary" /> Billing roadmap
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Tier switching is self-serve in this build; payment processing is
            wired through a payment provider before launch. Membership fees are
            for software access only — TradeCaptain is not a broker-dealer,
            exchange, or money transmitter, does not hold customer funds, and
            receiving payment for software does not by itself authorize
            regulated activity in any jurisdiction.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
