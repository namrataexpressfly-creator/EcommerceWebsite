import { useAdminAuth } from "../../context/AdminAuthContext";
import StaffLogin from "../../components/StaffLogin";

export default function AdminLogin() {
  const { login } = useAdminAuth();
  return (
    <StaffLogin
      login={login}
      redirectTo="/admin/kyc"
      rememberKey="adm_remember_username"
      tag="Admin console"
      intro="Review KYC documents and approve sellers before a store goes live."
      subtitle="Use your admin credentials to continue."
      headline="Review sellers and keep the platform trusted."
      points={["Verify KYC documents quickly", "Approve sellers before they go live", "Manage plugins, customers and stores"]}
    />
  );
}
