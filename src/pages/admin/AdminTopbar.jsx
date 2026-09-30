import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import ThemeToggle from "../../components/ThemeToggle";

export default function AdminTopbar({ onRefresh, onMenu }) {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const name = admin?.username || "Admin";

  return (
    <header className="adm-topbar">
      <button type="button" className="adm-icon-btn adm-menu-btn" onClick={onMenu} aria-label="Open menu">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="adm-topbar-spacer" />

      <div className="adm-topbar-right">
        {onRefresh && (
          <button type="button" className="adm-icon-btn" onClick={onRefresh} title="Refresh" aria-label="Refresh">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 11a8 8 0 1 0-2.3 5.7" />
              <path d="M20 4v7h-7" />
            </svg>
          </button>
        )}
        <ThemeToggle className="adm-icon-btn" />

        <div className="adm-profile" ref={menuRef}>
          <button type="button" className="adm-profile-btn" onClick={() => setOpen((v) => !v)}>
            <span className="adm-avatar">{name.charAt(0).toUpperCase()}</span>
            <span className="adm-profile-text">
              <strong>{name}</strong>
              <small>Administrator</small>
            </span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {open && (
            <div className="adm-menu">
              <button type="button" className="adm-menu-item" onClick={handleLogout}>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
