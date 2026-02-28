import Link from "next/link";
import { brand } from "@/config/brand";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-foreground"
          >
            {brand.name}{" "}
            <span className="text-muted-foreground text-sm font-normal">
              by {brand.company}
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/docs"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Docs
            </Link>
            <Link href="/sign-in" className="btn-brutal text-sm px-4 py-2">
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {brand.company}. All rights
            reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href={brand.links.privacy}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href={brand.links.terms}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              href={brand.links.website}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {brand.domain}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
