import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * The ten lifecycle states declared in the master spec. Every provider
 * integration is always in exactly one of these states.
 */
export const CONNECTION_STATES = [
  "AVAILABLE",
  "SANDBOX",
  "CONNECTED",
  "AUTHORIZATION_REQUIRED",
  "PARTNER_APPROVAL_REQUIRED",
  "REGION_RESTRICTED",
  "READ_ONLY",
  "TRADING_ENABLED",
  "UNSUPPORTED",
  "DISABLED_FOR_COMPLIANCE",
] as const;

export type ConnectionState = (typeof CONNECTION_STATES)[number];

const TONES: Record<ConnectionState, { chip: string; label: string; desc: string }> = {
  AVAILABLE: {
    chip: "border-border bg-secondary text-secondary-foreground",
    label: "Available",
    desc: "Adapter implemented against official docs — ready to connect.",
  },
  SANDBOX: {
    chip: "border-primary/40 bg-primary/10 text-primary",
    label: "Sandbox",
    desc: "Connected with provider sandbox/paper credentials.",
  },
  CONNECTED: {
    chip: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    label: "Connected",
    desc: "Live credentials connected with read scope.",
  },
  AUTHORIZATION_REQUIRED: {
    chip: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    label: "Authorization required",
    desc: "Token expired or revoked — re-authentication is needed.",
  },
  PARTNER_APPROVAL_REQUIRED: {
    chip: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    label: "Partner approval required",
    desc: "Provider requires an executed partner agreement first.",
  },
  REGION_RESTRICTED: {
    chip: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    label: "Region restricted",
    desc: "Provider does not serve this jurisdiction.",
  },
  READ_ONLY: {
    chip: "border-sky-400/40 bg-sky-400/10 text-sky-300",
    label: "Read only",
    desc: "Connected with read scope only — trading disabled by scope.",
  },
  TRADING_ENABLED: {
    chip: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    label: "Trading enabled",
    desc: "Authorized trade scope — orders transmit to the provider.",
  },
  UNSUPPORTED: {
    chip: "border-destructive/40 bg-destructive/10 text-destructive",
    label: "Unsupported",
    desc: "No official authorized API covers this capability set. Nothing is simulated.",
  },
  DISABLED_FOR_COMPLIANCE: {
    chip: "border-destructive/40 bg-destructive/10 text-destructive",
    label: "Disabled for compliance",
    desc: "Blocked by TradeCaptain jurisdiction flags.",
  },
};

export function StatusChip({
  status,
  className,
  withTooltip = false,
}: {
  status: ConnectionState;
  className?: string;
  withTooltip?: boolean;
}) {
  const tone = TONES[status] ?? TONES.AVAILABLE;
  const chip = (
    <Badge
      variant="outline"
      className={cn("gap-1.5 border-border/70 font-medium tracking-wide", tone.chip, className)}
      title={withTooltip ? tone.desc : undefined}
    >
      <span className="size-1.5 rounded-full bg-current opacity-80" />
      {tone.label}
    </Badge>
  );
  return chip;
}

export function stateDescription(status: ConnectionState): string {
  return TONES[status]?.desc ?? "";
}

/** Category label for provider groups. */
export function categoryLabel(category: "BROKERAGE" | "CRYPTO" | "INFRASTRUCTURE") {
  switch (category) {
    case "BROKERAGE":
      return "Brokerage · Securities";
    case "CRYPTO":
      return "Crypto · Digital assets";
    case "INFRASTRUCTURE":
      return "Trading infrastructure";
  }
}
