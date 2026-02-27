const PRIVILEGED_DOMAINS = ["@privacycloud.com"];

export function isPrivilegedDomain(email: string): boolean {
  const lower = email.toLowerCase();
  return PRIVILEGED_DOMAINS.some((domain) => lower.endsWith(domain));
}
