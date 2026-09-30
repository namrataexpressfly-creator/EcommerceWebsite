import { NavLink } from "react-router-dom";

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
  customers: (
    <Icon>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.4c2 .7 3.5 2.6 3.5 5.6" />
    </Icon>
  ),
};

const SECTIONS = [
  { title: "Main", items: [{ to: "/admin/dashboard", label: "Dashboard", icon: "dashboard" }] },
  {
    title: "Management",
    items: [
      { to: "/admin/kyc", label: "KYC queue", icon: "kyc" },
      { to: "/admin/sellers", label: "Sellers", icon: "sellers" },
      { to: "/admin/customers", label: "Customers", icon: "customers" },
    ],
  },
];

export default function AdminSidebar({ open, onNavigate }) {
  return (
    <aside className={`adm-sidebar${open ? " adm-sidebar-open" : ""}`}>
      <div className="adm-sidebar-brand">
        <span className="adm-logo-mark">E</span>
        <div>
          <div className="adm-wordmark adm-wordmark-sm">Expressfly</div>
          <div className="adm-brand-sub">Admin console</div>
        </div>
      </div>

      <nav className="adm-sidebar-nav">
        {SECTIONS.map((section) => (
          <div className="adm-nav-section" key={section.title}>
            <div className="adm-nav-title">{section.title}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) => `adm-sidebar-link${isActive ? " adm-sidebar-link-active" : ""}`}
              >
                {ICONS[item.icon]}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
