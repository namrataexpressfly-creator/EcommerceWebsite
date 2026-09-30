# Expressfly Frontend

A React (Vite) frontend for the Expressfly backend — a public storefront (browse,
cart, single-page checkout, order tracking, returns) plus a seller dashboard
(products, categories, coupons, orders, analytics, returns, fraud/COD).

## 1. Start the backend first

From the `expressfly` backend folder:

```bash
npm install
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, Razorpay keys (Razorpay optional — COD works without it)
npm run seed            # creates a demo seller + store + products + coupon
npm run dev              # runs on http://localhost:4000
```

Seed creates:
- Seller login: `demo@expressfly.test` / `password123`
- Store slug: `demo-store`
- 2 products, 1 category, coupon `WELCOME10`

## 2. Run this frontend

```bash
cd frontend
npm install
cp .env.example .env   # defaults already point at http://localhost:4000/api and demo-store
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## What's included

**Storefront** (`/store/:slug`)
- Product grid with search, category filter, sort, pagination
- Product detail page, cart (persisted in the browser), single-page checkout
  (address, phone OTP, coupon code, COD or Razorpay online payment)
- Public order tracking by token, with a return-request form for delivered orders

**Seller dashboard** (`/seller`)
- Login / register (register creates a new store)
- Overview: revenue chart, top products, conversion rate
- Orders list with status updates
- Products & categories CRUD
- Coupons CRUD
- Returns: approve / reject / mark refunded
- Fraud log + COD phone blacklist

## Notes

- OTP codes are logged to the **backend terminal** (`console.log`), since the
  backend stubs real SMS delivery — check that terminal after clicking "Send OTP".
- Online payment requires `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` set in the
  backend `.env`. Without them, use Cash on Delivery in checkout.
- Not included: the drag-and-drop storefront section builder, SEO meta editor,
  and store policy editor — the backend exposes APIs for these but they weren't
  part of this build. Everything else in the backend's route reference is wired up.
