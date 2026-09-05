import { useCompliance } from "@/compliance/ComplianceContext";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import {
  Activity,
  Bot,
  LayoutDashboard,
  LineChart,
  ListTodo,
  LogOut,
  Menu,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo.svg";

export const WORKSPACE_ROUTES = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/trade", label: "Trade", icon: Activity },
  { to: "/portfolio", label: "Portfolio", icon: LineChart },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/models", label: "AI Models", icon: Bot },
  { to: "/bots", label: "Trading Bot", icon: Bot },
  { to: "/proposals", label: "Proposals", icon: ListTodo },
  { to: "/membership", label: "Membership", icon: ShieldCheck },
  { to: "/settings", label: "Settings", icon: Menu },
] as const;

/** Mobile bottom tabs — first four primary destinations, plus a More drawer. */
const MOBILE_TABS = WORKSPACE_ROUTES.slice(0, 4);

function GlobalComplianceBanner() {
  const flags = useQuery(api.compliance.globalFlags, {});
  if (!flags || flags.tradingAllowed) return null;
  return (
    <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">
      Trading is globally disabled by compliance flags. Provider connectivity
      remains available where legal.
    </div>
  );
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { jurisdictionLabel, resolved } = useCompliance();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <GlobalComplianceBanner />

      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={logo} alt="TradeCaptain" className="size-7 rounded-md" />
            <span className="font-semibold tracking-tight">TradeCaptain</span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            {jurisdictionLabel ? (
              <Badge
                variant="outline"
                className="hidden gap-1.5 border-primary/30 bg-primary/5 text-xs text-primary sm:inline-flex"
              >
                <ShieldCheck className="size-3" />
                {jurisdictionLabel}
              </Badge>
            ) : null}
            <Link
              to="/settings"
              className="hidden text-xs text-muted-foreground hover:text-foreground sm:inline"
            >
              {user?.email ?? "Account"}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setDrawerOpen((v) => !v)}
              aria-label="Menu"
            >
              {drawerOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex"
              onClick={handleSignOut}
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>

        {/* Drawer nav (mobile) */}
        {drawerOpen && (
          <nav className="border-t border-border/70 bg-background px-4 py-3 md:hidden">
            <div className="grid grid-cols-2 gap-2">
              {WORKSPACE_ROUTES.map((r) => (
                <Link
                  key={r.to}
                  to={r.to}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-2 rounded-md border border-border/60 bg-card px-3 py-2 text-sm"
                >
                  <r.icon className="size-4 text-primary" />
                  {r.label}
                </Link>
              ))}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-3 flex w-full items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm text-destructive"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-4 md:pb-10 md:pl-20 md:pr-6">
        {children}
      </main>

      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-16 flex-col items-center gap-1 border-r border-border/70 bg-background/90 py-4 pt-20 md:flex">
        {WORKSPACE_ROUTES.map((r) => (
          <NavLink
            key={r.to}
            to={r.to}
            className={({ isActive }) =>
              cn(
                "group relative flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                isActive && "bg-primary/10 text-primary",
              )
            }
          >
            <r.icon className="size-5" />
            <span className="pointer-events-none absolute left-12 z-50 hidden whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md group-hover:block">
              {r.label}
            </span>
          </NavLink>
        ))}
      </aside>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border/70 bg-background/95 backdrop-blur md:hidden">
        {MOBILE_TABS.map((r) => (
          <NavLink
            key={r.to}
            to={r.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground",
                isActive && "text-primary",
              )
            }
          >
            <r.icon className="size-5" />
            {r.label}
          </NavLink>
        ))}
        <DrawerMore open={drawerOpen} onOpenChange={setDrawerOpen} />
      </nav>
    </div>
  );
}

function DrawerMore({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpenChange(!open)}
      className="flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground"
    >
      <Menu className="size-5" />
      More
    </button>
  );
}
