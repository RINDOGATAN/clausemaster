export const brand = {
  name: "Clausemaster",
  shortName: "Clausemaster",
  tagline: "AI-Powered Contract Analysis",
  description: "Upload a contract and get instant AI-powered analysis: clause-by-clause breakdown, issue flagging, and jurisdiction-specific insights.",

  company: "TODO.LAW",
  companyShort: "TODO",
  domain: "todo.law",
  contactEmail: "info@rindogatan.com",

  colors: {
    primary: "#f5a623",
    background: "#1a1a1a",
    card: "#242424",
    foreground: "#fefeff",
    muted: "#a0a0a0",
    border: "#333333",
  },

  assets: {
    logo: "/logo-negative.svg",
    symbol: "/simbol-negative.svg",
    favicon: "/favicon.ico",
  },

  links: {
    website: "https://todo.law",
    terms: "https://todo.law/terms",
    privacy: "https://todo.law/privacy",
  },

  cookieDomain: ".todo.law",
} as const;

export type BrandConfig = typeof brand;
