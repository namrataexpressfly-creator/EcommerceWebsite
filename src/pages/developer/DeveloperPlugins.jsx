import { PluginManager } from "../admin/AdminPlugins";
import DeveloperLayout from "./DeveloperLayout";
import { useDeveloperAuth } from "../../context/DeveloperAuthContext";

// Shipping plugin manager for developers (talks to /api/developer/plugins).
export default function DeveloperPlugins() {
  const { authHeader } = useDeveloperAuth();
  return <PluginManager Layout={DeveloperLayout} authHeader={authHeader} apiBase="/developer/plugins" role="developer" />;
}
