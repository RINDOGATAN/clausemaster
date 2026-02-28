import { FlowDiagram } from "../components/FlowDiagram";
import { WorkflowStep } from "../components/WorkflowStep";
import {
  Upload,
  FileText,
  AlertTriangle,
  Download,
  ClipboardCopy,
  FileCheck,
} from "lucide-react";

export default function ClientDocsPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <span className="tag-accent">Client</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-3">
          For Clients
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
          Upload contracts, get instant AI analysis, and request expert lawyer
          reviews &mdash; all from a single dashboard.
        </p>
      </section>

      {/* Upload & Analysis Flow */}
      <section id="upload-flow" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Upload &amp; Analysis Flow
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          When you upload a contract, it goes through a multi-step AI pipeline
          automatically.
        </p>
        <div className="card-brutal">
          <FlowDiagram
            steps={[
              { label: "Upload", description: "PDF, DOCX, or TXT" },
              { label: "Extract", description: "Text extraction" },
              { label: "Classify", description: "Contract type" },
              { label: "Analyze", description: "Clauses & issues" },
              { label: "Complete", description: "Results ready" },
            ]}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {[
            { label: "PDF", icon: FileText },
            { label: "DOCX", icon: FileText },
            { label: "TXT", icon: FileText },
          ].map((fmt) => (
            <div
              key={fmt.label}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-sm"
            >
              <fmt.icon className="w-4 h-4 text-primary" />
              <span className="text-foreground font-medium">{fmt.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Analysis Results */}
      <section id="analysis-results" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Understanding Your Results
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          The analysis view is organized into three panels so you can drill down
          from overview to detail.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-brutal">
            <FileText className="w-6 h-6 text-primary mb-2" />
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Clause List
            </h3>
            <p className="text-xs text-muted-foreground">
              Every extracted clause with its type, category, and a one-line
              summary. Click any clause to see full details.
            </p>
          </div>

          <div className="card-brutal">
            <FileCheck className="w-6 h-6 text-primary mb-2" />
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Clause Detail
            </h3>
            <p className="text-xs text-muted-foreground">
              Full text, bias assessment (neutral / favors party A or B), skill
              match confidence, and related boilerplate.
            </p>
          </div>

          <div className="card-brutal">
            <AlertTriangle className="w-6 h-6 text-primary mb-2" />
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Issue Panel
            </h3>
            <p className="text-xs text-muted-foreground">
              Flagged issues with severity (high, medium, low), description, and
              recommended action for each concern.
            </p>
          </div>
        </div>
      </section>

      {/* Executive Summary */}
      <section id="executive-summary" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Executive Summary
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Every analysis includes an executive summary with an overall risk
          assessment and top findings.
        </p>

        <div className="card-brutal space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Risk Levels
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                High Risk
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                Medium Risk
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                Low Risk
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Includes
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">&#8226;</span>
                Overall risk rating with justification
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">&#8226;</span>
                Top findings across all clauses
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">&#8226;</span>
                Key recommendations for next steps
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Reports */}
      <section id="reports" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Reports &amp; Sharing
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Export your analysis results in multiple formats.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card-brutal flex items-start gap-3">
            <Download className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Download PDF Report
              </h3>
              <p className="text-xs text-muted-foreground">
                Generate a comprehensive PDF report with all clauses, issues,
                and the executive summary.
              </p>
            </div>
          </div>

          <div className="card-brutal flex items-start gap-3">
            <ClipboardCopy className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Copy to Clipboard
              </h3>
              <p className="text-xs text-muted-foreground">
                Copy the executive summary or full analysis to your clipboard
                for sharing via email or chat.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Requesting a Review */}
      <section id="requesting-review" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Requesting a Lawyer Review
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          After reviewing your AI analysis, you can request a human lawyer to
          review the results and provide expert notes.
        </p>

        <div className="card-brutal">
          <WorkflowStep
            number={1}
            title="Request Review"
            actor="Client"
            description="From your document's analysis page, click 'Request Review' to submit the contract for lawyer review."
          />
          <WorkflowStep
            number={2}
            title="Pending"
            description="Your request enters the queue. Available lawyers on the platform can see pending review requests."
          />
          <WorkflowStep
            number={3}
            title="In Review"
            actor="Lawyer"
            description="A qualified lawyer claims your review and examines the AI analysis alongside the original contract."
          />
          <WorkflowStep
            number={4}
            title="Complete"
            actor="Lawyer"
            description="The lawyer submits their review notes with expert observations, corrections, and recommendations."
          />
          <WorkflowStep
            number={5}
            title="View Notes"
            actor="Client"
            description="You receive a notification and can view the lawyer's notes directly on your document's page."
            isLast
          />
        </div>
      </section>
    </div>
  );
}
