import { FlowDiagram } from "../components/FlowDiagram";
import { WorkflowStep } from "../components/WorkflowStep";
import {
  CreditCard,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Settings,
  ShoppingBag,
  FileText,
} from "lucide-react";

export default function RevenueShareDocsPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <span className="tag-accent">Publisher Revenue</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-3">
          Revenue Share
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
          Earn 70% of subscription revenue from every skill you publish. This
          guide explains how to set up Stripe, how payments flow, and when you
          get paid.
        </p>
      </section>

      {/* Revenue Model */}
      <section id="model" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Revenue Model
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          When a customer subscribes to use a skill you authored, the
          subscription fee is split automatically between you and the platform.
        </p>

        <div className="card-brutal mb-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Revenue Split
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 text-center">
              <p className="text-2xl font-bold text-primary">70%</p>
              <p className="text-xs text-muted-foreground mt-1">
                You (the publisher)
              </p>
            </div>
            <div className="p-4 rounded-lg bg-background border border-border text-center">
              <p className="text-2xl font-bold text-foreground">30%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Platform (hosting, distribution &amp; support)
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Example: A customer pays EUR 9/month for your skill. You receive EUR
            6.30, the platform receives EUR 2.70. Payments are processed via
            Stripe Connect Express.
          </p>
        </div>
      </section>

      {/* Setting Up Stripe */}
      <section id="stripe-setup" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Setting Up Stripe
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Connect your Stripe account from Settings to start receiving payments.
          The entire process takes about 5 minutes.
        </p>

        <div className="card-brutal">
          <WorkflowStep
            number={1}
            title="Go to Settings"
            actor="Publisher"
            description="Navigate to Settings in Clausemaster. Below your Publisher Profile, you'll see the Revenue Share section."
          />
          <WorkflowStep
            number={2}
            title="Click Connect Stripe Account"
            actor="Publisher"
            description="You'll be redirected to Stripe's secure hosted onboarding. Clausemaster never sees your bank details."
          />
          <WorkflowStep
            number={3}
            title="Complete Stripe Onboarding"
            actor="Publisher"
            description="Provide your legal name or firm name, bank account for payouts, and tax information. This varies by country."
          />
          <WorkflowStep
            number={4}
            title="Return to Clausemaster"
            actor="Publisher"
            description="After completing Stripe's onboarding, you're redirected back. The Revenue Share section shows a green checkmark."
            isLast
          />
        </div>

        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Closed the tab early?</strong>{" "}
            No problem. Go back to Settings and click{" "}
            <strong>&quot;Complete Setup&quot;</strong> to resume where you left
            off.
          </p>
        </div>
      </section>

      {/* Payment Flow */}
      <section id="payment-flow" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          How Payments Work
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Revenue share is fully automated. Here&apos;s what happens when a
          customer pays:
        </p>

        <div className="card-brutal mb-6">
          <FlowDiagram
            steps={[
              { label: "Subscribe", description: "Customer pays monthly" },
              { label: "Webhook", description: "Stripe notifies platform" },
              { label: "Split", description: "70/30 calculated" },
              { label: "Transfer", description: "Your share sent" },
              { label: "Payout", description: "Stripe → your bank" },
            ]}
          />
        </div>

        <div className="space-y-3">
          {[
            {
              step: "1",
              text: "Customer's monthly subscription renews on Stripe",
            },
            {
              step: "2",
              text: "Payment succeeds → Stripe webhook fires to the platform",
            },
            {
              step: "3",
              text: "Platform calculates your 70% share automatically",
            },
            {
              step: "4",
              text: "Stripe Connect transfers your share to your connected account",
            },
            {
              step: "5",
              text: "Stripe pays out to your bank per your payout schedule (configurable in your Stripe dashboard)",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border"
            >
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                {item.step}
              </span>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Where Revenue Comes From */}
      <section id="platforms" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Where Revenue Comes From
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Your skills earn revenue on every TodoLaw platform they&apos;re
          published to. The 70/30 split is the same everywhere.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-brutal">
            <ShoppingBag className="w-5 h-5 text-primary mb-2" />
            <h4 className="text-sm font-semibold text-foreground mb-1">
              Dealroom
            </h4>
            <p className="text-xs text-muted-foreground">
              Contract negotiation skills — NDAs, MSAs, DPAs, and more.
            </p>
          </div>
          <div className="card-brutal">
            <FileText className="w-5 h-5 text-primary mb-2" />
            <h4 className="text-sm font-semibold text-foreground mb-1">
              DPO Central
            </h4>
            <p className="text-xs text-muted-foreground">
              Privacy compliance assessments — GDPR, DPIAs, vendor audits.
            </p>
          </div>
          <div className="card-brutal">
            <AlertTriangle className="w-5 h-5 text-primary mb-2" />
            <h4 className="text-sm font-semibold text-foreground mb-1">
              AI Sentinel
            </h4>
            <p className="text-xs text-muted-foreground">
              AI governance assessments — risk frameworks, compliance checklists.
            </p>
          </div>
        </div>
      </section>

      {/* End-to-End Flow */}
      <section id="full-flow" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          From Upload to Earning
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          The complete journey from uploading a contract to receiving your first
          payment.
        </p>

        <div className="card-brutal">
          <WorkflowStep
            number={1}
            title="Connect Stripe"
            actor="Publisher"
            description="Go to Settings → Revenue Share → Connect Stripe Account. Complete Stripe's onboarding."
          />
          <WorkflowStep
            number={2}
            title="Upload a contract"
            actor="Publisher"
            description="Upload a PDF, DOCX, or TXT file. Clausemaster accepts contracts, policies, and assessment templates."
          />
          <WorkflowStep
            number={3}
            title="AI analyzes your document"
            actor="AI"
            description="Clausemaster classifies the contract, extracts clauses, and flags issues automatically."
          />
          <WorkflowStep
            number={4}
            title="Generate a skill"
            actor="Publisher"
            description="Click 'Generate Skill' to create a structured skill draft from the analysis."
          />
          <WorkflowStep
            number={5}
            title="Review and refine"
            actor="Publisher"
            description="Edit clauses, adjust bias ratings, refine legal text. The AI gives you a head start — you perfect it."
          />
          <WorkflowStep
            number={6}
            title="Submit for approval"
            actor="Publisher"
            description="Click 'Submit to Marketplace'. An admin reviews your skill."
          />
          <WorkflowStep
            number={7}
            title="Skill goes live"
            actor="Admin"
            description="Once approved, your skill is exported and seeded to the target platform (Dealroom, DPO Central, or AI Sentinel)."
          />
          <WorkflowStep
            number={8}
            title="Customers subscribe"
            actor="Customer"
            description="Customers subscribe to use your skill at EUR 9/month (or equivalent)."
          />
          <WorkflowStep
            number={9}
            title="You earn 70%"
            actor="Stripe"
            description="Each monthly payment triggers an automatic 70/30 split. Your share lands in your Stripe account."
            isLast
          />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          {[
            {
              q: "Do I need Stripe before publishing my first skill?",
              a: "No. You can publish skills without Stripe connected. However, you won't receive revenue share until you connect. The platform retains 100% in the meantime — once you connect, payments start from the next billing cycle.",
            },
            {
              q: "What type of Stripe account is created?",
              a: "Stripe Connect Express. This is a lightweight account managed by Stripe — you get a dashboard to view earnings and manage payouts, but Clausemaster handles the payment routing.",
            },
            {
              q: "Can I use an existing Stripe account?",
              a: "The onboarding creates a new Stripe Express account linked to Clausemaster. If you already have a Stripe account for other purposes, this won't conflict with it.",
            },
            {
              q: "What currencies are supported?",
              a: "Subscriptions are charged in EUR (Europe) or USD (US). Stripe converts to your local currency at payout time if needed.",
            },
            {
              q: "How do I see my earnings?",
              a: "Log into the Stripe Express Dashboard to see individual payments, pending payouts, payout history, and tax documents.",
            },
            {
              q: "Is the 70/30 split negotiable?",
              a: "The default split is 70% publisher / 30% platform. Custom splits may be available for high-volume publishers — contact the TodoLaw team.",
            },
            {
              q: "I'm outside the US/EU. Can I still receive payments?",
              a: "Yes. Stripe Connect Express supports 46+ countries. Payouts are made in your local currency.",
            },
            {
              q: "What if I disconnect my Stripe account?",
              a: "Your published skills remain active. The platform retains 100% of revenue until you reconnect. Reconnecting resumes payments from the next billing cycle.",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="p-4 rounded-lg bg-background border border-border"
            >
              <p className="text-sm font-semibold text-foreground mb-1">
                {item.q}
              </p>
              <p className="text-xs text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="card-brutal bg-primary/5 border-primary/20">
        <div className="flex items-center gap-3 mb-3">
          <CreditCard className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Ready to start earning?
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Connect your Stripe account in Settings and publish your first skill.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/settings"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Go to Settings
          </a>
          <a
            href="/documents/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Upload a Contract
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>
    </div>
  );
}
