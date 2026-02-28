import { DocsNav } from "./components/DocsNav";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
        {/* Sidebar */}
        <aside className="md:col-span-1">
          <div className="sticky top-24">
            <DocsNav />
          </div>
        </aside>

        {/* Content */}
        <div className="md:col-span-4 min-w-0">{children}</div>
      </div>
    </div>
  );
}
