"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Scale,
  Shield,
  Brain,
  CreditCard,
} from "lucide-react";

const sections = [
  { title: "Getting Started", href: "/docs", icon: BookOpen },
  { title: "For Lawyers", href: "/docs/publisher", icon: Scale },
  { title: "Revenue Share", href: "/docs/revenue-share", icon: CreditCard },
  { title: "For Admins", href: "/docs/internal", icon: Shield },
  { title: "AI Analysis", href: "/docs/analysis", icon: Brain },
];

export function DocsNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-3">
        Documentation
      </p>
      {sections.map((section) => {
        const isActive =
          pathname === section.href ||
          (section.href !== "/docs" && pathname?.startsWith(section.href));

        return (
          <Link
            key={section.href}
            href={section.href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? "text-primary bg-primary/10 border-l-2 border-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <section.icon className="w-4 h-4 shrink-0" />
            {section.title}
          </Link>
        );
      })}
    </nav>
  );
}
