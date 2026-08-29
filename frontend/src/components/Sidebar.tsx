import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

type Item = {
  to: string;
  label: string;
  hint?: string;
  end?: boolean;
};

type Group = { title: string; items: Item[] };

const GROUPS: Group[] = [
  {
    title: "Pool",
    items: [
      { to: "/overview", label: "Overview" },
      { to: "/deposit", label: "Deposit" },
      { to: "/wallet", label: "Wallet" },
      { to: "/notes", label: "My Notes" },
    ],
  },
  {
    title: "Privacy",
    items: [
      { to: "/proof-lab", label: "Proof Lab", hint: "Fail-closed demo" },
      { to: "/compliance", label: "Compliance", hint: "ASP" },
      { to: "/ledger", label: "Ledger" },
    ],
  },
  {
    title: "Reference",
    items: [
      { to: "/developers", label: "Developers" },
      { to: "/about", label: "About" },
    ],
  },
];

export function Sidebar({ children }: { children?: ReactNode }) {
  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-rule bg-paperDeep/40">
      <nav className="px-2 py-6 space-y-6 sticky top-14">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <p className="eyebrow px-3 mb-2">{g.title}</p>
            <div className="space-y-0.5">
              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? "nav-link-active" : ""}`
                  }
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span>{it.label}</span>
                    {it.hint ? (
                      <span className="text-[9px] uppercase tracking-[0.14em] text-inkFaint font-normal">
                        {it.hint}
                      </span>
                    ) : null}
                  </span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
        {children ? <div className="pt-4 mt-4 border-t border-ruleFaint px-3">{children}</div> : null}
      </nav>
    </aside>
  );
}

/** Mobile-only top nav for narrow viewports. Horizontal scroll. */
export function MobileNav() {
  return (
    <nav className="lg:hidden border-b border-rule bg-paper/95 backdrop-blur-sm sticky top-14 z-20">
      <div className="mx-auto max-w-report px-4 overflow-x-auto">
        <div className="flex gap-1 py-2 min-w-max">
          {GROUPS.flatMap((g) =>
            g.items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                className={({ isActive }) =>
                  `nav-link !border-l-0 !border-b-2 ${
                    isActive
                      ? "!border-oxblood !text-ink !bg-oxbloodFaint"
                      : "!border-transparent"
                  } whitespace-nowrap`
                }
              >
                {it.label}
              </NavLink>
            )),
          )}
        </div>
      </div>
    </nav>
  );
}