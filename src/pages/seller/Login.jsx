import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useAuth } from "../../context/AuthContext";
import "../../styles/SellerLoginPro.css";

gsap.registerPlugin(SplitText);

const REMEMBER_KEY = "seller_remember_email";
const motionOk = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: no-preference)").matches;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const root = useRef(null);

  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem(REMEMBER_KEY) || ""; } catch { return ""; }
  });
  const [remember, setRemember] = useState(() => {
    try { return !!localStorage.getItem(REMEMBER_KEY); } catch { return false; }
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(() => {
    const notice = sessionStorage.getItem("seller_notice") || "";
    sessionStorage.removeItem("seller_notice");
    return notice;
  });
  const [loading, setLoading] = useState(false);


  useLayoutEffect(() => {
    const mm = gsap.matchMedia();

    mm.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        const padMasks = (self) =>
          self.masks.forEach((m) => {
            m.style.paddingBottom = ".14em";
            m.style.marginBottom = "-.14em";
          });

        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(".slx-visual", { clipPath: "inset(0% 100% 0% 0%)", duration: 1.2, ease: "power4.inOut", clearProps: "clipPath" })
          .from(".slx-brand, .slx-eyebrow", { y: -18, opacity: 0, duration: 0.7, stagger: 0.1 }, 0.5)
          .from(".slx-sub", { y: 22, opacity: 0, duration: 0.8 }, 1.05)
          .from(".slx-chip", { y: 18, opacity: 0, scale: 0.9, duration: 0.6, stagger: 0.09 }, 1.15)
          .from(".slx-float-card", { scale: 0.6, opacity: 0, y: 30, duration: 0.9, stagger: 0.14, ease: "back.out(1.7)" }, 1.0)
          .from(".slx-top > *", { y: -14, opacity: 0, duration: 0.6, stagger: 0.08 }, 0.6)
          .from(".slx-lead", { y: 18, opacity: 0, duration: 0.7 }, 1.0)
          .from(".slx-field", { y: 28, opacity: 0, duration: 0.7, stagger: 0.1 }, 1.05)
          .from(".slx-row", { y: 20, opacity: 0, duration: 0.6 }, 1.3)
          .from(".slx-submit", { y: 24, opacity: 0, scale: 0.96, duration: 0.7 }, 1.4)
          .from(".slx-register", { y: 16, opacity: 0, duration: 0.6 }, 1.55);

        SplitText.create(".slx-headline", {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit(self) {
            padMasks(self);
            return gsap.from(self.lines, { yPercent: 118, rotate: 3, transformOrigin: "0% 100%", duration: 1.2, stagger: 0.12, ease: "power4.out", delay: 0.7 });
          },
        });
        SplitText.create(".slx-title", {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit(self) {
            padMasks(self);
            return gsap.from(self.lines, { yPercent: 118, duration: 1, stagger: 0.1, ease: "power4.out", delay: 0.75 });
          },
        });

    
        gsap.to(".slx-orb-a", { x: 60, y: 40, duration: 9, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.to(".slx-orb-b", { x: -50, y: -45, duration: 11, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.to(".slx-orb-c", { x: 40, y: -30, duration: 13, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.utils.toArray(".slx-float-card").forEach((card, i) => {
          gsap.to(card, { y: i % 2 ? 10 : -10, duration: 2.8 + i * 0.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
        });
      },
      root
    );


    mm.add(
      "(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)",
      () => {
        const visual = root.current?.querySelector(".slx-visual");
        const layers = gsap.utils.toArray(".slx-float-in", root.current);
        const submit = root.current?.querySelector(".slx-submit");
        const cleanups = [];

        if (visual && layers.length) {
          const movers = layers.map((el) => ({
            depth: parseFloat(el.dataset.depth || "1"),
            x: gsap.quickTo(el, "x", { duration: 1, ease: "power3" }),
            y: gsap.quickTo(el, "y", { duration: 1, ease: "power3" }),
          }));
          const move = (e) => {
            const r = visual.getBoundingClientRect();
            const nx = (e.clientX - r.left) / r.width - 0.5;
            const ny = (e.clientY - r.top) / r.height - 0.5;
            movers.forEach((m) => (m.x(nx * m.depth * 60), m.y(ny * m.depth * 60)));
          };
          const leave = () => movers.forEach((m) => (m.x(0), m.y(0)));
          visual.addEventListener("mousemove", move);
          visual.addEventListener("mouseleave", leave);
          cleanups.push(() => {
            visual.removeEventListener("mousemove", move);
            visual.removeEventListener("mouseleave", leave);
          });
        }

        if (submit) {
          const xTo = gsap.quickTo(submit, "x", { duration: 0.6, ease: "elastic.out(1, 0.5)" });
          const yTo = gsap.quickTo(submit, "y", { duration: 0.6, ease: "elastic.out(1, 0.5)" });
          const move = (e) => {
            if (submit.disabled) return;
            const r = submit.getBoundingClientRect();
            xTo((e.clientX - (r.left + r.width / 2)) * 0.12);
            yTo((e.clientY - (r.top + r.height / 2)) * 0.28);
          };
          const leave = () => (xTo(0), yTo(0));
          submit.addEventListener("mousemove", move);
          submit.addEventListener("mouseleave", leave);
          cleanups.push(() => {
            submit.removeEventListener("mousemove", move);
            submit.removeEventListener("mouseleave", leave);
          });
        }
        return () => cleanups.forEach((fn) => fn());
      },
      root
    );

    return () => mm.revert();
  }, []);

  useEffect(() => {
    if (!error || !motionOk()) return;
    gsap.fromTo(".slx-error", { y: -10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "power3.out" });
    gsap.fromTo(".slx-field", { x: -7 }, { x: 0, duration: 0.7, ease: "elastic.out(1, 0.28)", stagger: 0.04 });
  }, [error]);


  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Enter the email you registered your store with.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }

    setLoading(true);
    try {
      const seller = await login(email.trim(), password);
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, email.trim());
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {}
      if (motionOk()) await gsap.to(".slx-shell", { opacity: 0, y: -16, duration: 0.45, ease: "power2.in" });
      navigate(seller?.kyc?.status === "approved" ? "/seller" : "/seller/kyc");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="slx-page" ref={root}>
      <div className="slx-shell">
     
        <aside className="slx-visual" aria-hidden="false">
          <span className="slx-orb slx-orb-a" />
          <span className="slx-orb slx-orb-b" />
          <span className="slx-orb slx-orb-c" />

          <div className="slx-visual-in">
            <div className="slx-brand">
              <img className="slx-brand-img" src="/logo-Expressfly.png" alt="ExpressFly Logistics" />
            </div>

            <div className="slx-story">
              <span className="slx-eyebrow">Seller console</span>
              <h2 className="slx-headline">Welcome back to your store.</h2>
              <p className="slx-sub">Orders, payments, shipping and support, all in one calm place.</p>
              <ul className="slx-chips">
                <li className="slx-chip">Orders &amp; payments</li>
                <li className="slx-chip">Shipping &amp; tracking</li>
                <li className="slx-chip">Your own domain</li>
              </ul>
            </div>

            <div className="slx-floats" aria-hidden="true">
              <div className="slx-float slx-float-1"><div className="slx-float-in" data-depth="1.2"><div className="slx-float-card"><span className="slx-ic slx-ic-a" /><div><strong>New order</strong><small>₹899 · Cash on delivery</small></div></div></div></div>
              <div className="slx-float slx-float-2"><div className="slx-float-in" data-depth="0.7"><div className="slx-float-card"><span className="slx-ic slx-ic-b">✓</span><div><strong>Payment received</strong><small>Cotton Shirt · M</small></div></div></div></div>
              <div className="slx-float slx-float-3"><div className="slx-float-in" data-depth="1.6"><div className="slx-float-card"><span className="slx-ic slx-ic-c">➜</span><div><strong>Shipped</strong><small>Tracking link sent</small></div></div></div></div>
            </div>
          </div>
        </aside>

  
        <main className="slx-panel">
          <div className="slx-top">
            <div className="slx-brand slx-brand-mobile">
              <img className="slx-brand-img" src="/logo-Expressfly.png" alt="ExpressFly Logistics" />
            </div>
            <Link to="/" className="slx-back">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M12 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Back to home
            </Link>
          </div>

          <form className="slx-form" onSubmit={submit} noValidate>
            <h1 className="slx-title">Sign in to your store</h1>
            <p className="slx-lead">Enter your details to manage orders, products and payouts.</p>

            <div className="slx-field">
              <input
                id="slx-email"
                type="email"
                autoFocus
                autoComplete="email"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="slx-email">Email address</label>
              <svg className="slx-ico" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.7" />
                <path d="M4 8l8 5.5L20 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <i className="slx-bar" />
            </div>

            <div className="slx-field">
              <input
                id="slx-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label htmlFor="slx-password">Password</label>
              <svg className="slx-ico" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="4.5" y="10.5" width="15" height="10" rx="3" stroke="currentColor" strokeWidth="1.7" />
                <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <button type="button" className="slx-eye" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? (
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M2.3 10S5.1 4.7 10 4.7 17.7 10 17.7 10 14.9 15.3 10 15.3 2.3 10 2.3 10z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    <circle cx="10" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M3 3l14 14M8.6 8.7a2.2 2.2 0 0 0 3 3M6 6.2C4 7.5 2.7 9.3 2.3 10c1.3 2.4 4.1 5.3 7.7 5.3 1.3 0 2.5-.3 3.6-.9M10 4.7c3.6 0 6.4 2.9 7.7 5.3-.4.8-1.1 1.8-2 2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <i className="slx-bar" />
            </div>

            <div className="slx-row">
              <label className="slx-remember">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span className="slx-check" aria-hidden="true">
                  <svg viewBox="0 0 12 12"><path d="M2.5 6.2l2.4 2.4 4.6-4.9" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                Remember me
              </label>
              <Link to="/seller/forgot-password">Forgot password?</Link>
            </div>

            {error && (
              <div className="slx-error" role="alert">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6" /><path d="M10 6v4.5M10 13.4v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="slx-submit" disabled={loading}>
              <span className="slx-submit-text">{loading ? "Signing in…" : "Sign in"}</span>
              {loading ? (
                <span className="slx-spin" aria-hidden="true" />
              ) : (
                <svg className="slx-arrow" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10h11M11 5.5L15.5 10 11 14.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </button>

            <p className="slx-register">
              New to Expressfly? <Link to="/seller/register">Register your store</Link>
            </p>
          </form>
        </main>
      </div>
    </div>
  );
}
