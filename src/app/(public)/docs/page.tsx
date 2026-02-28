import Link from "next/link";
import {
  Briefcase,
  Scale,
  Shield,
  Brain,
  MessageSquare,
  Upload,
  FileSearch,
  AlertTriangle,
  Globe,
} from "lucide-react";
import { brand } from "@/config/brand";

export default function DocsOverviewPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <h1 className="text-3xl font-bold text-foreground mb-3">
          {brand.name} Documentation
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
          {brand.description}
        </p>
      </section>

      {/* Quick Start */}
      <section id="quick-start" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Quick Start
        </h2>
        <div className="card-brutal space-y-4">
          {[
            {
              step: 1,
              title: "Sign In",
              desc: "Use your email (magic link) or Google account to sign in.",
            },
            {
              step: 2,
              title: "Upload a Contract",
              desc: "Drag and drop or browse for a PDF, DOCX, or TXT file.",
            },
            {
              step: 3,
              title: "Review the Analysis",
              desc: "Browse extracted clauses, flagged issues, and the executive summary.",
            },
            {
              step: 4,
              title: "Take Action",
              desc: "Download a report, request a lawyer review, or generate skill drafts.",
            },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                {item.step}
              </div>
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

      {/* Three Paths */}
      <section id="roles" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Choose Your Path
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Clausemaster serves three types of users, each with tailored features.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/docs/client" className="group">
            <div className="card-brutal h-full transition-all group-hover:border-primary/40 group-hover:shadow-hover">
              <Briefcase className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Client
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Upload contracts, get AI-powered analysis, download reports, and
                request lawyer reviews.
              </p>
            </div>
          </Link>

          <Link href="/docs/publisher" className="group">
            <div className="card-brutal h-full transition-all group-hover:border-primary/40 group-hover:shadow-hover">
              <Scale className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Lawyer / Publisher
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Generate legal skills, earn 70% revenue on the AAS marketplace,
                and review client contracts.
              </p>
            </div>
          </Link>

          <Link href="/docs/internal" className="group">
            <div className="card-brutal h-full transition-all group-hover:border-primary/40 group-hover:shadow-hover">
              <Shield className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Admin / Internal
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Manage marketplace submissions, administer invite codes, and
                export approved skills.
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* Platform Features */}
      <section id="features" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Platform Features
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Explore the core modules that power Clausemaster.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/docs/analysis" className="group">
            <div className="card-brutal h-full transition-all group-hover:border-primary/40">
              <Brain className="w-6 h-6 text-primary mb-2" />
              <h3 className="text-sm font-semibold text-foreground mb-1">
                AI Analysis Pipeline
              </h3>
              <p className="text-xs text-muted-foreground">
                Three-step AI pipeline: classification, clause extraction, and
                issue flagging.
              </p>
            </div>
          </Link>

          <Link href="/docs/reviews" className="group">
            <div className="card-brutal h-full transition-all group-hover:border-primary/40">
              <MessageSquare className="w-6 h-6 text-primary mb-2" />
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Review System
              </h3>
              <p className="text-xs text-muted-foreground">
                Request lawyer reviews, track status, and receive expert notes
                on your contracts.
              </p>
            </div>
          </Link>

          <div className="card-brutal h-full">
            <Upload className="w-6 h-6 text-primary mb-2" />
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Smart Upload
            </h3>
            <p className="text-xs text-muted-foreground">
              Drag-and-drop upload with support for PDF, DOCX, and TXT formats.
              Text is extracted automatically.
            </p>
          </div>

          <div className="card-brutal h-full">
            <Globe className="w-6 h-6 text-primary mb-2" />
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Multi-Language
            </h3>
            <p className="text-xs text-muted-foreground">
              Full interface support for English and Spanish via next-intl.
            </p>
          </div>
        </div>
      </section>

      {/* Tech Highlights */}
      <section id="tech" className="scroll-mt-20">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Built With
        </h2>
        <div className="flex flex-wrap gap-2">
          {[
            "Next.js 16",
            "React 19",
            "TypeScript",
            "tRPC",
            "Prisma + PostgreSQL",
            "Vercel AI SDK",
            "Claude AI",
            "Tailwind CSS",
            "NextAuth",
          ].map((tech) => (
            <span
              key={tech}
              className="tag-accent"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
