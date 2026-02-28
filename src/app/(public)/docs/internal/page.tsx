import { FlowDiagram } from "../components/FlowDiagram";
import {
  BarChart3,
  ListChecks,
  KeyRound,
  Download,
  Users,
  Eye,
} from "lucide-react";

export default function InternalDocsPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <span className="tag-accent">Admin / Internal</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-3">
          For Admins
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
          Manage marketplace submissions, administer invite codes, export
          approved skills, and oversee all platform activity.
        </p>
      </section>

      {/* Dashboard Overview */}
      <section id="dashboard" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Admin Dashboard
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          The admin dashboard provides an at-a-glance overview of platform
          activity with key metrics.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Pending Submissions",
              icon: ListChecks,
              desc: "Skills awaiting review",
            },
            {
              label: "Publishers",
              icon: Users,
              desc: "Active lawyer accounts",
            },
            {
              label: "Approved Skills",
              icon: BarChart3,
              desc: "Live in knowledge base",
            },
            {
              label: "Invite Codes",
              icon: KeyRound,
              desc: "Active and used codes",
            },
          ].map((stat) => (
            <div key={stat.label} className="stat-card">
              <stat.icon className="w-5 h-5 text-primary mb-2" />
              <p className="text-xs font-semibold text-foreground">
                {stat.label}
              </p>
              <p className="text-[11px] text-muted-foreground">{stat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Submission Queue */}
      <section id="submissions" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Submission Queue
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          When lawyers submit skill drafts, they appear in the admin submission
          queue for review.
        </p>

        <div className="card-brutal mb-6">
          <FlowDiagram
            steps={[
              { label: "Submitted", description: "By publisher" },
              { label: "In Review", description: "Admin examines" },
              { label: "Decision", description: "Approve or reject" },
              { label: "Published", description: "Live in system" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card-brutal">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Review Actions
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-green-400">&#10003;</span>
                <span>
                  <strong className="text-foreground">Approve</strong> &mdash;
                  Skill is published to the knowledge base and becomes available
                  for AI analysis matching.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">&#10007;</span>
                <span>
                  <strong className="text-foreground">Reject</strong> &mdash;
                  Skill is returned to the publisher with notes explaining what
                  needs to be improved.
                </span>
              </li>
            </ul>
          </div>

          <div className="card-brutal">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Queue Filters
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">&#8226;</span>
                Filter by status: Pending, Approved, Rejected
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">&#8226;</span>
                Filter by publisher (lawyer name)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">&#8226;</span>
                Sort by submission date
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">&#8226;</span>
                Preview full skill content before deciding
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Invite Code Management */}
      <section id="invite-codes" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Invite Code Management
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Control access to the platform by creating and managing invite codes.
          Publisher accounts require a valid invite code to complete onboarding.
        </p>

        <div className="card-brutal">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-background border border-border">
              <KeyRound className="w-5 h-5 text-primary mb-2" />
              <p className="text-sm font-semibold text-foreground mb-1">
                Create Codes
              </p>
              <p className="text-xs text-muted-foreground">
                Generate unique invite codes with optional usage limits and
                expiration dates.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-background border border-border">
              <Eye className="w-5 h-5 text-primary mb-2" />
              <p className="text-sm font-semibold text-foreground mb-1">
                Track Usage
              </p>
              <p className="text-xs text-muted-foreground">
                See which codes have been used, by whom, and when they were
                redeemed.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-background border border-border">
              <ListChecks className="w-5 h-5 text-primary mb-2" />
              <p className="text-sm font-semibold text-foreground mb-1">
                Deactivate
              </p>
              <p className="text-xs text-muted-foreground">
                Revoke unused codes at any time to control platform access.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Direct Export */}
      <section id="export" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Skill Export
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Export approved skills to the LegalSkills repository for use by other
          systems.
        </p>

        <div className="card-brutal flex items-start gap-3">
          <Download className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">
              Local Export Only
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The export feature writes approved skills to the{" "}
              <code className="px-1.5 py-0.5 rounded bg-card border border-border text-xs">
                legalskills/
              </code>{" "}
              directory. This only works in local development environments
              &mdash; Vercel&apos;s read-only filesystem prevents writing in
              production.
            </p>
          </div>
        </div>
      </section>

      {/* Full Access */}
      <section id="full-access" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Full Platform Access
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Internal users have access to all features available to publishers and
          startups, in addition to admin tools.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              title: "Upload & Analyze",
              desc: "Upload contracts and run AI analysis, just like startups.",
            },
            {
              title: "Generate Skills",
              desc: "Create skill drafts from analyses, just like publishers.",
            },
            {
              title: "Review Contracts",
              desc: "Claim and complete startup review requests.",
            },
            {
              title: "Admin Tools",
              desc: "Submission queue, invite codes, exports — exclusive to internal users.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border"
            >
              <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
