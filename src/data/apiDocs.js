
export const API_BASE_EXAMPLE = "https://api.yourstore.com"; // shown as a placeholder; replaced with the real 

export const apiGroups = [
  {
    id: "storefront",
    title: "Storefront",
    description: "Read your store's theme, sections and basic info — enough to render a homepage.",
    endpoints: [
      {
        id: "get-store",
        method: "GET",
        path: "/api/store/:slug",
        summary: "Get storefront config",
        description:
          "Returns your store's name, theme and the homepage sections you've enabled (hero, product grid, banners, FAQ, etc.) in display order. No login required — this is what your public website calls to render the homepage.",
        params: [{ name: "slug", in: "path", type: "string", desc: "Your store's slug, e.g. demo-store." }],
        curl: `curl https://api.yourstore.com/api/store/demo-store`,
        js: `const res = await fetch("https://api.yourstore.com/api/store/demo-store");
const store = await res.json();`,
        response: `{
  "store_name": "Demo Store",
  "slug": "demo-store",
  "theme": { "primary_color": "#1c5f45" },
  "sections": [
    {
      "_id": "6705f1...",
      "type": "hero",
      "order": 0,
      "is_enabled": true,
      "settings": { "heading": "New season, new picks" }
    },
    { "type": "product_grid", "order": 1, "is_enabled": true, "settings": { "title": "Best sellers" } }
  ]
}`,
      },
      {
        id: "get-policies",
        method: "GET",
        path: "/api/store/:slug/policies",
        summary: "Get store policies",
        description: "Returns the auto-generated Privacy, Terms, Shipping and Return policy text for this store.",
        params: [{ name: "slug", in: "path", type: "string", desc: "Your store's slug." }],
        curl: `curl https://api.yourstore.com/api/store/demo-store/policies`,
        js: `const res = await fetch("https://api.yourstore.com/api/store/demo-store/policies");
const policies = await res.json();`,
        response: `{
  "privacy_policy": "...",
  "terms_and_conditions": "...",
  "shipping_policy": "...",
  "return_policy": "..."
}`,
      },
    ],
  },
  {
    id: "catalog",
    title: "Products & categories",
    description: "Browse, search and filter your catalog — the data behind your shop page and product pages.",
    endpoints: [
      {
        id: "list-products",
        method: "GET",
        path: "/api/store/:slug/products",
        summary: "List / search products",
        description:
          "Returns a page of products, with optional search, category filter, price range and sort. Use this to build your shop grid, search bar and category pages.",
        params: [
          { name: "slug", in: "path", type: "string", desc: "Your store's slug." },
          { name: "q", in: "query", type: "string", desc: "Free-text search across name, description and tags." },
          { name: "category", in: "query", type: "string", desc: "Category slug to filter by." },
          { name: "min_price", in: "query", type: "number", desc: "Only products priced at or above this." },
          { name: "max_price", in: "query", type: "number", desc: "Only products priced at or below this." },
          { name: "sort", in: "query", type: "string", desc: "newest (default), price_asc or price_desc." },
          { name: "page", in: "query", type: "number", desc: "Page number, starting at 1." },
          { name: "limit", in: "query", type: "number", desc: "Results per page." },
        ],
        curl: `curl "https://api.yourstore.com/api/store/demo-store/products?category=shoes&min_price=500&max_price=3000&sort=price_asc&page=1&limit=12"`,
        js: `const params = new URLSearchParams({ category: "shoes", min_price: 500, max_price: 3000, sort: "price_asc", page: 1, limit: 12 });
const res = await fetch(\`https://api.yourstore.com/api/store/demo-store/products?\${params}\`);
const { products, total } = await res.json();`,
        response: `{
  "products": [
    {
      "_id": "6705e2...",
      "name": "Canvas Sneaker",
      "slug": "canvas-sneaker",
      "price": 1499,
      "compare_at_price": 1899,
      "images": ["https://.../sneaker-1.jpg"],
      "stock_qty": 24,
      "is_active": true,
      "category_id": "6705cd..."
    }
  ],
  "total": 37,
  "page": 1,
  "limit": 12
}`,
      },
      {
        id: "get-product",
        method: "GET",
        path: "/api/store/:slug/products/:productId",
        summary: "Get a single product",
        description: "Returns full detail for one product, including variant combinations where the product has them. Use this to render a product detail page.",
        params: [
          { name: "slug", in: "path", type: "string", desc: "Your store's slug." },
          { name: "productId", in: "path", type: "string", desc: "The product's _id from the list endpoint." },
        ],
        curl: `curl https://api.yourstore.com/api/store/demo-store/products/6705e2...`,
        js: `const res = await fetch("https://api.yourstore.com/api/store/demo-store/products/6705e2...");
const product = await res.json();`,
        response: `{
  "_id": "6705e2...",
  "name": "Canvas Sneaker",
  "description": "Lightweight everyday sneaker.",
  "price": 1499,
  "images": ["https://.../sneaker-1.jpg"],
  "combinations": [
    { "_id": "6705e3...", "label": "UK 8 / Blue", "sku": "SNK-8-BLU", "price": 1499, "stock": 6 }
  ]
}`,
      },
      {
        id: "list-categories",
        method: "GET",
        path: "/api/store/:slug/categories",
        summary: "List categories",
        description: "Returns the active categories for this store, for a category menu or filter sidebar.",
        params: [{ name: "slug", in: "path", type: "string", desc: "Your store's slug." }],
        curl: `curl https://api.yourstore.com/api/store/demo-store/categories`,
        js: `const res = await fetch("https://api.yourstore.com/api/store/demo-store/categories");
const categories = await res.json();`,
        response: `[
  { "_id": "6705cd...", "name": "Shoes", "slug": "shoes", "image_url": "https://.../shoes.jpg" },
  { "_id": "6705ce...", "name": "Bags", "slug": "bags", "image_url": "https://.../bags.jpg" }
]`,
      },
    ],
  },
  {
    id: "checkout",
    title: "Checkout",
    description: "Price a cart, verify the buyer's phone with OTP, apply a coupon, then place the order.",
    endpoints: [
      {
        id: "checkout-init",
        method: "POST",
        path: "/api/checkout/init",
        summary: "Price a cart",
        description: "Send the items a shopper wants and get back server-calculated pricing (subtotal, discount, tax, shipping, total) — never trust client-side totals.",
        params: [
          { name: "slug", in: "body", type: "string", desc: "Your store's slug." },
          { name: "items", in: "body", type: "array", desc: "[{ product_id, quantity, combination_id? }]" },
        ],
        curl: `curl -X POST https://api.yourstore.com/api/checkout/init \\
  -H "Content-Type: application/json" \\
  -d '{"slug":"demo-store","items":[{"product_id":"6705e2...","quantity":2}]}'`,
        js: `const res = await fetch("https://api.yourstore.com/api/checkout/init", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ slug: "demo-store", items: [{ product_id: "6705e2...", quantity: 2 }] }),
});
const pricedCart = await res.json();`,
        response: `{
  "items": [{ "product_id": "6705e2...", "name": "Canvas Sneaker", "price": 1499, "quantity": 2 }],
  "subtotal": 2998,
  "discount": 0,
  "tax_amount": 0,
  "shipping": 49,
  "total_amount": 3047
}`,
      },
      {
        id: "otp-send",
        method: "POST",
        path: "/api/checkout/otp/send",
        summary: "Send a login OTP",
        description: "Sends a 6-digit code by SMS to the given phone number, used to verify the buyer before placing an order.",
        params: [{ name: "phone", in: "body", type: "string", desc: "E.164 format, e.g. +919876543210." }],
        curl: `curl -X POST https://api.yourstore.com/api/checkout/otp/send \\
  -H "Content-Type: application/json" \\
  -d '{"phone":"+919876543210"}'`,
        js: `await fetch("https://api.yourstore.com/api/checkout/otp/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ phone: "+919876543210" }),
});`,
        response: `{ "sent": true, "expires_in": 300 }`,
      },
      {
        id: "otp-verify",
        method: "POST",
        path: "/api/checkout/otp/verify",
        summary: "Verify the OTP",
        description: "Checks the code the shopper typed in. 5 wrong attempts invalidates the code and a new one must be requested.",
        params: [
          { name: "phone", in: "body", type: "string", desc: "Same number the OTP was sent to." },
          { name: "otp", in: "body", type: "string", desc: "The 6-digit code." },
        ],
        curl: `curl -X POST https://api.yourstore.com/api/checkout/otp/verify \\
  -H "Content-Type: application/json" \\
  -d '{"phone":"+919876543210","otp":"482913"}'`,
        js: `await fetch("https://api.yourstore.com/api/checkout/otp/verify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ phone: "+919876543210", otp: "482913" }),
});`,
        response: `{ "verified": true }`,
      },
      {
        id: "coupon-apply",
        method: "POST",
        path: "/api/checkout/coupon/apply",
        summary: "Apply a coupon",
        description: "Validates a coupon code against the current cart and returns the discount it unlocks.",
        params: [
          { name: "slug", in: "body", type: "string", desc: "Your store's slug." },
          { name: "code", in: "body", type: "string", desc: "The coupon code, e.g. WELCOME10." },
          { name: "subtotal", in: "body", type: "number", desc: "Cart subtotal from checkout/init." },
          { name: "items", in: "body", type: "array", desc: "Same items array used for checkout/init." },
        ],
        curl: `curl -X POST https://api.yourstore.com/api/checkout/coupon/apply \\
  -H "Content-Type: application/json" \\
  -d '{"slug":"demo-store","code":"WELCOME10","subtotal":2998,"items":[{"product_id":"6705e2...","quantity":2}]}'`,
        js: `const res = await fetch("https://api.yourstore.com/api/checkout/coupon/apply", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ slug: "demo-store", code: "WELCOME10", subtotal: 2998, items: [...] }),
});
const { discount } = await res.json();`,
        response: `{ "valid": true, "discount_type": "percentage", "discount_value": 10, "discount": 299.8 }`,
      },
      {
        id: "place-order",
        method: "POST",
        path: "/api/checkout/order",
        summary: "Place the order",
        description: "Creates the order after OTP verification. For online payment this also creates the Razorpay order; for COD the order is confirmed straight away (subject to fraud/COD checks).",
        params: [
          { name: "slug", in: "body", type: "string", desc: "Your store's slug." },
          { name: "items", in: "body", type: "array", desc: "Cart items." },
          { name: "phone", in: "body", type: "string", desc: "Verified phone number." },
          { name: "shipping_address", in: "body", type: "object", desc: "{ line1, city, state, pincode, ... }" },
          { name: "payment_method", in: "body", type: "string", desc: "\"online\" or \"cod\"." },
        ],
        curl: `curl -X POST https://api.yourstore.com/api/checkout/order \\
  -H "Content-Type: application/json" \\
  -d '{"slug":"demo-store","items":[...],"phone":"+919876543210","payment_method":"cod","shipping_address":{"line1":"221B Baker St","city":"Mumbai","state":"MH","pincode":"400001"}}'`,
        js: `const res = await fetch("https://api.yourstore.com/api/checkout/order", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ slug: "demo-store", items: [...], phone: "+919876543210", payment_method: "cod", shipping_address: {...} }),
});
const order = await res.json();`,
        response: `{
  "order_id": "6705f9...",
  "tracking_token": "aZ3kLp9QsT2m",
  "total_amount": 3047,
  "payment_method": "cod",
  "status": "confirmed",
  "razorpay_order_id": null
}`,
      },
      {
        id: "verify-payment",
        method: "POST",
        path: "/api/checkout/verify-payment",
        summary: "Verify an online payment",
        description: "Called right after Razorpay's checkout popup succeeds, to confirm the payment signature. The webhook below is the real source of truth — this just gives the buyer an instant confirmation.",
        params: [
          { name: "razorpay_order_id", in: "body", type: "string", desc: "From the Razorpay checkout response." },
          { name: "razorpay_payment_id", in: "body", type: "string", desc: "From the Razorpay checkout response." },
          { name: "razorpay_signature", in: "body", type: "string", desc: "From the Razorpay checkout response." },
        ],
        curl: `curl -X POST https://api.yourstore.com/api/checkout/verify-payment \\
  -H "Content-Type: application/json" \\
  -d '{"razorpay_order_id":"order_xxx","razorpay_payment_id":"pay_xxx","razorpay_signature":"..."}'`,
        js: `const res = await fetch("https://api.yourstore.com/api/checkout/verify-payment", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ razorpay_order_id, razorpay_payment_id, razorpay_signature }),
});`,
        response: `{ "payment_status": "paid", "order_id": "6705f9..." }`,
      },
    ],
  },
  {
    id: "tracking",
    title: "Order tracking",
    description: "Let a buyer look up their order status with just the tracking code you gave them — no login needed.",
    endpoints: [
      {
        id: "track-order",
        method: "GET",
        path: "/api/track/:token",
        summary: "Get order status",
        description: "Returns the order's current status, the full status timeline, and any support tickets raised against it.",
        params: [{ name: "token", in: "path", type: "string", desc: "The tracking_token returned when the order was placed." }],
        curl: `curl https://api.yourstore.com/api/track/aZ3kLp9QsT2m`,
        js: `const res = await fetch("https://api.yourstore.com/api/track/aZ3kLp9QsT2m");
const order = await res.json();`,
        response: `{
  "tracking_token": "aZ3kLp9QsT2m",
  "status": "shipped",
  "status_history": [
    { "status": "confirmed", "at": "2026-09-20T10:02:00.000Z" },
    { "status": "shipped", "at": "2026-09-21T14:40:00.000Z" }
  ],
  "items": [{ "name": "Canvas Sneaker", "quantity": 2, "price": 1499 }],
  "total_amount": 3047,
  "tickets": []
}`,
      },
    ],
  },
];

export const webhookDoc = {
  title: "Razorpay payment webhook",
  description:
    "Only needed if you've switched to your own Razorpay account under Payment methods. Expressfly calls this URL whenever a payment is captured or fails — it's the source of truth for payment status, so set it up even though verify-payment also runs.",
  method: "POST",
  path: "(shown on your Payment methods page after you connect your own Razorpay account)",
  steps: [
    "Go to Payment methods and add your Razorpay Key ID and Key Secret.",
    "Copy the Webhook URL and Webhook secret shown — the secret is shown only once.",
    "In your Razorpay dashboard: Settings → Webhooks → Add New Webhook.",
    "Paste the URL, paste the secret, and enable the payment.captured and payment.failed events.",
  ],
  note: "Expressfly verifies every webhook's signature against your secret before trusting it, so keep the secret private.",
};
