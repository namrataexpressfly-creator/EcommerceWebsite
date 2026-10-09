import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { DOCS_NAV, DOCS_PATH, DOCS_ACTIVE_EVENT } from "../../data/devDocsNav";
import "../../styles/sidebar-docs.css";

const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const ICONS = {
  dashboard: (
    <Icon>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </Icon>
  ),
  kyc: (
    <Icon>
      <path d="M12 3 4 6v6c0 4.5 3.2 7.7 8 9 4.8-1.3 8-4.5 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  ),
  sellers: (
    <Icon>
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M4 9v11h16V9" />
      <path d="M9 20v-6h6v6" />
    </Icon>
  ),
  plugins: (
    <Icon>
      <path d="M9 3v4M15 3v4" />
      <path d="M6 7h12v4a6 6 0 0 1-12 0V7Z" />
      <path d="M12 17v4" />
    </Icon>
  ),
  docs: (
    <Icon>
      <path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" />
      <path d="M9 9h6M9 13h6" />
    </Icon>
  ),
  customers: (
    <Icon>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.4c2 .7 3.5 2.6 3.5 5.6" />
    </Icon>
  ),
};

export const ADMIN_SECTIONS = [
  { title: "Main", items: [{ to: "/admin/dashboard", label: "Dashboard", icon: "dashboard" }] },
  {
    title: "Management",
    items: [
      { to: "/admin/kyc", label: "KYC queue", icon: "kyc" },
      { to: "/admin/sellers", label: "Sellers", icon: "sellers" },
      { to: "/admin/customers", label: "Customers", icon: "customers" },
      { to: "/admin/plugins", label: "Shipping plugins", icon: "plugins" },
    ],
  },
];

export const DEVELOPER_SECTIONS = [
  {
    title: "Developer",
    items: [
      { to: "/developer/plugins", label: "Shipping plugins", icon: "plugins" },
      { to: "/developer/docs", label: "API documentation", icon: "docs", submenu: "docs" },
    ],
  },
];


function DocsSubmenu({ onNavigate }) {
  const { hash } = useLocation();
  const [active, setActive] = useState(hash ? hash.slice(1) : "introduction");
  const [q, setQ] = useState("");

  useEffect(() => {
    const on = (e) => setActive(e.detail);
    window.addEventListener(DOCS_ACTIVE_EVENT, on);
    return () => window.removeEventListener(DOCS_ACTIVE_EVENT, on);
  }, []);
  useEffect(() => {
    if (hash) setActive(hash.slice(1));
  }, [hash]);

  const needle = q.trim().toLowerCase();
  const groups = DOCS_NAV.map((g) => ({ ...g, items: g.items.filter(([, label]) => !needle || label.toLowerCase().includes(needle)) })).filter((g) => g.items.length);

  return (
    <div className="adm-subnav">
      <input className="adm-subnav-search" type="search" placeholder="Find anything…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search documentation" />
      {groups.map((g) => (
        <div key={g.group}>
          <div className="adm-subnav-title">{g.group}</div>
          {g.items.map(([id, label]) => (
            <Link key={id} to={`${DOCS_PATH}#${id}`} onClick={onNavigate} className={`adm-subnav-link${active === id ? " is-active" : ""}`}>
              {label}
            </Link>
          ))}
        </div>
      ))}
      {groups.length === 0 && <div className="adm-subnav-title">No match</div>}
    </div>
  );
}

export default function AdminSidebar({ open, onNavigate, sections = ADMIN_SECTIONS, subtitle = "Admin console" }) {
  const { pathname } = useLocation();
  return (
    <aside className={`adm-sidebar${open ? " adm-sidebar-open" : ""}`}>
      <div className="adm-sidebar-brand">
        <span className="adm-logo-mark">E</span>
        <div>
          <div className="adm-wordmark adm-wordmark-sm">Expressfly</div>
          <div className="adm-brand-sub">{subtitle}</div>
        </div>
      </div>

      <nav className="adm-sidebar-nav">
        {sections.map((section) => (
          <div className="adm-nav-section" key={section.title}>
            <div className="adm-nav-title">{section.title}</div>
            {section.items.map((item) => {
              const expanded = item.submenu === "docs" && pathname.startsWith(DOCS_PATH);
              return (
                <div key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) => `adm-sidebar-link${isActive ? " adm-sidebar-link-active" : ""}`}
                  >
                    {ICONS[item.icon]}
                    <span>{item.label}</span>
                    {item.submenu && (
                      <svg className={`adm-chev${expanded ? " is-open" : ""}`} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m9 6 6 6-6 6" />
                      </svg>
                    )}
                  </NavLink>
                  {expanded && <DocsSubmenu onNavigate={onNavigate} />}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
