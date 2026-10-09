import { useEffect } from "react";
import gsap from "gsap";

/*
 * Motion layer for the customer storefront (components/StoreLayout.jsx).
 * It only adds animation on top of the existing markup and uses no colours, so every seller's
 * theme, fonts and layout preset keep working.
 *
 *  - Scroll reveals: product cards, category tiles, feature/review cards, headings, footer, product page
 *    (picks up content that loads later or after filtering, via a MutationObserver)
 *  - Page transition on route change
 *  - Header: compact shadow after scrolling + a thin page-progress bar
 *  - Cart badge "bump" whenever the count changes
 *  - "Fly to cart": the product image flies into the bag icon on Add to cart
 *  - Product gallery: pointer-follow zoom (mouse devices)
 *  - Back-to-top button
 *
 * Respects "reduce motion": nothing is hidden or animated for those visitors.
 */

// from: hidden "before" state. stagger: seconds between siblings that enter together.
const RULES = [
  { sel: ".sf-hero-copy > *", from: { y: 34, opacity: 0 }, stagger: 0.12 },
  { sel: ".sf-hero-tile", from: { y: 70, opacity: 0, scale: 0.96 }, stagger: 0.12 },
  { sel: ".sf-head, .sf-cta", from: { y: 28, opacity: 0 }, stagger: 0 },
  { sel: ".sf-step", from: { y: 40, opacity: 0 }, stagger: 0.12 },
  { sel: ".product-card", from: { y: 36, opacity: 0 }, stagger: 0.07 },
  { sel: ".category-tile", from: { y: 44, opacity: 0, scale: 0.95 }, stagger: 0.08 },
  { sel: ".feature-card", from: { y: 30, opacity: 0 }, stagger: 0.1 },
  { sel: ".review-card", from: { y: 30, opacity: 0 }, stagger: 0.08 },
  { sel: ".store-section-title, .products-head, .category-shop-header, .page-header, .breadcrumb", from: { y: 26, opacity: 0 }, stagger: 0.1 },
  { sel: ".footer-col", from: { y: 34, opacity: 0 }, stagger: 0.1 },
  { sel: ".store-footer-bottom", from: { opacity: 0 }, stagger: 0 },
  { sel: ".product-detail-image", from: { x: -40, opacity: 0 }, stagger: 0 },
  { sel: ".product-detail-info > *", from: { y: 24, opacity: 0 }, stagger: 0.07 },
  { sel: ".pdp-tabs-section, .product-reviews-section", from: { y: 34, opacity: 0 }, stagger: 0 },
  { sel: ".cart-row", from: { x: -24, opacity: 0 }, stagger: 0.08 },
  { sel: ".cart-summary", from: { x: 30, opacity: 0 }, stagger: 0 },
  { sel: ".review-breakdown-fill", from: { scaleX: 0, transformOrigin: "0% 50%" }, stagger: 0.06, noFade: true },
];

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

export default function useStoreMotion(shellRef, routeKey, disabled) {
  /* ---------- Everything except the route transition ---------- */
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || disabled) return undefined;
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return undefined;

    const cleanups = [];
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    /* ----- Scroll reveals ----- */
    const seen = new WeakSet();
    const io = new IntersectionObserver(
      (entries) => {
        const byRule = new Map();
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          const i = entry.target.__rv;
          if (!byRule.has(i)) byRule.set(i, []);
          byRule.get(i).push(entry.target);
        });
        byRule.forEach((els, i) => {
          const rule = RULES[i];
          // reading order: top to bottom, then left to right, so a row of cards fans out evenly
          els.sort((a, b) => {
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            return Math.abs(ra.top - rb.top) > 8 ? ra.top - rb.top : ra.left - rb.left;
          });
          const done = () => els.forEach((el) => el.classList.remove("sf-rv")); // hover transitions come back after the reveal
          const to = { duration: 1.15, ease: "expo.out", stagger: rule.stagger, overwrite: "auto", clearProps: "opacity,transform", onComplete: done, onInterrupt: done };
          if (rule.noFade) Object.assign(to, { scaleX: 1, duration: 1.1 });
          else Object.assign(to, { opacity: 1, x: 0, y: 0, scale: 1 });
          gsap.to(els, to);
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
    );

    const register = (node) => {
      if (node.nodeType !== 1) return;
      RULES.forEach((rule, i) => {
        const found = [];
        if (node.matches(rule.sel)) found.push(node);
        node.querySelectorAll(rule.sel).forEach((n) => found.push(n));
        found.forEach((el) => {
          if (seen.has(el) || el.closest(".qa-overlay, .modal-overlay")) return;
          seen.add(el);
          el.__rv = i;
          el.classList.add("sf-rv"); // CSS transitions off while GSAP drives the element
          gsap.set(el, rule.from);
          io.observe(el);
        });
      });
    };

    /* ----- Cart badge bump ----- */
    const bump = (el) => gsap.fromTo(el, { scale: 1.8 }, { scale: 1, duration: 0.7, ease: "elastic.out(1, 0.4)", overwrite: "auto" });

    const mo = new MutationObserver((mutations) => {
      const badges = new Set();
      mutations.forEach((m) => {
        m.addedNodes.forEach((n) => {
          register(n);
          if (n.nodeType === 1 && n.matches?.(".nav-icon-badge")) badges.add(n);
          n.querySelectorAll?.(".nav-icon-badge").forEach((b) => badges.add(b));
        });
        const badge = (m.target.nodeType === 1 ? m.target : m.target.parentElement)?.closest?.(".nav-icon-badge");
        if (badge && (m.type === "characterData" || m.type === "childList")) badges.add(badge);
      });
      badges.forEach(bump);
    });
    register(shell);
    mo.observe(shell, { childList: true, subtree: true, characterData: true });
    cleanups.push(() => {
      io.disconnect();
      mo.disconnect();
    });

    /* ----- Header: shadow, progress bar; back-to-top ----- */
    const nav = shell.querySelector(".store-nav");
    const bar = document.createElement("div");
    bar.className = "sf-progress";
    nav?.appendChild(bar);

    const top = document.createElement("button");
    top.type = "button";
    top.className = "sf-top";
    top.setAttribute("aria-label", "Back to top");
    top.innerHTML = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 16V4M5 8.5L10 3.5l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    top.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    shell.appendChild(top);
    gsap.set(top, { autoAlpha: 0, y: 20 });

    let topShown = false;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        nav?.classList.toggle("is-scrolled", y > 12);
        gsap.set(bar, { scaleX: max > 0 ? clamp(y / max, 0, 1) : 0 });
        const show = y > 700;
        if (show !== topShown) {
          topShown = show;
          gsap.to(top, { autoAlpha: show ? 1 : 0, y: show ? 0 : 20, duration: 0.4, ease: "power3.out", overwrite: "auto" });
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    cleanups.push(() => {
      window.removeEventListener("scroll", onScroll);
      nav?.classList.remove("is-scrolled");
      bar.remove();
      top.remove();
    });

    /* ----- Fly to cart ----- */
    const onClick = (e) => {
      const btn = e.target.closest("button");
      if (!btn || btn.disabled || !/^\s*add to cart\s*$/i.test(btn.textContent || "")) return;
      const img = btn.closest(".product-card")?.querySelector(".product-thumb img") || document.querySelector(".product-gallery-main img");
      const bag = shell.querySelector('.nav-icon-group a[href$="/cart"], .nav-icon-group a[href*="cart"]');
      if (!img || !bag) return;
      const from = img.getBoundingClientRect();
      const to = bag.getBoundingClientRect();
      if (!from.width || !to.width) return;

      const fly = img.cloneNode(false);
      fly.removeAttribute("srcset");
      fly.className = "sf-fly";
      const size = clamp(from.width * 0.5, 70, 150);
      Object.assign(fly.style, { left: `${from.left + from.width / 2 - size / 2}px`, top: `${from.top + from.height / 2 - size / 2}px`, width: `${size}px`, height: `${size}px` });
      document.body.appendChild(fly);

      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      gsap
        .timeline({ onComplete: () => fly.remove() })
        .fromTo(fly, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.18, ease: "power2.out" })
        .to(fly, { x: dx, duration: 0.8, ease: "power2.in" }, 0.1)
        .to(fly, { y: dy, duration: 0.8, ease: "back.in(1.1)" }, 0.1)
        .to(fly, { scale: 0.12, opacity: 0.2, duration: 0.8, ease: "power2.in" }, 0.1);
      gsap.fromTo(bag, { scale: 1 }, { scale: 1.18, duration: 0.18, yoyo: true, repeat: 1, delay: 0.85, ease: "power2.out" });
    };
    shell.addEventListener("click", onClick);
    cleanups.push(() => shell.removeEventListener("click", onClick));

    /* ----- Product gallery: pointer-follow zoom (mouse only) ----- */
    if (finePointer) {
      const onMove = (e) => {
        const box = e.target.closest?.(".product-gallery-main");
        if (!box) return;
        const img = box.querySelector("img");
        if (!img) return;
        const r = box.getBoundingClientRect();
        img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
      };
      shell.addEventListener("mousemove", onMove);
      cleanups.push(() => shell.removeEventListener("mousemove", onMove));
    }

    return () => cleanups.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  /* ---------- Page transition when the route changes ---------- */
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || disabled) return undefined;
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return undefined;
    const main = shell.querySelector(".store-main");
    if (!main) return undefined;
    // the first render is handled by the reveals, so only animate real navigations
    // (comparing routes also keeps React StrictMode's double effect run from animating the first load)
    const previous = shell.__route;
    shell.__route = routeKey;
    if (previous === undefined || previous === routeKey) return undefined;
    const tween = gsap.fromTo(main, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", clearProps: "opacity,transform" });
    return () => tween.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, disabled]);
}
