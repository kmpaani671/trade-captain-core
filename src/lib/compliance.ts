/**
 * Jurisdiction catalog + client compliance helpers.
 *
 * IMPORTANT: these flags are a product control plane, not a legal
 * determination. Actual per-jurisdiction restrictions are enforced through
 * the complianceFlags table (see src/convex/compliance.ts) and each
 * provider's own KYC/AML/geographic rules.
 */

export interface Jurisdiction {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  regions?: Array<{ code: string; name: string }>;
}

export const JURISDICTIONS: Jurisdiction[] = [
  {
    code: "US",
    name: "United States",
    regions: [
      { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" },
      { code: "AZ", name: "Arizona" }, { code: "AR", name: "Arkansas" },
      { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
      { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" },
      { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" },
      { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
      { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
      { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" },
      { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
      { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
      { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" },
      { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
      { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" },
      { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" },
      { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
      { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
      { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" },
      { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
      { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" },
      { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" },
      { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
      { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
      { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" },
      { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
      { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
      { code: "DC", name: "District of Columbia" },
      { code: "PR", name: "Puerto Rico" },
      { code: "GU", name: "Guam" },
      { code: "VI", name: "U.S. Virgin Islands" },
    ],
  },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
  { code: "IE", name: "Ireland" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "CH", name: "Switzerland" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "JP", name: "Japan" },
  { code: "SG", name: "Singapore" },
  { code: "HK", name: "Hong Kong" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "ZA", name: "South Africa" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "IN", name: "India" },
  { code: "OTHER", name: "Other / unspecified" },
];

export function jurisdictionName(code?: string | null) {
  if (!code) return null;
  return JURISDICTIONS.find((j) => j.code === code)?.name ?? code;
}

/** Default per-jurisdiction posture shown before server flags resolve. */
export interface CompliancePosture {
  tradingAllowed: boolean;
  cryptoAllowed: boolean;
  optionsAllowed: boolean;
  botAutomationAllowed: boolean;
  note?: string;
}

export const DEFAULT_POSTURE: CompliancePosture = {
  tradingAllowed: true,
  cryptoAllowed: true,
  optionsAllowed: true,
  botAutomationAllowed: true,
  note: "Default posture: all capabilities enabled pending per-jurisdiction review. Not legal advice.",
};
