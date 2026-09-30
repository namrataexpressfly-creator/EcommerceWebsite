import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import hi from "./locales/hi.json";
import mr from "./locales/mr.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "mr", label: "मराठी" },
];

const STORAGE_KEY = "ef-lang";

function getInitialLanguage() {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) return saved;
  const nav = (window.navigator?.language || "en").slice(0, 2);
  return SUPPORTED_LANGUAGES.some((l) => l.code === nav) ? nav : "en";
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    mr: { translation: mr },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

i18n.on("languageChanged", (lng) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, lng);
    document.documentElement.setAttribute("lang", lng);
  }
});


if (typeof document !== "undefined") {
  document.documentElement.setAttribute("lang", i18n.language);
}

export default i18n;
