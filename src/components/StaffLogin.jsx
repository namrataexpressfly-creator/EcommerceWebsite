import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import "../styles/StaffLoginPro.css";


export default function StaffLogin({
  login,
  redirectTo,
  rememberKey = "adm_remember_username",
  tag = "Admin console",
  intro = "",
  subtitle = "Use your credentials to continue.",
  footnote = "Access is limited to verified Expressfly staff.",
  theme = "",
  headline = "Manage the platform with clarity.",
  points = ["Staff-only, verified access", "Every sign-in is protected", "Built for fast, careful reviews"],
}) {
  const navigate = useNavigate();
  const root = useRef(null);
  const errorRef = useRef(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(rememberKey);
    if (saved) setUsername(saved);
  }, []);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(".stf-brand", { clipPath: "inset(0 100% 0 0)", duration: 0.9, ease: "power4.inOut" })
          .from(".stf-logo", { y: 16, opacity: 0, duration: 0.6 }, "-=0.4")
          .from(".stf-word > span", { yPercent: 115, duration: 0.8, stagger: 0.07 }, "-=0.4")
          .from(".stf-lead, .stf-points li, .stf-foot", { y: 16, opacity: 0, duration: 0.55, stagger: 0.08 }, "-=0.5")
          .from(".stf-chip", { scale: 0.7, opacity: 0, duration: 0.6, stagger: 0.15, ease: "back.out(1.6)" }, "-=0.5")
          .from(".stf-card", { y: 34, opacity: 0, duration: 0.8 }, 0.3)
          .from(".stf-anim", { y: 16, opacity: 0, duration: 0.5, stagger: 0.07 }, 0.55);
        gsap.to(".stf-blob-a", { x: -45, y: 35, duration: 7, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.to(".stf-blob-b", { x: 55, y: -35, duration: 8, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.utils.toArray(".stf-chip").forEach((el, i) => {
          gsap.to(el, { y: i % 2 ? 12 : -12, duration: 2.6 + i * 0.4, ease: "sine.inOut", yoyo: true, repeat: -1, delay: i * 0.3 });
        });
      }, root);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, []);

  useEffect(() => {
    if (error && errorRef.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.fromTo(errorRef.current, { x: -8 }, { x: 0, duration: 0.6, ease: "elastic.out(1, 0.25)" });
    }
  }, [error]);

  const magnet = (e) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || loading) return;
    const b = e.currentTarget.getBoundingClientRect();
    gsap.to(e.currentTarget, { x: (e.clientX - b.left - b.width / 2) * 0.12, y: (e.clientY - b.top - b.height / 2) * 0.25, duration: 0.3 });
  };
  const unmagnet = (e) => gsap.to(e.currentTarget, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" });

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter your username.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      if (remember) localStorage.setItem(rememberKey, username.trim());
      else localStorage.removeItem(rememberKey);
      navigate(redirectTo);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`stf-page${theme ? ` stf-theme-${theme}` : ""}`} ref={root}>
      <section className="stf-brand">
        <div className="stf-blob stf-blob-a" />
        <div className="stf-blob stf-blob-b" />
        <div className="stf-grid" />

        <div className="stf-logo">
          <img
            src="/logo-Expressfly.png"
            alt="ExpressFly Logistics"
          />
          <span className="stf-tag">{tag}</span>
        </div>

        <div className="stf-hero">
          <h2 className="stf-headline">
            {headline.split(" ").map((w, i) => (
              <span key={i}>
                <span className="stf-word"><span>{w}</span></span>{" "}
              </span>
            ))}
          </h2>
          {intro && <p className="stf-lead">{intro}</p>}
          <ul className="stf-points">
            {points.map((p) => (
              <li key={p}>
                <span className="stf-tick"><svg viewBox="0 0 12 12"><path d="M2.5 6.2l2.4 2.4 4.6-4.9" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="stf-chip stf-chip-1"><i />Secure session</div>
        <div className="stf-chip stf-chip-2"><i />Staff access only</div>

        <div className="stf-foot">© {new Date().getFullYear()} Expressfly. All rights reserved.</div>
      </section>

      <section className="stf-side">
        <form className="stf-card" onSubmit={submit} noValidate>
          <h1 className="stf-anim">Sign in</h1>
          <p className="stf-sub stf-anim">{subtitle}</p>

          <div className="stf-field stf-anim">
            <input id="stf-username" type="text" autoFocus autoComplete="username" placeholder=" " value={username} onChange={(e) => setUsername(e.target.value)} />
            <label htmlFor="stf-username">Username</label>
          </div>

          <div className="stf-field stf-anim">
            <input id="stf-password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder=" " value={password} onChange={(e) => setPassword(e.target.value)} />
            <label htmlFor="stf-password">Password</label>
            <button type="button" className="stf-eye" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? (
                <svg viewBox="0 0 20 20" fill="none"><path d="M3 3l14 14M8.6 8.7a2.2 2.2 0 0 0 3 3M6 6.2C4 7.5 2.7 9.3 2.3 10c1.3 2.4 4.1 5.3 7.7 5.3 1.3 0 2.5-.3 3.6-.9M10 4.7c3.6 0 6.4 2.9 7.7 5.3-.4.8-1.1 1.8-2 2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="none"><path d="M2.3 10S5.1 4.7 10 4.7 17.7 10 17.7 10 14.9 15.3 10 15.3 2.3 10 2.3 10z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><circle cx="10" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.5" /></svg>
              )}
            </button>
          </div>

          <div className="stf-row stf-anim">
            <label className="stf-remember">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span className="stf-box"><svg viewBox="0 0 12 12"><path d="M2.5 6.2l2.4 2.4 4.6-4.9" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
              Remember username
            </label>
          </div>

          {error && (
            <div className="stf-error" role="alert" ref={errorRef}>
              {error}
            </div>
          )}

          <button type="submit" className="stf-submit stf-anim" disabled={loading} onMouseMove={magnet} onMouseLeave={unmagnet}>
            {loading ? (
              <>
                <span className="stf-spin" /> Signing in…
              </>
            ) : (
              <>
                Sign in
                <svg viewBox="0 0 20 20" fill="none"><path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </>
            )}
          </button>

          <p className="stf-foot-note stf-anim">
            <svg viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.2" /><path d="M5.2 7V5a2.8 2.8 0 0 1 5.6 0v2" stroke="currentColor" strokeWidth="1.2" /></svg>
            {footnote}
          </p>
        </form>
      </section>
    </div>
  );
}
