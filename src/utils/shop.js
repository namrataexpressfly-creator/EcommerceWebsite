
// Flat shipping charge on every order (rupees). Keep in sync with SHIPPING_CHARGE in the backend checkoutRoutes.js.
export const SHIPPING_CHARGE = 49;

export function openThemePreview(storeSlug, theme) {
  if (!storeSlug || !theme) return;
  const params = new URLSearchParams({ preview_theme: JSON.stringify(theme) });
  window.open(`/store/${storeSlug}?${params.toString()}`, "_blank", "noopener");
}

export function discountPercent(price, compareAt) {
  const now = Number(price);
  const was = Number(compareAt);
  if (!(was > now) || !(now >= 0)) return 0;
  return Math.round((1 - now / was) * 100);
}
