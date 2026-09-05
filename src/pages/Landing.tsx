import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Cpu,
  Globe2,
  KeyRound,
  LineChart,
  Lock,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import logo from "@/assets/logo.svg";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

const TAPE = [
  { s: "AAPL", p: "231.40", c: "+0.62%" },
  { s: "NVDA", p: "134.80", c: "+1.84%" },
  { s: "MSFT", p: "428.10", c: "-0.31%" },
  { s: "TSLA", p: "263.60", c: "-1.12%" },
  { s: "SPY", p: "572.90", c: "+0.24%" },
  { s: "BTC", p: "68,420", c: "+2.31%" },
  { s: "ETH", p: "3,480.5", c: "+1.62%" },
  { s: "SOL", p: "164.20", c: "-0.87%" },
];

const PROVIDERS = [
  "Interactive Brokers",
  "TradeStation",
  "Tradier",
  "Alpaca",
  "Coinbase",
  "Coinbase Advanced",
  "Public",
  "Webull",
  "moomoo",
  "MetaTrader 5",
];

const FEATURES = [
  {
    icon: Activity,
    title: "One trade desk",
    body: "Watchlists, delayed tape and a compliance-aware order ticket across every venue you connect.",
  },
  {
    icon: LineChart,
    title: "Unified portfolio",
    body: "Provider-reported balances and positions, aggregated read-only. Custody never leaves the venue.",
  },
  {
    icon: Wallet,
    title: "Connected accounts",
    body: "API-key and OAuth links to regulated brokers and exchanges, with ten explicit lifecycle states.",
  },
  {
    icon: Bot,
    title: "Trading bots",
    body: "Paper-first automation that transmits only through authorized, trading-enabled connections.",
  },
  {
    icon: Cpu,
    title: "AI analysts",
    body: "Configurable analyst slots that annotate signals and summarize risk — never trade unattended.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance plane",
    body: "Jurisdiction flags gate trading, crypto, options and automation by country and state.",
  },
];

const PRINCIPLES = [
  "Customer assets remain at connected third-party providers",
  "TradeCaptain never commingles or custodies customer funds",
  "Deposits & withdrawals are executed by the provider",
  "Provider KYC/AML and eligibility rules stay enforceable",
  "Unsupported provider functionality is labeled, never simulated",
];

export default function Landing() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen"
    >
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="TradeCaptain" className="size-8 rounded-md" />
            <span className="text-lg font-semibold tracking-tight">
              Trade<span className="text-gold-gradient">Captain</span>
            </span>
          </Link>
          <nav className="ml-6 hidden items-center gap-5 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Platform</a>
            <a href="#architecture" className="hover:text-foreground">Architecture</a>
            <a href="#providers" className="hover:text-foreground">Providers</a>
            <a href="#membership" className="hover:text-foreground">Membership</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/auth?returnTo=%2Fdashboard">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/auth?returnTo=%2Fdashboard">
              <Button size="sm" className="gap-1.5">
                Launch terminal <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.13] animate-grid-pan"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.83 0.155 85 / 30%) 1px, transparent 1px), linear-gradient(90deg, oklch(0.83 0.155 85 / 30%) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(70% 60% at 50% 20%, black, transparent)",
          }}
        />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-16 pt-20 text-center md:pt-28">
          <Badge
            variant="outline"
            className="gap-2 border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary"
          >
            <span className="animate-pulse-dot inline-block size-1.5 rounded-full bg-emerald-400" />
            Orchestration layer for regulated venues
          </Badge>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight md:text-6xl">
            Command every market from{" "}
            <span className="text-gold-gradient">one terminal.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground md:text-lg">
            TradeCaptain connects your brokers and exchanges through their
            official APIs — a single desk for trading, portfolio analytics,
            bots and AI analysts. Your assets stay at the provider. Your keys
            stay yours. Nothing unavailable is ever simulated.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link to="/auth?returnTo=%2Fdashboard" className="w-full sm:w-auto">
              <Button size="lg" className="w-full gap-2 px-7 text-base sm:w-auto">
                Open your terminal <ArrowRight className="size-4" />
              </Button>
            </Link>
            <a href="#architecture" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full px-7 text-base sm:w-auto">
                How custody works
              </Button>
            </a>
          </div>

          {/* Terminal mock */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-14 w-full max-w-4xl"
          >
            <div className="gold-frame-strong overflow-hidden rounded-xl bg-card/90">
              <div className="flex items-center gap-2 border-b border-border/60 bg-secondary/40 px-4 py-2.5">
                <span className="size-2.5 rounded-full bg-red-400/70" />
                <span className="size-2.5 rounded-full bg-amber-400/70" />
                <span className="size-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-3 font-mono-tech text-xs text-muted-foreground">
                  tradecaptain — command overview
                </span>
                <Badge variant="outline" className="ml-auto border-primary/30 text-[10px] text-primary">
                  US · CA
                </Badge>
              </div>
              <div className="grid gap-px bg-border/40 sm:grid-cols-3">
                {[
                  { label: "Connected venues", value: "4", sub: "2 live · 2 sandbox" },
                  { label: "Bot fleet", value: "3", sub: "1 active paper" },
                  { label: "Jurisdiction", value: "US", sub: "posture: trading on" },
                ].map((s) => (
                  <div key={s.label} className="bg-card px-5 py-4 text-left">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {s.label}
                    </div>
                    <div className="mt-1 font-mono-tech text-2xl font-semibold">{s.value}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{s.sub}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/60 bg-secondary/20 px-4 py-3 text-left">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Activity className="size-3" /> Market watch · delayed
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {TAPE.map((t) => (
                    <div
                      key={t.s}
                      className="flex items-center justify-between rounded-md border border-border/40 bg-card px-2.5 py-2"
                    >
                      <span className="font-mono-tech text-xs font-semibold">{t.s}</span>
                      <span className="text-right">
                        <span className="block font-mono-tech text-xs">{t.p}</span>
                        <span
                          className={
                            t.c.startsWith("+")
                              ? "block font-mono-tech text-[10px] text-emerald-400"
                              : "block font-mono-tech text-[10px] text-red-400"
                          }
                        >
                          {t.c}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-foreground/70">
              Illustrative interface. Quotes are delayed demo data until a
              licensed feed or provider connection supplies live values.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Ticker */}
      <section className="group/ticker overflow-hidden border-y border-border/60 bg-secondary/30 py-3">
        <div className="ticker-track flex w-max gap-8">
          {[...TAPE, ...TAPE].map((t, i) => (
            <span key={i} className="flex items-center gap-2 font-mono-tech text-xs">
              <span className="font-semibold">{t.s}</span>
              <span className="text-muted-foreground">{t.p}</span>
              <span className={t.c.startsWith("+") ? "text-emerald-400" : "text-red-400"}>
                {t.c}
              </span>
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto w-full max-w-6xl px-4 py-20">
        <div className="mb-10 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
            The platform
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            Eight surfaces. One orchestration layer.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <motion.div key={f.title} {...fadeUp}>
              <Card className="gold-frame h-full transition-colors hover:border-primary/30">
                <CardHeader className="pb-2">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="size-5" />
                  </div>
                  <CardTitle className="pt-2 text-base">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {f.body}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Architecture / custody */}
      <section id="architecture" className="border-y border-border/60 bg-card/40">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 lg:grid-cols-2">
          <motion.div {...fadeUp}>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
              Architecture
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Built so your assets never pass through us.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
              TradeCaptain is the interface, analytics and automation layer —
              not the custodian. Orders travel through provider APIs you
              authorize. Money movement is executed by the provider. Where a
              provider doesn't offer a capability, the adapter says so plainly.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {PRINCIPLES.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{p}</span>
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div {...fadeUp} className="flex flex-col gap-4">
            <Card className="gold-frame-strong">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Lock className="size-4 text-primary" />
                  <CardTitle className="text-base">Credential handling</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                API keys and OAuth tokens are exchanged server-side and stored
                only as opaque references. Raw secrets never reach the browser
                or the client bundle.
              </CardContent>
            </Card>
            <Card className="gold-frame">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Globe2 className="size-4 text-primary" />
                  <CardTitle className="text-base">Jurisdiction flags</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                Trading, crypto, options and bot automation can be enabled or
                disabled per country and state/territory — enforced at the data
                layer, not just hidden in the UI. A control plane, not a legal
                determination.
              </CardContent>
            </Card>
            <Card className="gold-frame">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="size-4 text-primary" />
                  <CardTitle className="text-base">Ten lifecycle states</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                From AVAILABLE through SANDBOX, CONNECTED, READ_ONLY,
                TRADING_ENABLED, to UNSUPPORTED and DISABLED_FOR_COMPLIANCE —
                every integration shows exactly where it stands.
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Providers */}
      <section id="providers" className="mx-auto w-full max-w-6xl px-4 py-20">
        <div className="mb-10 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
            Providers
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            Adapters written against official documentation.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground md:text-base">
            Each integration declares its real capabilities — and its real
            limits. Partner-gated venues stay gated; unsupported APIs stay
            unsupported.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2.5">
          {PROVIDERS.map((p) => (
            <span
              key={p}
              className="rounded-full border border-border/70 bg-secondary/30 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {p}
            </span>
          ))}
          <span className="rounded-full border border-dashed border-border/70 px-4 py-2 text-sm text-muted-foreground/70">
            + extensible adapter registry
          </span>
        </div>
      </section>

      {/* Membership */}
      <section id="membership" className="mx-auto w-full max-w-6xl px-4 pb-20">
        <Card className="gold-frame-strong overflow-hidden">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 md:p-10">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
                Membership
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
                CORE. PRO. INSTITUTIONAL.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Tiers unlock analyst slots, bot counts, watchlist depth and
                realtime data entitlements. Software access only — custody and
                execution always remain with your providers.
              </p>
              <Link to="/auth?returnTo=%2Fmembership" className="mt-6 inline-block">
                <Button className="gap-2">
                  Choose your tier <ChevronRight className="size-4" />
                </Button>
              </Link>
            </div>
            <div className="border-t border-border/60 bg-secondary/20 p-8 md:p-10 lg:border-l lg:border-t-0">
              <ul className="flex flex-col gap-3 text-sm">
                {[
                  "2–∞ AI analyst slots",
                  "1–∞ trading bots",
                  "Watchlist depth by tier",
                  "Realtime data entitlements",
                  "Multi-account orchestration",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-card/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="TradeCaptain" className="size-6 rounded" />
              <span className="font-semibold">TradeCaptain</span>
            </Link>
            <p className="max-w-3xl text-[11px] leading-relaxed text-muted-foreground/80">
              TradeCaptain is an orchestration, analytics and interface layer
              connecting users to independent regulated brokers and exchanges.
              It is not a broker-dealer, exchange, investment adviser, money
              transmitter or custodian, does not hold or move customer funds,
              and nothing on this site is investment, legal or tax advice.
              Digital-asset and securities activity involves substantial risk.
              Availability of any provider or capability depends on that
              provider's own terms and applicable law.
            </p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <Link to="/auth?returnTo=%2Fdashboard" className="hover:text-foreground">
                Sign in
              </Link>
              <a href="#architecture" className="hover:text-foreground">Custody model</a>
              <a href="#providers" className="hover:text-foreground">Providers</a>
            </div>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}
