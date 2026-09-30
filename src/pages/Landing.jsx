import { Link } from "react-router-dom";
import { DEFAULT_SLUG } from "../api/client";
import "../styles/landing.css";

const STORE = `/store/${DEFAULT_SLUG}`;

const STEPS = [
  ["Create your account", "Sign up with your name, email, phone and store name."],
  ["Verify your details", "Upload your KYC documents once so we can confirm your business."],
  ["Add products", "Add photos, prices and stock. Add sizes or colours as variants."],
  ["Start selling", "Share your store link. Orders, payments and tracking are handled."],
];

const FACTS = [
  ["Online + COD", "Take online payments or Cash on Delivery"],
  ["Any warehouses", "Keep stock in more than one place"],
  ["Your domain", "Connect your own domain name"],
  ["Light & dark", "Language and theme switch for everyone"],
];

const Title = ({ a, b }) => (
  <h2 className="lp-title">
    <b>{a}</b> <i>{b}</i>
  </h2>
);

export default function Landing() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <Link to="/" className="lp-brand"><span className="lp-logo">E</span>expressfly</Link>
        <nav className="lp-links">
          <a href="#features">What we provide</a>
          <a href="#warehouses">Shipping</a>
          <a href="#how">How it works</a>
          <a href="#about">About us</a>
        </nav>
        <div className="lp-nav-right">
          <Link to="/seller/login" className="lp-login">Log in</Link>
          <Link to="/seller/register" className="lp-pill lp-pill-white">Start for free</Link>
        </div>
      </header>

      <section className="lp-hero">
        <h1><b>Be the next</b><br /><b>online seller</b> <i>creator</i></h1>
        <p>Dream big and build fast on Expressfly.<br />Your own store website, ready in minutes.</p>
        <div className="lp-cta">
          <Link to="/seller/register" className="lp-pill lp-pill-white lp-lg">Start for free</Link>
          <Link to={STORE} className="lp-pill lp-pill-line lp-lg"><span className="lp-play">▶</span> See a demo store</Link>
        </div>
      </section>

      <section id="features" className="lp-wrap">
        <Title a="Sell to every customer." b="Simple for you, easy for them." />
        <div className="lp-big">
          <div className="lp-editor">
            <span className="lp-draft">Draft</span>
            <div className="lp-panel">
              <b>Home page</b>
              <div className="lp-row">Header</div>
              <div className="lp-add">＋ Add section</div>
              <small>Template</small>
              <div className="lp-row">Homepage slider</div>
              <div className="lp-row sub">Title &amp; subtitle</div>
              <div className="lp-row sub">Buttons</div>
              <div className="lp-add">＋ Add block</div>
            </div>
            <div className="lp-shop">
              <div className="lp-shop-bar"><span>New arrivals</span><span>Best sellers</span><span>Offers</span><span className="lp-cart">🛒</span></div>
              <div className="lp-shop-hero"><strong>Your Store</strong><small>Slide title and subtitle go here</small><span>Shop the collection</span></div>
            </div>
          </div>
          <p className="lp-cap"><u>Get your own store</u> with your name, logo, colours, homepage slider and pages. Edit anything, any time.</p>
        </div>

        <div className="lp-3">
          <article className="lp-card">
            <div className="lp-mock">
              <b>Cotton Shirt</b><span className="lp-price">₹999</span>
              <small>Size</small>
              <div className="lp-chips"><i>S</i><i className="on">M</i><i>L</i><i>XL</i></div>
              <small>Colour</small>
              <div className="lp-dots"><u style={{ background: "#e8e8e8" }} /><u className="on" style={{ background: "#2563EB" }} /><u style={{ background: "#111" }} /></div>
              <div className="lp-btns"><span>Add to cart</span><span className="hot">Buy now</span></div>
            </div>
            <h3>Products with variants</h3>
            <p>Sizes, colours and prices, each with its own stock and images. Shoppers pick a variant and buy in one tap.</p>
          </article>

          <article className="lp-card">
            <div className="lp-mock light">
              <div className="lp-line"><span>Cotton Shirt · M</span><b>₹999</b></div>
              <div className="lp-coupon"><span>WELCOME10</span><em>Apply</em></div>
              <div className="lp-line"><span>Subtotal</span><span>₹999</span></div>
              <div className="lp-line"><span>Coupon</span><span>− ₹100</span></div>
              <div className="lp-line"><span>Shipping</span><span>FREE</span></div>
              <div className="lp-line tot"><span>Total</span><b>₹899</b></div>
              <div className="lp-btns"><span className="hot">Pay online</span><span>Cash on delivery</span></div>
            </div>
            <h3>Payments &amp; coupons</h3>
            <p>Online payments or Cash on Delivery, plus discount codes for the whole store, a category or chosen products.</p>
          </article>

          <article className="lp-card">
            <div className="lp-mock">
              <ol className="lp-track">
                <li className="done">Order placed</li>
                <li className="done">Packed</li>
                <li className="now">Shipped</li>
                <li>Delivered</li>
              </ol>
            </div>
            <h3>Orders, returns &amp; tracking</h3>
            <p>Manage orders, returns and support tickets. Customers follow their parcel with a simple tracking link.</p>
          </article>
        </div>
      </section>

      <section id="warehouses" className="lp-wrap">
        <Title a="Ship from the nearest warehouse." b="Never lose a sale to stock." />
        <div className="lp-big lp-ware">
          <div className="lp-map">
            <div className="lp-node me">📍 Customer</div>
            <div className="lp-node bad">Warehouse A<small>Nearest · out of stock</small></div>
            <div className="lp-node ok">Warehouse B<small>Next nearest · in stock ✓</small></div>
            <div className="lp-node">Warehouse C<small>Farther away</small></div>
          </div>
          <div>
            <h3>Two or more warehouses</h3>
            <p>Add every place you keep stock. The pickup address comes from the nearest warehouse, and if it has no stock, the order moves to the next nearest one that does.</p>
          </div>
        </div>
      </section>

      <section id="how" className="lp-wrap">
        <Title a="Your store in 4 easy steps." b="No coding, no designer." />
        <div className="lp-4">
          {STEPS.map(([t, d], i) => (
            <div className="lp-step" key={t}><span>{i + 1}</span><h3>{t}</h3><p>{d}</p></div>
          ))}
        </div>
      </section>

      <section className="lp-wrap">
        <Title a="Everything included." b="Nothing extra to set up." />
        <div className="lp-4">
          {FACTS.map(([t, d]) => (
            <div className="lp-fact" key={t}><strong>{t}</strong><p>{d}</p></div>
          ))}
        </div>
      </section>

      <section id="about" className="lp-wrap">
        <Title a="Who we are." b="Built for sellers and their customers." />
        <div className="lp-3">
          <article className="lp-card lp-text"><h3>For sellers</h3><p>Expressfly gives every seller a store website plus the tools behind it: products, stock, payments, orders and support. If you can list what you sell, you can run a store.</p></article>
          <article className="lp-card lp-text"><h3>For customers</h3><p>Fast, clear shopping: pick a variant, apply a coupon, pay your way and track the order. Wishlist, language and dark mode included.</p></article>
          <article className="lp-card lp-text"><h3>Safe and simple</h3><p>Sellers are verified with KYC before they sell. Every screen uses plain language, so nobody needs to be technical.</p></article>
        </div>
      </section>

      <section className="lp-final">
        <h2 className="lp-title"><b>There's no better place</b><br /><i>to start selling</i></h2>
        <Link to="/seller/register" className="lp-pill lp-pill-white lp-lg">Start for free</Link>
      </section>

      <footer className="lp-foot">
        <div className="lp-foot-cols">
          <span className="lp-logo big">E</span>
          <div><h4>Expressfly</h4><a href="#about">Who we are</a><a href="#features">What we provide</a><a href="#how">How it works</a></div>
          <div><h4>Sellers</h4><Link to="/seller/register">Create a store</Link><Link to="/seller/login">Seller log in</Link><Link to="/seller/forgot-password">Forgot password</Link></div>
          <div><h4>Shoppers</h4><Link to={STORE}>Demo store</Link><Link to={`${STORE}/track`}>Track an order</Link><Link to={`${STORE}/faqs`}>FAQs</Link></div>
          <div><h4>Support</h4><Link to={`${STORE}/help`}>Help</Link><Link to={`${STORE}/Contactus`}>Contact us</Link><Link to={`${STORE}/Privacy`}>Privacy policy</Link></div>
        </div>
        <div className="lp-foot-bar"><span>© {new Date().getFullYear()} Expressfly. All rights reserved.</span><Link to="/admin/login">Admin</Link></div>
      </footer>
    </div>
  );
}
