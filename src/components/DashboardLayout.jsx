
import { NavLink, Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";


const Icon = {
  overview: (p) => (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" {...p}>
      <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11" y="2.5" width="6.5" height="6.5" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
      <rect x="2.5" y="11" width="6.5" height="6.5" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11" y="11" width="6.5" height="6.5" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  orders: (p) => (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" {...p}>
      <path d="M4 6.2h12l-.9 9.3a1.5 1.5 0 0 1-1.5 1.35H6.4a1.5 1.5 0 0 1-1.5-1.35L4 6.2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7 6.2V5a3 3 0 0 1 6 0v1.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  wallet: (p) => (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" {...p}>
      <rect x="2.3" y="5" width="15.4" height="10.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12.5 10.25h3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M2.3 8h15.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  products: (p) => (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" {...p}>
      <path d="M3 6.6 10 3l7 3.6-7 3.6-7-3.6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M3 6.6v6.8L10 17l7-3.6V6.6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 10.2V17" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  variants: (p) => (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" {...p}>
      <path d="M10 3 17 7l-7 4-7-4 7-4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m3.3 10 6.7 3.8L16.7 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m3.3 13.3 6.7 3.8 6.7-3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  warehouses: (p) => (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" {...p}>
      <path d="M2.5 8.4 10 3l7.5 5.4V17H2.5V8.4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7.6 17v-5.2h4.8V17" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  categories: (p) => (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" {...p}>
      <path d="M10.4 2.8h4.9a1.9 1.9 0 0 1 1.9 1.9v4.9a1.9 1.9 0 0 1-.56 1.35l-7.2 7.2a1.9 1.9 0 0 1-2.7 0l-4.03-4.03a1.9 1.9 0 0 1 0-2.7l7.2-7.2c.36-.36.84-.56 1.35-.56Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="13.2" cy="6.8" r="1.15" fill="currentColor" />
    </svg>
  ),
  banners: (p) => (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" {...p}>
      <rect x="2.5" y="4" width="15" height="11" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="m4.6 12.8 3.3-3.3a1.1 1.1 0 0 1 1.5 0l2.3 2.3a1.1 1.1 0 0 0 1.5 0l2.2-2.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="7.6" r="1.05" fill="currentColor" />
    </svg>
  ),
  coupons: (p) => (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" {...p}>
      <path d="M2.7 8.4V5.3a1.6 1.6 0 0 1 1.6-1.6h11.4a1.6 1.6 0 0 1 1.6 1.6v3.1a1.9 1.9 0 0 0 0 3.2v3.1a1.6 1.6 0 0 1-1.6 1.6H4.3a1.6 1.6 0 0 1-1.6-1.6v-3.1a1.9 1.9 0 0 0 0-3.2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 3.7v12.6" stroke="currentColor" strokeWidth="1.6" strokeDasharray="1.6 1.8" />
    </svg>
  ),
  customers: (p) => (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" {...p}>
      <circle cx="7.4" cy="7" r="2.55" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.6 16.3c.6-2.7 2.5-4.2 4.8-4.2s4.2 1.5 4.8 4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12.9 5.2c1.3.2 2.3 1.3 2.3 2.7 0 1.3-.9 2.4-2.1 2.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14.2 12.4c1.7.5 2.9 1.8 3.3 3.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  returns: (p) => (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" {...p}>
      <path d="M4 6.5A6.5 6.5 0 1 1 3.3 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 3v3.5h3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  tickets: (p) => (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" {...p}>
      <path d="M3 5.6a1.6 1.6 0 0 1 1.6-1.6h10.8A1.6 1.6 0 0 1 17 5.6v6.1a1.6 1.6 0 0 1-1.6 1.6H9l-3.4 3v-3H4.6A1.6 1.6 0 0 1 3 11.7V5.6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  kyc: (p) => (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" {...p}>
      <path d="M10 2.8 16.5 5v4.6c0 4-2.7 6.9-6.5 8.2-3.8-1.3-6.5-4.2-6.5-8.2V5L10 2.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m7.3 9.9 1.9 1.9 3.5-3.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  payments: (p) => (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" {...p}>
      <rect x="2.5" y="4.6" width="15" height="10.8" rx="1.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 8h15" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.2 12.1h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  cartActivity: (p) => (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" {...p}>
      <path d="M2.6 3.4h1.6l1.9 9.2a1.6 1.6 0 0 0 1.6 1.3h6.4a1.6 1.6 0 0 0 1.6-1.3l1.1-5.7H5.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8.2" cy="16.5" r="1.1" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="14" cy="16.5" r="1.1" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  settings: (p) => (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" {...p}>
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M10 3.2v1.7M10 15.1v1.7M16.8 10h-1.7M4.9 10H3.2M14.9 5.1l-1.2 1.2M6.3 13.7l-1.2 1.2M14.9 14.9l-1.2-1.2M6.3 6.3 5.1 5.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
};

function getSections(t) {
  return [
    {
      label: null,
      items: [{ to: "/seller", label: t("dashboard.nav.overview"), end: true, icon: Icon.overview }],
    },
    {
      label: t("dashboard.sections.catalog"),
      items: [
        { to: "/seller/products", label: t("dashboard.nav.products"), icon: Icon.products },
        { to: "/seller/product-variants", label: t("dashboard.nav.productVariants"), icon: Icon.variants },
        { to: "/seller/categories", label: t("dashboard.nav.categories"), icon: Icon.categories },
        { to: "/seller/warehouses", label: t("dashboard.nav.warehouses"), icon: Icon.warehouses },
      ],
    },
    {
      label: t("dashboard.sections.sales"),
      items: [
        { to: "/seller/orders", label: t("dashboard.nav.orders"), icon: Icon.orders },
        { to: "/seller/cart-activity", label: t("dashboard.nav.cartActivity"), icon: Icon.cartActivity },
        { to: "/seller/coupons", label: t("dashboard.nav.coupons"), icon: Icon.coupons },
        { to: "/seller/returns", label: t("dashboard.nav.returns"), icon: Icon.returns },
        { to: "/seller/wallet", label: t("dashboard.nav.wallet"), icon: Icon.wallet },
      ],
    },
    {
      label: t("dashboard.sections.marketing"),
      items: [{ to: "/seller/banners", label: t("dashboard.nav.homepageSlider"), icon: Icon.banners }],
    },
    {
      label: t("dashboard.sections.support"),
      items: [
        { to: "/seller/customers", label: t("dashboard.nav.customers"), icon: Icon.customers },
        { to: "/seller/tickets", label: t("dashboard.nav.supportTickets"), icon: Icon.tickets },
      ],
    },
    {
      label: t("dashboard.sections.account"),
      items: [
        { to: "/seller/kyc", label: t("dashboard.nav.kyc"), icon: Icon.kyc },
        { to: "/seller/payment-settings", label: t("dashboard.nav.paymentMethods"), icon: Icon.payments },
        { to: "/seller/settings", label: t("dashboard.nav.storeSettings"), icon: Icon.settings },
      ],
    },
  ];
}

export default function DashboardLayout() {
  const { seller, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const kycStatus = seller?.kyc?.status || "not_submitted";
  const kycApproved = kycStatus === "approved";
  const onKycPage = location.pathname.replace(/\/+$/, "") === "/seller/kyc";


  if (seller && !kycApproved && !onKycPage) {
    return <Navigate to="/seller/kyc" replace />;
  }

  const sections = getSections(t);
  // Same set of links flattened, kept for the KYC-locked view which only
  // ever shows the single KYC item.
  const allLinks = sections.flatMap((s) => s.items);

  const KYC_BANNER = {
    not_submitted: t("dashboard.kycBanner.not_submitted"),
    pending: t("dashboard.kycBanner.pending"),
    rejected: t("dashboard.kycBanner.rejected"),
  };
  const visibleSections = kycApproved
    ? sections
    : [{ label: null, items: allLinks.filter((l) => l.to === "/seller/kyc") }];

  const handleLogout = () => {
    logout();
    navigate("/seller/login");
  };

  return (
    <div className="dash-shell">
      <aside className="dash-sidebar">
        <div className="dash-brand-row">
          <div className="dash-brand">{t("dashboard.brand")}</div>
        </div>
        <div className="dash-store">{seller?.store_slug}</div>
        <nav className="dash-nav">
          {visibleSections.map((section, i) => (
            <div className="dash-nav-group" key={section.label || i}>
              {section.label && <div className="dash-nav-label">{section.label}</div>}
              {section.items.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end}>
                  <span className="dash-nav-icon">{l.icon ? l.icon() : null}</span>
                  <span>{l.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        {kycApproved ? (
          <a
            className="dash-storefront-link"
            href={`/store/${seller?.store_slug}`}
            target="_blank"
            rel="noreferrer"
          >
            {t("dashboard.viewStorefront")}
          </a>
        ) : (
          <span
            className="dash-storefront-link dash-storefront-link-disabled"
            title={t("dashboard.viewStorefrontLockedTitle")}
          >
            {t("dashboard.viewStorefrontLocked")}
          </span>
        )}
        <button className="btn btn-ghost dash-logout" onClick={handleLogout}>
          {t("common.logOut")}
        </button>
      </aside>
      <div className="dash-body">
        <header className="dash-topbar">
          <span>{t("dashboard.signedInAs", { name: seller?.name })}</span>
          <div className="prefs-controls">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main className="dash-content">
          {!kycApproved && (
            <div className="kyc-lock-banner">
              <span>{KYC_BANNER[kycStatus] || KYC_BANNER.not_submitted}</span>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
