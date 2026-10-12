import {
  BLOCKED_EMAIL_MESSAGE_KEY,
  blockedEmailMessage,
  isBlockedAccountEmail,
  isBlockedEnquiryEmail,
} from "./email-policy";

/** Error code carried in the sign-in page URL (?error=EmailNotAccepted). */
export const EMAIL_NOT_ACCEPTED_AUTH_ERROR = "EmailNotAccepted";

/** Locale for server responses: ?lang, then the locale cookies, then Accept-Language. */
export function requestLocale(req: Request): "en" | "es" {
  try {
    const lang = new URL(req.url).searchParams.get("lang");
    if (lang === "es" || lang === "en") return lang;
  } catch {
    /* ignore */
  }
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(/(?:^|;\s*)(?:NEXT_LOCALE|locale)=([^;]*)/);
  if (m?.[1]) return m[1].toLowerCase().startsWith("es") ? "es" : "en";
  const al = (req.headers.get("accept-language") ?? "").toLowerCase();
  return al.startsWith("es") ? "es" : "en";
}

/** The 400 response for a refused address: message key plus localized message. */
export function blockedEmailResponse(req: Request, extra: Record<string, unknown> = {}): Response {
  return Response.json(
    {
      error: BLOCKED_EMAIL_MESSAGE_KEY,
      message: blockedEmailMessage(requestLocale(req)),
      ...extra,
    },
    { status: 400 },
  );
}

/** Account scope (sign-up, sign-in, invitations): both rules. Returns a 400 or null. */
export function rejectAccountEmail(req: Request, email: unknown): Response | null {
  return isBlockedAccountEmail(email) ? blockedEmailResponse(req) : null;
}

/** Enquiry scope (contact, booking, waitlist): dotted Gmail only. Returns a 400 or null. */
export function rejectEnquiryEmail(req: Request, email: unknown): Response | null {
  return isBlockedEnquiryEmail(email) ? blockedEmailResponse(req) : null;
}

/**
 * Guard for the NextAuth e-mail (magic link) sign-in POST. When the posted
 * address is refused, answers 400 before any e-mail is sent. The body keeps a
 * `url` pointing at the sign-in page with ?error=EmailNotAccepted, so the
 * next-auth client (signIn with redirect:false) reads the error code instead
 * of failing to parse the response.
 */
export async function rejectBlockedMagicLink(
  req: Request,
  signInPath = "/sign-in",
): Promise<Response | null> {
  if (req.method !== "POST") return null;
  let pathname: string;
  let origin: string;
  try {
    const u = new URL(req.url);
    pathname = u.pathname;
    origin = u.origin;
  } catch {
    return null;
  }
  if (!/\/signin\/(email|resend|nodemailer)$/.test(pathname)) return null;
  let email: unknown = null;
  try {
    const ct = req.headers.get("content-type") ?? "";
    const clone = req.clone();
    if (ct.includes("application/json")) {
      email = ((await clone.json()) as { email?: unknown })?.email;
    } else {
      email = (await clone.formData()).get("email");
    }
  } catch {
    return null;
  }
  if (!isBlockedAccountEmail(email)) return null;
  return blockedEmailResponse(req, {
    url: `${origin}${signInPath}?error=${EMAIL_NOT_ACCEPTED_AUTH_ERROR}`,
  });
}
