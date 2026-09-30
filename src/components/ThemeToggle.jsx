import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";
import { SunIcon, MoonIcon } from "./Icons";

export default function ThemeToggle({ className = "" }) {
  const { isDark, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const title = isDark ? t("common.switchToLight") : t("common.switchToDark");

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`}
      onClick={toggleTheme}
      title={title}
      aria-label={title}
    >
      {isDark ? <SunIcon size={17} /> : <MoonIcon size={17} />}
    </button>
  );
}
