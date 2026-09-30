
import axios from "axios";

export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const DEFAULT_SLUG =
  import.meta.env.VITE_DEFAULT_STORE_SLUG || "demo-store";

const PLATFORM_HOSTS = (
  import.meta.env.VITE_PLATFORM_HOSTS ||
  "localhost,127.0.0.1"
)
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

export function isCustomDomainHost(hostname = window.location.hostname) {
  const host = hostname.toLowerCase();
  return !PLATFORM_HOSTS.some((platformHost) => host === platformHost || host.endsWith(`.${platformHost}`));
}

export function getCurrentHostname() {
  return window.location.hostname;
}


export const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

export function resolveMediaUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

const client = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use(
  (config) => {
 
    if (!config.headers.Authorization) {
      const token = localStorage.getItem("seller_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    console.log(
      "API REQUEST:",
      config.method?.toUpperCase(),
      `${config.baseURL}${config.url}`
    );

    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => {
    console.log(
      "API RESPONSE:",
      response.status,
      response.config.url
    );

    return response;
  },
  (error) => {
    console.error("API ERROR:", {
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    const status = error.response?.status;
    const serverMessage = error.response?.data?.error;

    let message = serverMessage;
    if (!message) {
      if (!error.response) {
        message = "We couldn't reach the server. Please check your internet connection and try again.";
      } else if (status === 401) {
        message = "Your session has expired. Please log in again.";
      } else if (status === 403) {
        message = "You don't have permission to do this.";
      } else if (status === 404) {
        message = "We couldn't find what you were looking for.";
      } else if (status === 429) {
        message = "You're doing that too often. Please wait a moment and try again.";
      } else if (status >= 500) {
        message = "Something went wrong on our side. Please try again in a little while.";
      } else {
        message = "Something went wrong. Please try again.";
      }
    }


    if (error.response?.data?.code === "STORE_SUSPENDED" && localStorage.getItem("seller_token")) {
      localStorage.removeItem("seller_token");
      localStorage.removeItem("seller");
      sessionStorage.setItem("seller_notice", message);
      if (!window.location.pathname.startsWith("/seller/login")) {
        window.location.replace("/seller/login");
      }
    }


    const friendly = new Error(message);
    friendly.response = error.response;
    friendly.status = status;
    friendly.code = error.response?.data?.code;
    return Promise.reject(friendly);
  }
);


export function resolveStoreByDomain(hostname) {
  return client.get(`/store/by-domain/${encodeURIComponent(hostname)}`);
}

export function setCustomDomain(customDomain) {
  return client.put("/seller/storefront/domain", { custom_domain: customDomain });
}


export function verifyCustomDomain() {
  return client.post("/seller/storefront/domain/verify");
}

export function removeCustomDomain() {
  return client.delete("/seller/storefront/domain");
}

export async function uploadProductImages(files) {
  const list = files instanceof FileList ? Array.from(files) : Array.isArray(files) ? files : [files];
  const formData = new FormData();
  list.forEach((file) => formData.append("images", file));

  const { data } = await client.post("/seller/uploads/product-images", formData, {
 
    headers: { "Content-Type": undefined },
  });
  return data.urls; 
}

export async function uploadBannerImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  const { data } = await client.post("/seller/uploads/banner-image", formData, {
    headers: { "Content-Type": undefined },
  });
  return data.url; 
}


export async function uploadLogoImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  const { data } = await client.post("/seller/uploads/logo-image", formData, {
    headers: { "Content-Type": undefined },
  });
  return data.url; 
}

export async function uploadCategoryImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  const { data } = await client.post("/seller/uploads/category-image", formData, {
    headers: { "Content-Type": undefined },
  });
  return data.url;
}

export async function uploadVariantOptionImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  const { data } = await client.post("/seller/uploads/variant-option-image", formData, {
    headers: { "Content-Type": undefined },
  });
  return data.url;
}

export async function uploadPageImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  const { data } = await client.post("/seller/uploads/page-image", formData, {
    headers: { "Content-Type": undefined },
  });
  return data.url; 
}


function customerTokenKey(slug) {
  return `customer_token_${slug}`;
}

export async function uploadKycDoc(file) {
  const formData = new FormData();
  formData.append("image", file);

  const { data } = await client.post("/seller/uploads/kyc-doc", formData, {
    headers: { "Content-Type": undefined },
  });
  return data.url; 
}


export function getKycStatus() {
  return client.get("/seller/kyc/status");
}

export function submitKyc(payload) {
  return client.post("/seller/kyc/submit", payload);
}

export function getCustomerToken(slug) {
  return localStorage.getItem(customerTokenKey(slug));
}
export function setCustomerToken(slug, token) {
  localStorage.setItem(customerTokenKey(slug), token);
}
export function clearCustomerToken(slug) {
  localStorage.removeItem(customerTokenKey(slug));
}
function customerAuthHeader(slug) {
  const token = getCustomerToken(slug);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function sendCustomerOtp(slug, phone) {
  const { data } = await client.post(`/store/${slug}/customer/otp/send`, { phone });
  return data;
}
export async function customerLogin(slug, phone, otp, name) {
  const { data } = await client.post(`/store/${slug}/customer/login`, { phone, otp, name });
  return data; 
}
export async function getCustomerProfile(slug) {
  const { data } = await client.get(`/store/${slug}/customer/me`, { headers: customerAuthHeader(slug) });
  return data;
}
export async function updateCustomerProfile(slug, payload) {
  const { data } = await client.put(`/store/${slug}/customer/me`, payload, { headers: customerAuthHeader(slug) });
  return data;
}
export async function getCustomerAddresses(slug) {
  const { data } = await client.get(`/store/${slug}/customer/addresses`, { headers: customerAuthHeader(slug) });
  return data;
}
export async function addCustomerAddress(slug, payload) {
  const { data } = await client.post(`/store/${slug}/customer/addresses`, payload, { headers: customerAuthHeader(slug) });
  return data;
}
export async function updateCustomerAddress(slug, addressId, payload) {
  const { data } = await client.put(`/store/${slug}/customer/addresses/${addressId}`, payload, { headers: customerAuthHeader(slug) });
  return data;
}
export async function deleteCustomerAddress(slug, addressId) {
  const { data } = await client.delete(`/store/${slug}/customer/addresses/${addressId}`, { headers: customerAuthHeader(slug) });
  return data;
}
export async function syncCustomerCart(slug, items) {
  const { data } = await client.put(`/store/${slug}/customer/cart`, { items }, { headers: customerAuthHeader(slug) });
  return data;
}
export async function addToWishlist(slug, productId) {
  const { data } = await client.post(`/store/${slug}/customer/wishlist`, { product_id: productId }, { headers: customerAuthHeader(slug) });
  return data; 
}
export async function removeFromWishlist(slug, productId) {
  const { data } = await client.delete(`/store/${slug}/customer/wishlist/${productId}`, { headers: customerAuthHeader(slug) });
  return data;
}

export async function getStoreFilters(slug) {
  const { data } = await client.get(`/store/${slug}/filters`);
  return data;
}

export async function getBestSellers(slug, limit = 8) {
  const { data } = await client.get(`/store/${slug}/products/best-sellers`, { params: { limit } });
  return data; 
}

export async function getStoreReviews(slug, limit = 6) {
  const { data } = await client.get(`/store/${slug}/reviews`, { params: { limit } });
  return data; 
}

export async function getAllStoreReviews(slug, page = 1, limit = 12) {
  const { data } = await client.get(`/store/${slug}/reviews`, { params: { all: true, page, limit } });
  return data; 
}

export async function getProductReviews(slug, productId) {
  const { data } = await client.get(`/store/${slug}/products/${productId}/reviews`);
  return data; 
}

export async function submitProductReview(slug, productId, payload) {
  const { data } = await client.post(`/store/${slug}/products/${productId}/reviews`, payload, {
    headers: customerAuthHeader(slug),
  });
  return data;
}

export async function getCustomerOrders(slug) {
  const { data } = await client.get(`/store/${slug}/customer/orders`, { headers: customerAuthHeader(slug) });
  return data;
}

export async function getTicketReasons() {
  const { data } = await client.get(`/tickets/reasons`);
  return data;
}

export async function createTicket(slug, payload) {
  const { data } = await client.post(`/tickets`, payload, { headers: customerAuthHeader(slug) });
  return data;
}

export async function getMyTickets(slug) {
  const { data } = await client.get(`/tickets/customer/mine`, { headers: customerAuthHeader(slug) });
  return data;
}

export async function replyToTicket(slug, ticketId, text) {
  const { data } = await client.post(
    `/tickets/customer/${ticketId}/reply`,
    { text },
    { headers: customerAuthHeader(slug) }
  );
  return data;
}

export default client;
