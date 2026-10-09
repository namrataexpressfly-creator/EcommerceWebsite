import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import "../styles/SellerLoginPro.css";

const TICK = (
  <svg viewBox="0 0 12 12"><path d="M2.5 6.2l2.4 2.4 4.6-4.9" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export default function SellerAuthShell({ eyebrow = "Seller portal", headline, lead, points = [], chips = [], animKey = "form", wide = false, children }) {
  const root = useRef(null);
  const card = useRef(null);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(".slp-brand", { clipPath: "inset(0 100% 0 0)", duration: 0.9, ease: "power4.inOut" })
          .from(".slp-logo, .slp-eyebrow", { y: 16, opacity: 0, duration: 0.55, stagger: 0.1 }, "-=0.4")
          .from(".slp-word > span", { yPercent: 115, duration: 0.8, stagger: 0.07 }, "-=0.4")
          .from(".slp-lead, .slp-points li, .slp-foot", { y: 16, opacity: 0, duration: 0.55, stagger: 0.08 }, "-=0.5")
          .from(".slp-chip", { scale: 0.7, opacity: 0, duration: 0.6, stagger: 0.15, ease: "back.out(1.6)" }, "-=0.5");
        gsap.to(".slp-blob-a", { x: -50, y: 40, duration: 7, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.to(".slp-blob-b", { x: 60, y: -40, duration: 8, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.utils.toArray(".slp-chip").forEach((el, i) => {
          gsap.to(el, { y: i % 2 ? 12 : -12, duration: 2.6 + i * 0.4, ease: "sine.inOut", yoyo: true, repeat: -1, delay: i * 0.3 });
        });
      }, root);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, []);


  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !card.current) return;
    const ctx = gsap.context(() => {
      gsap.from(card.current, { y: 30, opacity: 0, duration: 0.7, ease: "power3.out", delay: animKey === "form" ? 0.3 : 0 });
      gsap.from(".slp-anim", { y: 16, opacity: 0, duration: 0.5, stagger: 0.07, ease: "power3.out", delay: animKey === "form" ? 0.55 : 0.1 });
      gsap.from(".slp-success-icon", { scale: 0.4, opacity: 0, duration: 0.7, ease: "back.out(1.8)", delay: 0.15 });
    }, root);
    return () => ctx.revert();
  }, [animKey]);

  return (
    <div className="slp-page" ref={root}>
      <section className="slp-brand">
        <div className="slp-blob slp-blob-a" />
        <div className="slp-blob slp-blob-b" />
        <div className="slp-grid" />


        <div className="slp-logo">
          <img
            src="/logo-Expressfly.png"
            alt="ExpressFly Logistics"
          />
        </div>
        <div className="slp-hero">
          <span className="slp-eyebrow">{eyebrow}</span>
          <h2 className="slp-headline">
            {headline.split(" ").map((w, i) => (
              <span key={i}>
                <span className="slp-word"><span>{w}</span></span>{" "}
              </span>
            ))}
          </h2>
          {lead && <p className="slp-lead">{lead}</p>}
          <ul className="slp-points">
            {points.map((p) => (
              <li key={p}>
                <span className="slp-tick">{TICK}</span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        {chips.map((c, i) => (
          <div key={c} className={`slp-chip slp-chip-${i + 1}`}><i />{c}</div>
        ))}

        <div className="slp-foot">© {new Date().getFullYear()} Expressfly. All rights reserved.</div>
      </section>

      <section className="slp-side">
        <div className={`slp-card${wide ? " slp-card-wide" : ""}`} ref={card}>{children}</div>
      </section>
    </div>
  );
}
