import { Resend } from "resend";
import prisma from "@/lib/prisma";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";

const EMAIL_WRAPPER = (body: string) => `
  <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
    <h1 style="color: #f5a623; background: #1a1a1a; padding: 20px; margin: 0;">Clausemaster</h1>
    <div style="padding: 20px; background: #f5f5f5;">${body}</div>
  </div>
`;

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

// ── Review Request Notifications ──

/**
 * Notify all active publishers that a new review request is available.
 */
export async function notifyPublishersNewReview(reviewRequestId: string) {
  const request = await prisma.reviewRequest.findUnique({
    where: { id: reviewRequestId },
    include: {
      document: {
        select: {
          fileName: true,
          analysis: { select: { contractType: true, contractTypeLabel: true } },
        },
      },
    },
  });

  if (!request) return;

  const publishers = await prisma.user.findMany({
    where: { role: "PUBLISHER" },
    select: { email: true },
  });

  const contractLabel = request.document.analysis?.contractTypeLabel || request.document.analysis?.contractType || "Contract";

  if (publishers.length === 0 || !resend) {
    console.log(`[Notifications] New review request for ${contractLabel} (${request.document.fileName})`);
    return;
  }

  for (const pub of publishers) {
    try {
      await resend.emails.send({
        from: FROM,
        to: pub.email,
        subject: `New review request: ${contractLabel}`,
        html: EMAIL_WRAPPER(`
          <p>A client has requested a lawyer review for a <strong>${contractLabel}</strong>.</p>
          ${request.clientNotes ? `<p><em>"${request.clientNotes}"</em></p>` : ""}
          <p>Log in to Clausemaster to claim this review.</p>
        `),
      });
    } catch (e) {
      console.error(`Failed to send review notification to ${pub.email}:`, e);
    }
  }
}

/**
 * Notify a client that a publisher has claimed their review request.
 */
export async function notifyClientReviewClaimed(reviewRequestId: string) {
  const request = await prisma.reviewRequest.findUnique({
    where: { id: reviewRequestId },
    include: {
      client: { select: { email: true } },
      document: { select: { fileName: true } },
    },
  });

  if (!request) return;

  if (!resend) {
    console.log(`[Notifications] Review claimed for ${request.client.email}: ${request.document.fileName}`);
    return;
  }

  try {
    await resend.emails.send({
      from: FROM,
      to: request.client.email,
      subject: `Your review request has been claimed: ${request.document.fileName}`,
      html: EMAIL_WRAPPER(`
        <p>A lawyer has claimed your review request for <strong>${request.document.fileName}</strong> and is now reviewing your contract.</p>
        <p>You'll be notified when the review is complete.</p>
      `),
    });
  } catch (e) {
    console.error(`Failed to send claim notification to ${request.client.email}:`, e);
  }
}

/**
 * Notify a client that their review has been completed.
 */
export async function notifyClientReviewCompleted(reviewRequestId: string) {
  const request = await prisma.reviewRequest.findUnique({
    where: { id: reviewRequestId },
    include: {
      client: { select: { email: true } },
      document: { select: { fileName: true } },
    },
  });

  if (!request) return;

  if (!resend) {
    console.log(`[Notifications] Review completed for ${request.client.email}: ${request.document.fileName}`);
    return;
  }

  try {
    await resend.emails.send({
      from: FROM,
      to: request.client.email,
      subject: `Your lawyer review is ready: ${request.document.fileName}`,
      html: EMAIL_WRAPPER(`
        <p>Your lawyer review for <strong>${request.document.fileName}</strong> is complete!</p>
        <p>Log in to Clausemaster to view the review notes on your document page.</p>
      `),
    });
  } catch (e) {
    console.error(`Failed to send completion notification to ${request.client.email}:`, e);
  }
}
