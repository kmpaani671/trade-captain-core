/** Shared formatting helpers for the TradeCaptain terminal. */

export function formatUsd(value: number | undefined, opts?: { compact?: boolean }) {
  if (value === undefined || Number.isNaN(value)) return "—";
  if (opts?.compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatPct(value: number | undefined, digits = 2) {
  if (value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatQty(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(value);
}

export function formatTime(ts: number | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatDate(ts: number | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function titleCase(s: string) {
  return s
    .toLowerCase()
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function statusTone(status: string): "gold" | "green" | "red" | "gray" {
  switch (status) {
    case "TRADING_ENABLED":
    case "CONNECTED":
      return "green";
    case "SANDBOX":
    case "READ_ONLY":
      return "gold";
    case "AUTHORIZATION_REQUIRED":
    case "REGION_RESTRICTED":
    case "PARTNER_APPROVAL_REQUIRED":
      return "gold";
    case "DISABLED_FOR_COMPLIANCE":
    case "UNSUPPORTED":
      return "red";
    default:
      return "gray";
  }
}
