import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "../i18n";
import { GlobeIcon, ChevronDownIcon } from "./Icons";

export default function LanguageSwitcher({ className = "" }) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    if (!open) return undefined;
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const handleSelect = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className={`lang-switcher ${className}`} ref={ref}>
      <button
        type="button"
        className="lang-switcher-btn"
        onClick={() => setOpen((o) => !o)}
        title={t("common.language")}
        aria-label={t("common.language")}
        aria-expanded={open}
      >
        <GlobeIcon size={17} />
        <span className="lang-switcher-code">{current.code.toUpperCase()}</span>
        <ChevronDownIcon size={12} />
      </button>
      {open && (
        <div className="lang-switcher-menu" role="listbox">
          {SUPPORTED_LANGUAGES.map((l) => (
            <button
              type="button"
              key={l.code}
              role="option"
              aria-selected={l.code === current.code}
              className={`lang-switcher-option ${l.code === current.code ? "is-active" : ""}`}
              onClick={() => handleSelect(l.code)}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
