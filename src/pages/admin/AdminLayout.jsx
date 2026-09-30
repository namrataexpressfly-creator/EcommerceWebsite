import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

export default function AdminLayout({ onRefresh, children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="adm-shell">
      <AdminSidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      {menuOpen && <div className="adm-scrim" onClick={() => setMenuOpen(false)} />}

      <div className="adm-content">
        <AdminTopbar onRefresh={onRefresh} onMenu={() => setMenuOpen((v) => !v)} />
        <main className="adm-main">{children}</main>
      </div>
    </div>
  );
}
