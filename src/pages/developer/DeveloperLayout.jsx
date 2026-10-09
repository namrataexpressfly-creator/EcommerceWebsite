import { useState } from "react";
import AdminSidebar, { DEVELOPER_SECTIONS } from "../admin/AdminSidebar";
import AdminTopbar from "../admin/AdminTopbar";
import { useDeveloperAuth } from "../../context/DeveloperAuthContext";

// Same shell as the admin console, with the developer menu and developer session.
export default function DeveloperLayout({ onRefresh, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { developer, logout } = useDeveloperAuth();

  return (
    <div className="adm-shell">
      <AdminSidebar
        open={menuOpen}
        onNavigate={() => setMenuOpen(false)}
        sections={DEVELOPER_SECTIONS}
        subtitle="Developer console"
      />
      {menuOpen && <div className="adm-scrim" onClick={() => setMenuOpen(false)} />}

      <div className="adm-content">
        <AdminTopbar
          onRefresh={onRefresh}
          onMenu={() => setMenuOpen((v) => !v)}
          user={developer}
          roleLabel="Developer"
          onLogout={logout}
          logoutTo="/developer/login"
        />
        <main className="adm-main">{children}</main>
      </div>
    </div>
  );
}
