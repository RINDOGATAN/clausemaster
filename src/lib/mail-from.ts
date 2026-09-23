import { brand } from "@/config/brand";

const DEFAULT_ADDRESS = "noreply@todo.law";

/**
 * The From header for every e-mail this app sends: "<Product> by <Company> <address>".
 * The address comes from EMAIL_FROM; any display name it already carries is dropped,
 * so the variable can change the address but never the sender name.
 */
export function mailFrom(env: Record<string, string | undefined> = process.env): string {
  const raw = env.EMAIL_FROM?.trim() ?? "";
  const bracketed = raw.match(/<([^<>]+)>/);
  const address = (bracketed ? bracketed[1] : raw).trim() || DEFAULT_ADDRESS;
  return `${brand.name} by ${brand.company} <${address}>`;
}
