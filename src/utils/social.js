export const SOCIAL_LABELS = {
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "Twitter / X",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
  pinterest: "Pinterest",
};


export function normalizeSocialUrl(value) {
  const v = String(value || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v.replace(/^\/+/, "")}`;
}


export function activeSocialLinks(socialLinks) {
  if (!socialLinks) return [];
  return Object.entries(socialLinks).filter(([, url]) => url);
}
