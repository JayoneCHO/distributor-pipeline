import Link from "next/link";

const links = [
  ["/dashboard", "Dashboard"],
  ["/leads", "Leads"],
  ["/companies", "Companies & Contacts"],
  ["/followups", "Follow-up Queue"],
  ["/templates", "Templates"],
  ["/prices", "Price Manager"],
  ["/settings", "Settings"],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">RUIKD Overseas Sales Follow-up Manager</h1>
            <p className="text-xs text-slate-500">Export operations cockpit for medical aesthetic device sales</p>
          </div>
          <nav className="flex gap-2 text-sm">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="rounded px-2 py-1 hover:bg-slate-100">
                {label}
              </Link>
            ))}
            <form action="/api/logout" method="post"><button className="rounded px-2 py-1 hover:bg-slate-100">Logout</button></form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}
