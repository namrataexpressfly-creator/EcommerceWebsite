const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;
const PINCODE_RE = /^\d{6}$/;

export function isRequired(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

export function isValidEmail(value) {
  return EMAIL_RE.test(String(value || "").trim());
}

export function isValidPhone(value) {
  return String(value || "").replace(/\D/g, "").length === 10;
}

export function isValidPincode(value) {
  return PINCODE_RE.test(String(value || "").trim());
}


export function digitsOnly(value, maxLen) {
  const digits = String(value || "").replace(/\D/g, "");
  return maxLen ? digits.slice(0, maxLen) : digits;
}

export function isValidUrl(value) {
  if (!value) return true;
  return URL_RE.test(String(value).trim());
}


export function firstError(checks) {
  for (const [failed, message] of checks) {
    if (failed) return message;
  }
  return "";
}

export const messages = {
  required: (label) => `Please enter ${label}.`,
  email: () => "Please enter a valid email address.",
  phone: () => "Please enter a valid 10-digit phone number.",
  pincode: () => "PIN code should be exactly 6 digits.",
  url: (label = "URL") => `Please enter a valid ${label}.`,
  minLength: (label, len) => `${label} needs to be at least ${len} characters.`,
  maxLength: (label, len) => `${label} can't be more than ${len} characters.`,
};
