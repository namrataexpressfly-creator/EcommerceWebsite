import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import client, { resolveMediaUrl } from "../api/client";
import { CartProvider, useCart } from "../context/CartContext";
import { CustomerAuthProvider, useCustomerAuth } from "../context/CustomerAuthContext";
import { useStoreSlug } from "../context/StoreSlugContext";
import { useTheme } from "../context/ThemeContext";
import CustomerLoginModal from "./CustomerLoginModal";
import StoreFooter from "./StoreFooter";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import { UserIcon, HeartIcon, BagIcon, ChevronDownIcon } from "./Icons";
import { formatMoney, shadeColor } from "../utils/format";
import { FREE_SHIPPING_THRESHOLD } from "../utils/shop";
import { getLayoutPreset } from "../utils/layoutPresets";
import { SOCIAL_LABELS, activeSocialLinks, normalizeSocialUrl } from "../utils/social";
import { SocialIcon } from "./SocialIcons";
import "../styles/storefront-pro.css";

function AccountMenu({ basePath }) {
  const { isLoggedIn, customer, logout, refreshAddresses } = useCustomerAuth();
  const [open, setOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const menuRef = useRef(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  if (!isLoggedIn) {
    return (
      <>
        <button type="button" className="nav-icon-btn" onClick={() => setShowLogin(true)} title={t("store.login")}>
          <UserIcon />
          <span className="nav-icon-label">{t("store.login")}</span>
        </button>
        {showLogin && (
          <CustomerLoginModal
            onClose={() => setShowLogin(false)}
            onSuccess={() => {
              setShowLogin(false);
              refreshAddresses().catch(() => {});
            }}
          />
        )}
      </>
    );
  }

  const firstName = customer?.name?.split(" ")[0] || t("store.account.defaultLabel");

  return (
    <div className="account-menu" ref={menuRef}>
      <button type="button" className="nav-icon-btn" onClick={() => setOpen((o) => !o)}>
        <UserIcon />
        <span className="nav-icon-label">{firstName}</span>
        <ChevronDownIcon />
      </button>
      {open && (
        <div className="account-dropdown">
          <div className="account-dropdown-header">
            <div className="account-dropdown-name">
              {t("store.account.hello", { name: customer?.name || t("store.account.helloFallback") })}
            </div>
            <div className="muted small">{customer?.phone}</div>
          </div>
          <Link to={`${basePath}/account`} onClick={() => setOpen(false)}>{t("store.account.myProfile")}</Link>
          <Link to={`${basePath}/account?tab=orders`} onClick={() => setOpen(false)}>{t("store.account.orders")}</Link>
          <Link to={`${basePath}/wishlist`} onClick={() => setOpen(false)}>{t("store.account.wishlist")}</Link>
          <Link to={`${basePath}/account?tab=addresses`} onClick={() => setOpen(false)}>{t("store.account.savedAddresses")}</Link>
          <button
            type="button"
            className="account-dropdown-logout"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            {t("store.account.logout")}
          </button>
        </div>
      )}
    </div>
  );
}

function MenuIcon({ open, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}

function StoreNav({ storeName, logoUrl, socialLinks }) {
  const { basePath } = useStoreSlug();
  const { totalQuantity } = useCart();
  const { customer } = useCustomerAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const wishlistCount = customer?.wishlist?.length || 0;
  const socials = activeSocialLinks(socialLinks);
  const home = basePath || "/";
  const { t } = useTranslation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const navLinks = (
    <>
      <NavLink to={home} end>
        {t("store.nav.shop")}
      </NavLink>
      <NavLink to={`${basePath}/track`}>{t("store.nav.trackOrder")}</NavLink>
      <NavLink to={`${basePath}/Aboutus`}>{t("store.nav.aboutUs")}</NavLink>
      <NavLink to={`${basePath}/Contactus`}>{t("store.nav.contactUs")}</NavLink>
    </>
  );

  const socialIcons = (
    <div className="topbar-social-links">
      {socials.map(([key, url]) => (
        <a
          key={key}
          href={normalizeSocialUrl(url)}
          target="_blank"
          rel="noopener noreferrer"
          className="topbar-social-icon"
          title={SOCIAL_LABELS[key] || key}
          aria-label={SOCIAL_LABELS[key] || key}
        >
          <SocialIcon platform={key} />
        </a>
      ))}
    </div>
  );

  return (
    <>
      <div className="announce-bar">{t("store.freeDelivery", { amount: formatMoney(FREE_SHIPPING_THRESHOLD) })}</div>
      <header className="store-nav">
        <div className="store-nav-inner">
          <button
            type="button"
            className="nav-burger"
            aria-label={menuOpen ? t("store.closeMenu") : t("store.openMenu")}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <MenuIcon open={menuOpen} />
          </button>

          <Link to={home} className="brand">
            {logoUrl ? <img src={resolveMediaUrl(logoUrl)} alt={storeName} className="brand-logo" /> : storeName}
          </Link>

          <nav className="store-nav-links" aria-label="Main">
            {navLinks}
          </nav>

          {socials.length > 0 && socialIcons}

          <div className="nav-icon-group">
            <LanguageSwitcher className="store-lang-switcher" />
            <ThemeToggle className="store-theme-toggle" />
            <Link to={`${basePath}/wishlist`} className="nav-icon-btn" title={t("store.wishlist")} aria-label={t("store.wishlist")}>
              <HeartIcon />
              {wishlistCount > 0 && <span className="nav-icon-badge">{wishlistCount}</span>}
            </Link>
            <Link to={`${basePath}/cart`} className="nav-icon-btn" title={t("store.cart")} aria-label={t("store.cart")}>
              <BagIcon />
              {totalQuantity > 0 && <span className="nav-icon-badge">{totalQuantity}</span>}
            </Link>
            <AccountMenu basePath={basePath} />
          </div>
        </div>

        {menuOpen && (
          <div className="nav-drawer">
            <nav className="nav-drawer-links" aria-label="Menu">
              {navLinks}
            </nav>
            {socials.length > 0 && socialIcons}
          </div>
        )}
      </header>
    </>
  );
}

function themeToCssVars(theme, isDark) {
  if (!theme) return {};
  const layout = getLayoutPreset(theme.layout_style);
  return {
    "--brand": theme.primary_color,
    "--brand-dark": theme.primary_dark,
    "--brand-soft": theme.primary_soft,
    "--gold": theme.accent_color,
    "--gold-dark": theme.accent_color ? shadeColor(theme.accent_color, -20) : undefined,
    "--gold-soft": theme.accent_color ? shadeColor(theme.accent_color, 45) : undefined,
    "--bg": isDark ? undefined : theme.background_color,
    "--ink": isDark ? undefined : theme.text_color,
    "--font-display": theme.font_display ? `"${theme.font_display}", "Iowan Old Style", ui-serif, Georgia, serif` : undefined,
    "--font-body": theme.font_body ? `"${theme.font_body}", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` : undefined,
    "--radius": layout.radius,
    "--radius-lg": layout.radiusLg,
    "--shadow": layout.shadow,
    "--shadow-lg": layout.shadowLg,
  };
}

export default function StoreLayout() {
  const { slug, basePath } = useStoreSlug();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [storeName, setStoreName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [theme, setTheme] = useState(null);
  const [socialLinks, setSocialLinks] = useState(null);
  const [searchParams] = useSearchParams();
  const [notLive, setNotLive] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setChecked(false);
    setNotLive(false);
    client
      .get(`/store/${slug}`)
      .then(({ data }) => {
        setStoreName(data?.store_name || "");
        setLogoUrl(data?.logo_url || "");
        setTheme(data?.theme || null);
        setSocialLinks(data?.social_links || null);
      })
      .catch((err) => {
        setStoreName("");
        setLogoUrl("");
        setTheme(null);
        setSocialLinks(null);
        if (err.response?.data?.store_live === false) {
          setNotLive(true);
        }
      })
      .finally(() => setChecked(true));
  }, [slug]);

  const previewTheme = (() => {
    const raw = searchParams.get("preview_theme");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  })();
  const effectiveTheme = previewTheme || theme;

  const layout = getLayoutPreset(effectiveTheme?.layout_style);

  useEffect(() => {
    const root = document.documentElement;
    const update = () => root.style.setProperty("--vw-full", `${root.clientWidth}px`);
    update();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(root);
    window.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
      root.style.removeProperty("--vw-full");
    };
  }, []);

  if (checked && notLive) {
    return (
      <div className="store-not-live">
        <h1>{t("store.notLive.title")}</h1>
        <p className="muted">{t("store.notLive.desc")}</p>
      </div>
    );
  }

  return (
    <CustomerAuthProvider>
      <CartProvider>
        <div
          className="store-shell"
          style={themeToCssVars(effectiveTheme, isDark)}
          data-card-style={layout.cardStyle}
          data-nav-style={layout.navStyle}
          data-hero-style={layout.heroStyle}
        >
          {previewTheme && (
            <div className="theme-preview-banner">
              {t("store.themePreviewBanner")}
            </div>
          )}
          <StoreNav storeName={storeName} logoUrl={logoUrl} socialLinks={socialLinks} />
          <main className="store-main">
            <Outlet />
          </main>
          <StoreFooter slug={slug} basePath={basePath} storeName={storeName} logoUrl={logoUrl} socialLinks={socialLinks} />
        </div>
      </CartProvider>
    </CustomerAuthProvider>
  );
}
