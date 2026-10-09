import { useDeveloperAuth } from "../../context/DeveloperAuthContext";
import StaffLogin from "../../components/StaffLogin";

export default function DeveloperLogin() {
  const { login } = useDeveloperAuth();
  return (
    <StaffLogin
      login={login}
      redirectTo="/developer/plugins"
      rememberKey="dev_remember_username"
      tag="Developer console"
      intro="Build and maintain the shipping plugins that sellers connect to their stores."
      subtitle="Use your developer credentials to continue."
      footnote="Access is limited to Expressfly developers."
      theme="dev"
      headline="Build shipping plugins sellers can trust."
      points={["Connect couriers with the standard API", "Submit plugins for admin review", "Read the full API reference"]}
    />
  );
}
