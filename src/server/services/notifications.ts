import { Resend } from "resend";
import prisma from "@/lib/prisma";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";

const PRIVILEGED_DOMAINS = ["todo.law", "rindogatan.com"];

/**
 * Notify internal (admin) users that a publisher has submitted a skill for review.
 */
export async function notifyAdminNewSubmission(skillDraftId: string) {
  const draft = await prisma.skillDraft.findUnique({
    where: { id: skillDraftId },
    include: {
      analysis: {
        include: {
          document: {
            include: { user: { select: { email: true, name: true } } },
          },
        },
      },
    },
  });

  if (!draft) return;

  // Find all internal users to notify
  const admins = await prisma.user.findMany({
    where: { role: "INTERNAL" },
    select: { email: true },
  });

  if (admins.length === 0 || !resend) {
    console.log(
      `[Notifications] New submission from ${draft.analysis.document.user.email}: ${draft.displayName || draft.contractType}`
    );
    return;
  }

  const publisherEmail = draft.analysis.document.user.email;
  const skillName = draft.displayName || draft.contractType || "Untitled skill";

  for (const admin of admins) {
    try {
      await resend.emails.send({
        from: FROM,
        to: admin.email,
        subject: `New marketplace submission: ${skillName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <h1 style="color: #f5a623; background: #1a1a1a; padding: 20px; margin: 0;">Clausemaster</h1>
            <div style="padding: 20px; background: #f5f5f5;">
              <p><strong>${publisherEmail}</strong> has submitted a skill for marketplace review:</p>
              <p style="font-size: 18px; font-weight: bold;">${skillName}</p>
              <p>Log in to the admin panel to review this submission.</p>
            </div>
          </div>
        `,
      });
    } catch (e) {
      console.error(`Failed to send admin notification to ${admin.email}:`, e);
    }
  }
}

/**
 * Notify a publisher that their skill submission has been approved or rejected.
 */
export async function notifyPublisherReviewResult(skillDraftId: string, approved: boolean) {
  const draft = await prisma.skillDraft.findUnique({
    where: { id: skillDraftId },
    include: {
      analysis: {
        include: {
          document: {
            include: { user: { select: { email: true, name: true } } },
          },
        },
      },
    },
  });

  if (!draft) return;

  const publisherEmail = draft.analysis.document.user.email;
  const skillName = draft.displayName || draft.contractType || "Untitled skill";

  if (!resend) {
    console.log(
      `[Notifications] Skill ${approved ? "approved" : "rejected"} for ${publisherEmail}: ${skillName}`
    );
    return;
  }

  const subject = approved
    ? `Your skill has been approved: ${skillName}`
    : `Your skill submission needs changes: ${skillName}`;

  const body = approved
    ? `<p>Great news! Your skill <strong>${skillName}</strong> has been approved and will be published on the marketplace.</p>`
    : `<p>Your skill <strong>${skillName}</strong> was not approved.</p>
       ${draft.reviewNotes ? `<p><strong>Reviewer notes:</strong> ${draft.reviewNotes}</p>` : ""}
       <p>You can revise and resubmit from your skill draft page.</p>`;

  try {
    await resend.emails.send({
      from: FROM,
      to: publisherEmail,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h1 style="color: #f5a623; background: #1a1a1a; padding: 20px; margin: 0;">Clausemaster</h1>
          <div style="padding: 20px; background: #f5f5f5;">
            ${body}
          </div>
        </div>
      `,
    });
  } catch (e) {
    console.error(`Failed to send review notification to ${publisherEmail}:`, e);
  }
}
