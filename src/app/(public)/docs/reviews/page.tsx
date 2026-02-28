import { FlowDiagram } from "../components/FlowDiagram";
import { WorkflowStep } from "../components/WorkflowStep";
import { Bell, MessageSquare } from "lucide-react";

export default function ReviewsDocsPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <span className="tag-accent">Review System</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-3">
          Review System
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
          Clausemaster connects startups with qualified lawyers for expert review
          of AI-analyzed contracts. The review system manages the full lifecycle
          from request to completion.
        </p>
      </section>

      {/* Lifecycle */}
      <section id="lifecycle" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Review Lifecycle
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Every review request follows a four-stage lifecycle.
        </p>

        <div className="card-brutal">
          <FlowDiagram
            steps={[
              { label: "Requested", description: "Startup submits" },
              { label: "Pending", description: "Awaiting claim" },
              { label: "In Review", description: "Lawyer working" },
              { label: "Completed", description: "Notes delivered" },
            ]}
          />
        </div>
      </section>

      {/* Status Reference */}
      <section id="statuses" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Status Reference
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
            <p className="text-xs font-semibold text-blue-400">REQUESTED</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Just submitted
            </p>
          </div>
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
            <p className="text-xs font-semibold text-yellow-400">PENDING</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              In the queue
            </p>
          </div>
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
            <p className="text-xs font-semibold text-purple-400">IN REVIEW</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Lawyer claimed
            </p>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
            <p className="text-xs font-semibold text-green-400">COMPLETED</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Notes delivered
            </p>
          </div>
        </div>
      </section>

      {/* Client Side */}
      <section id="client-flow" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Startup Flow
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          How a startup requests and receives a lawyer review.
        </p>

        <div className="card-brutal">
          <WorkflowStep
            number={1}
            title="Navigate to Analysis"
            actor="Startup"
            description="Open the analysis results for a completed document from your dashboard."
          />
          <WorkflowStep
            number={2}
            title="Request Review"
            actor="Startup"
            description="Click the 'Request Review' button. You can optionally include notes about specific areas you'd like the lawyer to focus on."
          />
          <WorkflowStep
            number={3}
            title="Track Status"
            actor="Startup"
            description="Monitor the review status on your document page. You'll see when a lawyer claims your review."
          />
          <WorkflowStep
            number={4}
            title="Receive Notification"
            description="When the lawyer completes the review, you'll receive a notification."
          />
          <WorkflowStep
            number={5}
            title="View Review Notes"
            actor="Startup"
            description="Read the lawyer's expert observations, corrections, and recommendations on your document page."
            isLast
          />
        </div>
      </section>

      {/* Publisher Side */}
      <section id="publisher-flow" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Lawyer Flow
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          How a lawyer discovers, claims, and completes review requests.
        </p>

        <div className="card-brutal">
          <WorkflowStep
            number={1}
            title="Browse Available Reviews"
            actor="Lawyer"
            description="Visit the Reviews dashboard to see all pending review requests. Each shows the contract type, date, and any startup notes."
          />
          <WorkflowStep
            number={2}
            title="Claim a Review"
            actor="Lawyer"
            description="Click 'Claim' on a review request. This assigns it to you and prevents other lawyers from claiming it."
          />
          <WorkflowStep
            number={3}
            title="Examine the Analysis"
            actor="Lawyer"
            description="Review the AI analysis results alongside the original contract text. The full clause breakdown and flagged issues are available."
          />
          <WorkflowStep
            number={4}
            title="Write Review Notes"
            actor="Lawyer"
            description="Provide your expert assessment in the review notes field. Include observations, corrections to the AI analysis, and actionable recommendations."
          />
          <WorkflowStep
            number={5}
            title="Complete the Review"
            actor="Lawyer"
            description="Submit your notes to complete the review. The startup is notified automatically."
            isLast
          />
        </div>
      </section>

      {/* Notifications */}
      <section id="notifications" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Notifications
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Key events in the review lifecycle trigger notifications to keep all
          parties informed.
        </p>

        <div className="card-brutal">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Notification Events
            </h3>
          </div>

          <div className="space-y-3">
            {[
              {
                event: "Review Requested",
                recipient: "Available Lawyers",
                desc: "A new review is available in the queue",
              },
              {
                event: "Review Claimed",
                recipient: "Startup",
                desc: "A lawyer has started reviewing your contract",
              },
              {
                event: "Review Completed",
                recipient: "Startup",
                desc: "The lawyer has submitted their review notes",
              },
            ].map((notif) => (
              <div
                key={notif.event}
                className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border"
              >
                <MessageSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-semibold text-foreground">
                      {notif.event}
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {notif.recipient}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {notif.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
