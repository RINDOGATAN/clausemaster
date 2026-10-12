import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Minimal expect() over node:assert, so the cases read the same in every repo.
function expect(actual: unknown, label?: string) {
  return {
    toBe: (expected: unknown) => assert.equal(actual, expected, label),
    toBeNull: () => assert.equal(actual, null, label),
  };
}

import { isBlockedAccountEmail, isBlockedEnquiryEmail, BLOCKED_EMAIL_MESSAGES } from "../src/lib/email-policy";
import { rejectAccountEmail, rejectEnquiryEmail, rejectBlockedMagicLink } from "../src/lib/email-policy-server";

const REFUSE = [
  "b.ake.r.miche.ll.eba.hpc.y.jx@gmail.com",
  "a.b.c.d@googlemail.com",
  "a.b.c.d+x@gmail.com",
  "someone@hotmail.com",
  "x@hotmail.co.uk",
  "x@hotmail.fr",
  "x@hotmail.com.ar",
  "x@mx.hotmail.com",
  "x@aol.com",
  "x@aol.co.uk",
  "x@aol.de",
];
const ACCEPT = [
  "first.last@gmail.com",
  "a.b.c@gmail.com",
  "a.b+c.d.e@gmail.com",
  "a.b.c.d@example.com",
  "x@aol.example.com",
  "x@nothotmail.com",
  "x@hotmailer.com",
  "x@outlook.com",
];
const DOTTED = "b.ake.r.miche.ll.eba.hpc.y.jx@gmail.com";

describe("e-mail policy: account scope (sign-up, sign-in, invitations)", () => {
  it("refuses dotted Gmail and blocked domains", () => {
    for (const e of REFUSE) expect(isBlockedAccountEmail(e), e).toBe(true);
  });
  it("refuses the uppercase variants", () => {
    for (const e of REFUSE) expect(isBlockedAccountEmail(e.toUpperCase()), e).toBe(true);
    expect(isBlockedAccountEmail("  SOMEONE@HOTMAIL.COM. ")).toBe(true);
  });
  it("accepts ordinary addresses, in any case", () => {
    for (const e of ACCEPT) {
      expect(isBlockedAccountEmail(e), e).toBe(false);
      expect(isBlockedAccountEmail(e.toUpperCase()), e).toBe(false);
    }
  });
  it("never throws on junk", () => {
    for (const e of ["", "nonsense", "@", null, undefined, 42]) expect(isBlockedAccountEmail(e)).toBe(false);
  });
});

describe("e-mail policy: enquiry scope (contact, booking, waitlist)", () => {
  it("refuses dotted Gmail only", () => {
    expect(isBlockedEnquiryEmail(DOTTED)).toBe(true);
    expect(isBlockedEnquiryEmail(DOTTED.toUpperCase())).toBe(true);
  });
  it("keeps hotmail and aol open", () => {
    for (const e of ["x@hotmail.com", "X@HOTMAIL.CO.UK", "x@aol.com", "x@aol.de"]) {
      expect(isBlockedEnquiryEmail(e), e).toBe(false);
    }
  });
});

describe("e-mail policy: server responses", () => {
  it("answers 400 with the message key and the localized message", async () => {
    const req = new Request("https://example.test/api/x", { headers: { "accept-language": "es-ES" } });
    const res = rejectAccountEmail(req, "x@aol.com")!;
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("email_not_accepted");
    expect(body.message).toBe(BLOCKED_EMAIL_MESSAGES.es);
    expect(rejectAccountEmail(req, "first.last@gmail.com")).toBeNull();
    expect(rejectEnquiryEmail(req, "x@hotmail.com")).toBeNull();
    expect(rejectEnquiryEmail(req, DOTTED)!.status).toBe(400);
  });
  it("blocks the magic-link POST before any e-mail is sent", async () => {
    const mk = (email: string) =>
      new Request("https://example.test/api/auth/signin/email", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email, csrfToken: "t", json: "true" }),
      });
    const res = (await rejectBlockedMagicLink(mk("SOMEONE@HOTMAIL.COM")))!;
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("email_not_accepted");
    expect(body.message).toBe(BLOCKED_EMAIL_MESSAGES.en);
    expect(new URL(body.url).searchParams.get("error")).toBe("EmailNotAccepted");
    expect(await rejectBlockedMagicLink(mk("first.last@gmail.com"))).toBeNull();
    const other = new Request("https://example.test/api/auth/signin/google", { method: "POST" });
    expect(await rejectBlockedMagicLink(other)).toBeNull();
  });
});
