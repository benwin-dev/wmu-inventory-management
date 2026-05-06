import Image from "next/image";

const quickStats = [
  {
    label: "Total Items",
    value: "2,184",
    delta: "+5.2% this month",
    tone: "text-emerald-700",
  },
  {
    label: "Low Stock",
    value: "26",
    delta: "Needs review",
    tone: "text-amber-700",
  },
  {
    label: "Pending Requests",
    value: "14",
    delta: "4 urgent",
    tone: "text-red-700",
  },
  {
    label: "Checked Out",
    value: "372",
    delta: "Up from last week",
    tone: "text-sky-700",
  },
];

const recentActivity = [
  {
    item: "Dell Latitude 5430",
    category: "Computers",
    status: "Checked Out",
    owner: "Engineering Lab",
    updated: "10 min ago",
  },
  {
    item: "Epson PowerLite 2250U",
    category: "Projectors",
    status: "Maintenance",
    owner: "AV Services",
    updated: "42 min ago",
  },
  {
    item: "Logitech Rally Cam",
    category: "Conference",
    status: "Available",
    owner: "Main Campus",
    updated: "1 hour ago",
  },
  {
    item: "TI-84 Plus CE",
    category: "Calculators",
    status: "Reserved",
    owner: "Student Center",
    updated: "2 hours ago",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,#f8edd8_0%,#f3f4f6_38%,#e5e7eb_100%)] text-zinc-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
        <header className="rounded-3xl border border-zinc-200/80 bg-white/90 px-4 py-4 shadow-lg shadow-zinc-900/5 backdrop-blur md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/wmu-logo.svg"
                alt="Western Michigan University logo"
                width={220}
                height={64}
                priority
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">
                  Inventory Management
                </p>
                <h1 className="text-xl font-semibold text-zinc-900 md:text-2xl">
                  Campus Operations Dashboard
                </h1>
              </div>
            </div>
            <button className="rounded-xl bg-[#4A2F14] px-4 py-2 text-sm font-semibold text-[#F6E4BD] transition hover:bg-[#5b3b18]">
              Create Request
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickStats.map((stat) => (
            <article
              key={stat.label}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-900">{stat.value}</p>
              <p className={`mt-2 text-sm font-medium ${stat.tone}`}>{stat.delta}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Navigation
            </p>
            <nav className="mt-1 flex flex-col gap-1">
              {[
                "Overview",
                "Inventory",
                "Requests",
                "Vendors",
                "Reports",
                "Settings",
              ].map((item) => (
                <button
                  key={item}
                  className={`rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                    item === "Overview"
                      ? "bg-[#4A2F14] text-[#F6E4BD]"
                      : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {item}
                </button>
              ))}
            </nav>
          </aside>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Recent Activity</h2>
              <span className="text-sm font-medium text-zinc-500">Live updates</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-left">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.14em] text-zinc-500">
                    <th className="pb-3 pr-4 font-semibold">Item</th>
                    <th className="pb-3 pr-4 font-semibold">Category</th>
                    <th className="pb-3 pr-4 font-semibold">Status</th>
                    <th className="pb-3 pr-4 font-semibold">Owner</th>
                    <th className="pb-3 font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm text-zinc-700">
                  {recentActivity.map((record) => (
                    <tr key={record.item}>
                      <td className="py-3 pr-4 font-medium text-zinc-900">{record.item}</td>
                      <td className="py-3 pr-4">{record.category}</td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{record.owner}</td>
                      <td className="py-3">{record.updated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
