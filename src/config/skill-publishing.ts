/**
 * Skill-publishing identity and licensing.
 *
 * These values used to be compiled into the skill generators (hardcoded
 * `author: "Clausemaster AI"`, `license: "proprietary"`, and a
 * `com.nel.skills.*` skillId namespace). They are now configurable via env so
 * that community skills can be published under an open license (the
 * LegalQuants / LQ.AI community standard is Apache-2.0) with an appropriate
 * author and namespace, while kept/paid skills can still be marked
 * "proprietary" through the same knob.
 */
export const skillPublishingConfig = {
  /**
   * Default license for generated skills. Defaults to the LegalQuants
   * community license (Apache-2.0). Set to "proprietary" for paid/firm-private
   * skills.
   */
  defaultLicense: process.env.SKILL_DEFAULT_LICENSE || "Apache-2.0",

  /** Author recorded in the manifest and SKILL.md frontmatter. */
  author: process.env.SKILL_AUTHOR || "Sergio Maldonado",

  /** Reverse-DNS namespace for the generated skillId. */
  idNamespace: process.env.SKILL_ID_NAMESPACE || "com.nel.skills",
} as const;

/**
 * A license is "open" (LQ-community-publishable) when it is anything other
 * than the reserved "proprietary" marker. Apache-2.0 and MIT are open; a
 * skill published open must not carry payout/identity fields such as a Stripe
 * Connect account id.
 */
export function isOpenLicense(license: string | undefined | null): boolean {
  if (!license) return true;
  return license.trim().toLowerCase() !== "proprietary";
}
