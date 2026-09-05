import { api } from "@/convex/_generated/api";
import { DEFAULT_POSTURE } from "@/lib/compliance";
import type { CompliancePosture } from "@/lib/compliance";
import { useQuery } from "convex/react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

export interface ResolvedCompliance {
  country: string;
  region: string;
  posture: CompliancePosture;
  source: "EXACT" | "COUNTRY" | "GLOBAL" | "DEFAULT_OPEN";
}

interface ComplianceCtx {
  country: string | null;
  region: string | null;
  resolved: ResolvedCompliance | null;
  setJurisdiction: (country: string, region?: string) => void;
}

const Ctx = createContext<ComplianceCtx | null>(null);

export function ComplianceProvider({ children }: { children: ReactNode }) {
  // Persisted jurisdiction lives on the user profile via settings module.
  const settings = useQuery(api.settings.getSettings, {}) ?? null;
  const user = useQuery(api.users.currentUser, {});

  const country =
    user?.jurisdiction?.country ?? settings?.acceptedDisclaimerAt != null
      ? (user?.jurisdiction?.country ?? "US")
      : (user?.jurisdiction?.country ?? null);
  const region = user?.jurisdiction?.region ?? null;

  const serverFlags = useQuery(api.compliance.resolveFlags, {
    country: country ?? "US",
    region: region ?? undefined,
  });

  const resolved: ResolvedCompliance | null = useMemo(() => {
    if (!country) return null;
    const posture = serverFlags
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
      source: serverFlags?.source ?? "DEFAULT_OPEN",
    };
  }, [country, region, serverFlags]);

  const setJurisdiction = (c: string, r?: string) => {
    void fetch("/api/noop").catch(() => {}); // placeholder no-op
    // Real mutation is issued by Settings page via api.settings.setJurisdiction
    window.dispatchEvent(
      new CustomEvent("tc:set-jurisdiction", { detail: { country: c, region: r } }),
    );
  };

  // React to jurisdiction-change events from Settings by reloading user query.
  const [, forceTick] = useForceUpdate();
  useEffect(() => {
    const handler = () => forceTick();
    window.addEventListener("tc:set-jurisdiction", handler);
    return () => window.removeEventListener("tc:set-jurisdiction", handler);
  }, [forceTick]);

  const value = useMemo(
    () => ({ country, region, resolved, setJurisdiction }),
    [country, region, resolved],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function useForceUpdate(): [number, () => void] {
  const [tick, setTick] = useStateShim();
  return [tick, () => setTick((t: number) => t + 1)];
}

function useStateShim(): [number, (fn: (t: number) => number) => void] {
  const [v, setV] = useReactState(0);
  return [v, setV as (fn: (t: number) => number) => void];
}

import { useState as useReactState } from "react";

export function useCompliance() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCompliance must be used within ComplianceProvider");
  return ctx;
}

/** Gate wrapper: renders children only when the posture allows the capability. */
export function ComplianceGate({
  capability,
  fallback,
  children,
}: {
  capability: "trading" | "crypto" | "options" | "botAutomation";
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { resolved } = useCompliance();
  const allowed = !resolved || resolved.posture[`${capability}Allowed` as keyof CompliancePosture];
  if (!allowed) {
    return (
      <>{fallback ?? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-foreground">
          <p className="font-semibold">Unavailable in your jurisdiction</p>
          <p className="mt-1 text-muted-foreground">
            This capability is disabled by compliance flags for your region.
          </p>
        </div>
      )}</>
    );
  }
  return <>{children}</>;
}
