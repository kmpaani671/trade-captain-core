import { api } from "@/convex/_generated/api";
import { DEFAULT_POSTURE, jurisdictionName } from "@/lib/compliance";
import type { CompliancePosture } from "@/lib/compliance";
import { useMutation, useQuery } from "convex/react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

export type ComplianceCapability =
  | "trading"
  | "crypto"
  | "options"
  | "botAutomation";

export interface ResolvedCompliance {
  country: string;
  region: string;
  posture: CompliancePosture;
  source: "EXACT" | "COUNTRY" | "GLOBAL" | "DEFAULT_OPEN";
}

interface ComplianceCtx {
  country: string | null;
  region: string | null;
  jurisdictionLabel: string | null;
  resolved: ResolvedCompliance | null;
  /** Persist jurisdiction on the user profile (server-enforced elsewhere). */
  setJurisdiction: (country: string, region?: string) => Promise<void>;
}

const Ctx = createContext<ComplianceCtx | null>(null);

export function ComplianceProvider({ children }: { children: ReactNode }) {
  const user = useQuery(api.users.currentUser, {});

  const country = user?.jurisdiction?.country ?? null;
  const region = user?.jurisdiction?.region ?? null;

  // Server-side flag resolution (exact region -> country -> global default).
  const serverFlags = useQuery(
    api.compliance.resolveFlags,
    country ? { country, region: region ?? undefined } : "skip",
  );

  const resolved: ResolvedCompliance | null = useMemo(() => {
    if (!country) return null;
    const posture: CompliancePosture = serverFlags
      ? {
          tradingAllowed: serverFlags.tradingAllowed,
          cryptoAllowed: serverFlags.cryptoAllowed,
          optionsAllowed: serverFlags.optionsAllowed,
          botAutomationAllowed: serverFlags.botAutomationAllowed,
          note: serverFlags.note,
        }
      : DEFAULT_POSTURE;
    return {
      country,
      region: region ?? "**",
      posture,
      source: (serverFlags?.source ?? "DEFAULT_OPEN") as ResolvedCompliance["source"],
    };
  }, [country, region, serverFlags]);

  const setJurisdictionMutation = useMutation(api.settings.setJurisdiction);
  const setJurisdiction = useCallback(
    async (c: string, r?: string) => {
      await setJurisdictionMutation({ country: c, region: r });
    },
    [setJurisdictionMutation],
  );

  const jurisdictionLabel = useMemo(() => {
    if (!country) return null;
    const name = jurisdictionName(country) ?? country;
    if (region && region !== "**") return `${name} · ${region}`;
    return name;
  }, [country, region]);

  const value = useMemo(
    () => ({
      country,
      region,
      jurisdictionLabel,
      resolved,
      setJurisdiction,
    }),
    [country, region, jurisdictionLabel, resolved, setJurisdiction],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCompliance() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCompliance must be used within ComplianceProvider");
  return ctx;
}

/** True when the resolved posture allows the capability. */
export function useCapability(capability: ComplianceCapability): boolean {
  const { resolved } = useCompliance();
  if (!resolved) return true; // undecided jurisdiction: show UI, server still gates
  const value = resolved.posture[`${capability}Allowed` as keyof CompliancePosture];
  return value === true;
}

/** Gate wrapper: renders children only when the posture allows the capability. */
export function ComplianceGate({
  capability,
  fallback,
  children,
}: {
  capability: ComplianceCapability;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const allowed = useCapability(capability);
  if (!allowed) {
    return (
      <>{fallback ?? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-foreground">
          <p className="font-semibold">Unavailable in your jurisdiction</p>
          <p className="mt-1 text-muted-foreground">
            This capability is disabled by compliance flags for your region.
            Provider-side KYC/AML and eligibility rules still apply
            independently.
          </p>
        </div>
      )}</>
    );
  }
  return <>{children}</>;
}

/**
 * Renders a small inline notice when the jurisdiction has not been confirmed.
 * Used on pages that depend on compliance posture.
 */
export function JurisdictionNotice() {
  const { country, jurisdictionLabel } = useCompliance();
  if (country && jurisdictionLabel) return null;
  return (
    <div className="rounded-md border border-primary/25 bg-primary/5 p-3 text-xs text-muted-foreground">
      Confirm your jurisdiction in Settings to resolve compliance posture for
      your account. Regulated features remain gated until then.
    </div>
  );
}

