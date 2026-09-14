/**
 * Build-time guards for the two credentials providers that bypass email
 * verification. Both must be absent from a production build.
 */
export interface AuthGuardEnv {
  NODE_ENV?: string;
  E2E_CREDENTIALS_SECRET?: string;
}

/** Dev login (no secret): only under `next dev`. */
export function isDevCredentialsEnabled(env: AuthGuardEnv): boolean {
  return env.NODE_ENV === "development";
}

/** E2E login (shared secret): needs the secret and never a production build. */
export function isE2ECredentialsEnabled(env: AuthGuardEnv): boolean {
  if (env.NODE_ENV === "production") return false;
  return typeof env.E2E_CREDENTIALS_SECRET === "string" && env.E2E_CREDENTIALS_SECRET.length > 0;
}
