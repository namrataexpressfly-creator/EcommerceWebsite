import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText);


export default function useLandingAnimations(rootRef, navigate) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const $ = (sel) => root.querySelector(sel);
    const $$ = (sel) => gsap.utils.toArray(sel, root);
    const mm = gsap.matchMedia();


    const padMasks = (self) =>
      self.masks.forEach((m) => {
        m.style.paddingBottom = ".14em";
        m.style.marginBottom = "-.14em";
      });


    mm.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        const cleanups = [];

        
        const smoother = ScrollSmoother.create({
          wrapper: "#lp-smooth-wrapper",
          content: "#lp-smooth-content",
          smooth: 1.25,
          effects: true,
        });
        smoother.paused(true); 
        cleanups.push(() => smoother.kill());

        gsap.set(".lp-card", { clipPath: "inset(100% 0% 0% 0% round 28px)", y: 60 });
        gsap.set(".lp-fact, .lp-foot-cols > *, .lp-foot-bar", { opacity: 0, y: 50 });
        gsap.set(".lp-progress", { scaleX: 0, transformOrigin: "0 50%" });


        let released = false;
        let heroAnim = null;

        const intro = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
        intro
          .from(".lp-nav", { yPercent: -100, opacity: 0, duration: 0.9, clearProps: "all" })
          .from(".lp-brand, .lp-links a, .lp-nav-right > *", { y: -16, opacity: 0, duration: 0.6, stagger: 0.07 }, 0.2)
          .from(".lp-hero p", { y: 30, opacity: 0, duration: 1 }, 0.7)
          .from(".lp-cta .lp-pill", { y: 30, opacity: 0, scale: 0.9, duration: 0.8, stagger: 0.12, clearProps: "all" }, 0.9)
          .from(".lp-float-card", { scale: 0.5, opacity: 0, duration: 1, stagger: 0.15, ease: "back.out(1.7)" }, 1.0)
          .from(".lp-scroll", { opacity: 0, y: 14, duration: 0.8 }, 1.4);

        const release = () => {
          if (released) return;
          released = true;
          heroAnim?.play();
          intro.play();
          smoother.paused(false);
        };


        SplitText.create(".lp-hero h1", {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit(self) {
            padMasks(self);
            heroAnim = gsap.from(self.lines, {
              yPercent: 118,
              rotate: 4,
              transformOrigin: "0% 100%",
              duration: 1.25,
              stagger: 0.13,
              ease: "power4.out",
              paused: !released,
            });
            return heroAnim;
          },
        });


        const loader = $(".lp-loader");
        let seen = false;
        try {
          seen = sessionStorage.getItem("lp_loaded") === "1";
        } catch {
          
        }

        if (loader && !seen) {
          const countEl = $(".lp-loader-count");
          const counter = { v: 0 };
          gsap.set(loader, { display: "flex" });
          gsap
            .timeline({
              onComplete: () => {
                gsap.set(loader, { display: "none" });
                try {
                  sessionStorage.setItem("lp_loaded", "1");
                } catch {
                
                }
              },
            })
            .from(".lp-loader-brand i", { yPercent: 115, duration: 0.9, ease: "power4.out" })
            .from(".lp-loader-tag", { opacity: 0, y: 10, duration: 0.6 }, 0.3)
            .to(counter, { v: 100, duration: 1.7, ease: "power2.inOut", onUpdate: () => (countEl.textContent = String(Math.round(counter.v)).padStart(3, "0")) }, 0.2)
            .to(".lp-loader-bar i", { scaleX: 1, duration: 1.7, ease: "power2.inOut" }, 0.2)
            .to(".lp-loader-in", { yPercent: -30, opacity: 0, duration: 0.55, ease: "power3.in" }, ">0.15")
            .to(loader, { yPercent: -100, duration: 1.05, ease: "power4.inOut" }, "<0.1")
            .add(release, "<0.5");
        } else {
          release();
        }

      
        gsap.to(".lp-orb-a", { x: 70, y: 40, duration: 9, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.to(".lp-orb-b", { x: -60, y: -50, duration: 11, ease: "sine.inOut", yoyo: true, repeat: -1 });
        $$(".lp-float-card").forEach((card, i) => {
          gsap.to(card, { y: i % 2 ? 12 : -12, duration: 2.6 + i * 0.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
        });
        gsap
          .timeline({ repeat: -1 })
          .fromTo(".lp-scroll i", { scaleY: 0, transformOrigin: "50% 0%" }, { scaleY: 1, duration: 0.9, ease: "power2.inOut" })
          .set(".lp-scroll i", { transformOrigin: "50% 100%" })
          .to(".lp-scroll i", { scaleY: 0, duration: 0.9, ease: "power2.inOut" });
        gsap.to(".lp-hero-in", {
          y: -80,
          opacity: 0.2,
          ease: "none",
          scrollTrigger: { trigger: ".lp-hero", start: "top top", end: "bottom 20%", scrub: true },
        });

        gsap.to(".lp-progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });

       
        const nav = $(".lp-nav");
        let navHidden = false;
        ScrollTrigger.create({
          start: 0,
          end: "max",
          onUpdate: (self) => {
            const y = self.scroll();
            nav?.classList.toggle("is-scrolled", y > 40);
            const hide = self.direction === 1 && y > 320;
            if (hide !== navHidden) {
              navHidden = hide;
              gsap.to(nav, { yPercent: hide ? -110 : 0, duration: 0.55, ease: "power3.out", overwrite: "auto" });
            }
          },
        });
        cleanups.push(() => nav?.classList.remove("is-scrolled"));


        $$(".lp-links a").forEach((link) => {
          const target = $(link.getAttribute("href"));
          if (!target) return;
          ScrollTrigger.create({
            trigger: target,
            start: "top 45%",
            end: "bottom 45%",
            onToggle: (self) => link.classList.toggle("is-active", self.isActive),
          });
        });
        cleanups.push(() => $$(".lp-links a").forEach((a) => a.classList.remove("is-active")));

        
        let leaving = false;
        const curtain = $(".lp-curtain");
        const leaveTo = (href) => {
          if (leaving) return;
          leaving = true;
          smoother.paused(true);
          gsap
            .timeline({ onComplete: () => navigate?.(href) })
            .set(curtain, { display: "flex" })
            .fromTo(curtain, { yPercent: 100 }, { yPercent: 0, duration: 0.75, ease: "power4.inOut" })
            .from(".lp-curtain span", { yPercent: 120, duration: 0.6, ease: "power4.out" }, "-=0.3")
            .to({}, { duration: 0.2 });
        };
        const onClick = (e) => {
          const a = e.target.closest("a");
          if (!a) return;
          const href = a.getAttribute("href") || "";
          if (href.length > 1 && href.startsWith("#")) {
            const target = $(href);
            if (target) {
              e.preventDefault();
              smoother.scrollTo(target, true, "top 72px");
            }
            return;
          }
          const internal = href.startsWith("/") && !href.startsWith("//") && !a.target;
          if (internal && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0 && navigate) {
            e.preventDefault();
            leaveTo(href);
          }
        };
        root.addEventListener("click", onClick);
        cleanups.push(() => root.removeEventListener("click", onClick));


        const track = $(".lp-marquee-track");
        if (track) {
          const loop = gsap.to(track, { xPercent: -50, ease: "none", duration: 30, repeat: -1 });
          ScrollTrigger.create({
            start: 0,
            end: "max",
            onUpdate: (self) => {
              const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 220, 8);
              gsap.to(loop, { timeScale: boost * self.direction, duration: 0.25, overwrite: true });
              gsap.to(loop, { timeScale: self.direction, duration: 1.4, delay: 0.3, overwrite: false });
            },
          });
        }

        const statement = $(".lp-statement-text");
        if (statement) {
          SplitText.create(statement, {
            type: "words",
            autoSplit: true,
            onSplit(self) {
              return gsap.fromTo(
                self.words,
                { opacity: 0.14 },
                {
                  opacity: 1,
                  ease: "none",
                  stagger: 0.12,
                  scrollTrigger: { trigger: statement, start: "top 78%", end: "bottom 55%", scrub: true },
                }
              );
            },
          });
          gsap.from(".lp-statement small", { opacity: 0, y: 20, duration: 0.8, scrollTrigger: { trigger: ".lp-statement", start: "top 80%", once: true } });
        }

        $$(".lp-title").forEach((title) => {
          SplitText.create(title, {
            type: "lines",
            mask: "lines",
            autoSplit: true,
            onSplit(self) {
              padMasks(self);
              return gsap.from(self.lines, {
                yPercent: 118,
                rotate: 3,
                transformOrigin: "0% 100%",
                duration: 1.1,
                stagger: 0.1,
                ease: "power4.out",
                scrollTrigger: { trigger: title, start: "top 88%", once: true },
              });
            },
          });
        });

        $$(".lp-big").forEach((big) => {
          gsap.from(big, {
            clipPath: "inset(100% 0% 0% 0% round 28px)",
            y: 80,
            duration: 1.3,
            ease: "power4.out",
            clearProps: "clipPath,transform",
            scrollTrigger: { trigger: big, start: "top 88%", once: true },
          });
        });

        gsap
          .timeline({ defaults: { ease: "power3.out" }, scrollTrigger: { trigger: ".lp-editor", start: "top 80%", once: true } })
          .from(".lp-shop", { x: 90, opacity: 0, duration: 1 })
          .from(".lp-panel", { x: -70, opacity: 0, duration: 1 }, "<0.15")
          .from(".lp-draft", { scale: 0, opacity: 0, duration: 0.5, ease: "back.out(2.4)" }, "-=0.45")
          .from(".lp-panel > *", { x: -14, opacity: 0, duration: 0.4, stagger: 0.06 }, "-=0.5")
          .from(".lp-shop-bar span", { y: -10, opacity: 0, duration: 0.4, stagger: 0.07 }, "-=0.6")
          .from(".lp-shop-hero > *", { y: 22, opacity: 0, duration: 0.6, stagger: 0.1 }, "-=0.4");

      
        ScrollTrigger.batch(".lp-card", {
          start: "top 90%",
          onEnter: (els) =>
            gsap.to(els, { clipPath: "inset(0% 0% 0% 0% round 28px)", y: 0, duration: 1.15, stagger: 0.15, ease: "power4.out", clearProps: "clipPath,transform" }),
        });
        ScrollTrigger.batch(".lp-fact", {
          start: "top 90%",
          onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, stagger: 0.1, ease: "power3.out", clearProps: "opacity,transform" }),
        });


        $$(".lp-mock").forEach((mock) => {
          if (mock.querySelector(".lp-track") || mock.querySelector(".lp-coupon")) return;
          gsap.from(mock.children, {
            y: 16,
            opacity: 0,
            duration: 0.55,
            stagger: 0.07,
            ease: "power2.out",
            delay: 0.35,
            scrollTrigger: { trigger: mock, start: "top 85%", once: true },
          });
        });
        gsap.from(".lp-chips i, .lp-dots u", {
          scale: 0.4,
          opacity: 0,
          duration: 0.45,
          stagger: 0.05,
          ease: "back.out(2.5)",
          delay: 0.7,
          scrollTrigger: { trigger: ".lp-chips", start: "top 85%", once: true },
        });

        // Checkout: coupon applied, total counts 999 -> 899
        const totalEl = $(".lp-line.tot b");
        if (totalEl) {
          const original = totalEl.textContent;
          const counter = { v: 999 };
          totalEl.textContent = "₹999";
          cleanups.push(() => {
            totalEl.textContent = original;
          });
          gsap
            .timeline({ defaults: { ease: "power2.out" }, delay: 0.35, scrollTrigger: { trigger: ".lp-coupon", start: "top 85%", once: true } })
            .from(".lp-mock.light > .lp-line:first-child, .lp-coupon", { y: 14, opacity: 0, duration: 0.5, stagger: 0.1 })
            .to(".lp-coupon em", { backgroundColor: "#4F6BF6", color: "#fff", scale: 1.08, duration: 0.25, yoyo: true, repeat: 1 }, "+=0.3")
            .from(".lp-mock.light > .lp-line:nth-child(n+3)", { y: 12, opacity: 0, duration: 0.45, stagger: 0.12 }, "<0.1")
            .to(counter, { v: 899, duration: 0.9, ease: "power3.out", onUpdate: () => (totalEl.textContent = `₹${Math.round(counter.v)}`) }, "<0.3")
            .from(".lp-mock.light .lp-btns span", { y: 12, opacity: 0, duration: 0.45, stagger: 0.1 }, "-=0.4");
        }

        // Tracking steps complete one after another
        gsap
          .timeline({ defaults: { ease: "power2.out" }, delay: 0.35, scrollTrigger: { trigger: ".lp-track", start: "top 85%", once: true } })
          .from(".lp-track li", { x: -20, opacity: 0, duration: 0.5, stagger: 0.28 });

        // Warehouse fail-over story
        gsap
          .timeline({ defaults: { ease: "power3.out" }, scrollTrigger: { trigger: ".lp-map", start: "top 80%", once: true } })
          .from(".lp-ware > div:last-child", { x: 50, opacity: 0, duration: 0.9 })
          .from(".lp-node.me", { y: 24, scale: 0.85, opacity: 0, duration: 0.7, ease: "back.out(1.8)" }, 0)
          .from(".lp-node.bad", { y: 28, opacity: 0, duration: 0.6 }, "+=0.15")
          .fromTo(".lp-node.bad", { x: -7 }, { x: 0, duration: 0.7, ease: "elastic.out(1, 0.25)" }, "-=0.1")
          .from(".lp-node.ok", { y: 28, opacity: 0, duration: 0.6 }, "+=0.1")
          .fromTo(".lp-node.ok", { scale: 1 }, { scale: 1.05, duration: 0.3, yoyo: true, repeat: 1, ease: "power2.inOut" }, "-=0.1")
          .from(".lp-node:not(.me):not(.bad):not(.ok)", { y: 28, opacity: 0, duration: 0.6 }, "-=0.5");

        // ---------- Final CTA: grows into place while its corners straighten ----------
        gsap.fromTo(
          ".lp-final",
          { scale: 0.88, borderTopLeftRadius: 90, borderTopRightRadius: 90, transformOrigin: "50% 100%" },
          {
            scale: 1,
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            ease: "none",
            scrollTrigger: { trigger: ".lp-final", start: "top bottom", end: "top 35%", scrub: true },
          }
        );
        gsap.from(".lp-final .lp-pill", {
          y: 30,
          opacity: 0,
          scale: 0.85,
          duration: 0.8,
          ease: "back.out(1.8)",
          clearProps: "all",
          scrollTrigger: { trigger: ".lp-final", start: "top 55%", once: true },
        });

        // ---------- Footer ----------
        ScrollTrigger.batch(".lp-foot-cols > *, .lp-foot-bar", {
          start: "top 98%",
          onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: "power3.out", clearProps: "opacity,transform" }),
        });

        // Layout may shift once fonts load
        const refresh = () => ScrollTrigger.refresh();
        document.fonts?.ready.then(refresh);
        window.addEventListener("load", refresh);
        cleanups.push(() => window.removeEventListener("load", refresh));

        return () => cleanups.forEach((fn) => fn());
      },
      root
    );

    /* ======================================================================
     * 2. DESKTOP: "How it works" pinned and scrolled sideways
     * ==================================================================== */
    mm.add(
      "(prefers-reduced-motion: no-preference) and (min-width: 901px)",
      () => {
        const section = $("#how");
        const viewport = $(".lp-h-viewport");
        const trackEl = $(".lp-h-viewport .lp-4");
        if (!section || !viewport || !trackEl) return undefined;

        section.classList.add("lp-h-on");
        const distance = () => Math.max(0, trackEl.scrollWidth - viewport.clientWidth);

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => "+=" + (distance() + window.innerHeight * 0.4),
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            refreshPriority: 1, // pins must refresh first so everything below measures correctly
          },
        });
        tl.to(trackEl, { x: () => -distance() }, 0).to(".lp-h-progress i", { scaleX: 1 }, 0);
        gsap.from(".lp-step", { opacity: 0, y: 40, duration: 0.9, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: section, start: "top 70%", once: true } });

        return () => section.classList.remove("lp-h-on");
      },
      root
    );

    /* ======================================================================
     * 3. MOBILE / TABLET: steps simply stagger in
     * ==================================================================== */
    mm.add(
      "(prefers-reduced-motion: no-preference) and (max-width: 900px)",
      () => {
        gsap.set(".lp-step", { opacity: 0, y: 50 });
        ScrollTrigger.batch(".lp-step", {
          start: "top 90%",
          onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: "power3.out", clearProps: "opacity,transform" }),
        });
      },
      root
    );

    /* ======================================================================
     * 4. MOUSE DEVICES: cursor, magnetic buttons, mouse-depth cards
     * ==================================================================== */
    mm.add(
      "(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)",
      () => {
        const cleanups = [];
        const cursor = $(".lp-cursor");
        const dot = $(".lp-cursor-dot");
        const ring = $(".lp-cursor-ring");

        // ----- Custom cursor: dot + trailing ring that grows over links and cards -----
        if (cursor && dot && ring) {
          root.classList.add("lp-has-cursor");
          gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });
          const dx = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3" });
          const dy = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3" });
          const rx = gsap.quickTo(ring, "x", { duration: 0.5, ease: "power3" });
          const ry = gsap.quickTo(ring, "y", { duration: 0.5, ease: "power3" });
          const move = (e) => {
            cursor.classList.add("is-on");
            dx(e.clientX);
            dy(e.clientY);
            rx(e.clientX);
            ry(e.clientY);
          };
          const over = (e) => {
            const link = !!e.target.closest("a, button");
            cursor.classList.toggle("is-link", link);
            cursor.classList.toggle("is-card", !link && !!e.target.closest(".lp-card, .lp-big, .lp-step, .lp-fact"));
          };
          const out = () => cursor.classList.remove("is-on");
          window.addEventListener("mousemove", move);
          root.addEventListener("mouseover", over);
          document.documentElement.addEventListener("mouseleave", out);
          cleanups.push(() => {
            window.removeEventListener("mousemove", move);
            root.removeEventListener("mouseover", over);
            document.documentElement.removeEventListener("mouseleave", out);
            root.classList.remove("lp-has-cursor");
            cursor.classList.remove("is-on", "is-link", "is-card");
          });
        }

        // ----- Magnetic buttons -----
        $$(".lp-pill").forEach((btn) => {
          const big = btn.classList.contains("lp-lg");
          const xTo = gsap.quickTo(btn, "x", { duration: 0.6, ease: "elastic.out(1, 0.5)" });
          const yTo = gsap.quickTo(btn, "y", { duration: 0.6, ease: "elastic.out(1, 0.5)" });
          const move = (e) => {
            const r = btn.getBoundingClientRect();
            xTo((e.clientX - (r.left + r.width / 2)) * (big ? 0.32 : 0.22));
            yTo((e.clientY - (r.top + r.height / 2)) * (big ? 0.42 : 0.3));
          };
          const leave = () => {
            xTo(0);
            yTo(0);
          };
          btn.addEventListener("mousemove", move);
          btn.addEventListener("mouseleave", leave);
          cleanups.push(() => {
            btn.removeEventListener("mousemove", move);
            btn.removeEventListener("mouseleave", leave);
          });
        });

        // ----- Hero cards drift with the mouse, each at its own depth -----
        const hero = $(".lp-hero");
        const layers = $$(".lp-float-in");
        if (hero && layers.length) {
          const movers = layers.map((el) => ({
            depth: parseFloat(el.dataset.depth || "1"),
            x: gsap.quickTo(el, "x", { duration: 1.1, ease: "power3" }),
            y: gsap.quickTo(el, "y", { duration: 1.1, ease: "power3" }),
          }));
          const move = (e) => {
            const r = hero.getBoundingClientRect();
            const nx = (e.clientX - r.left) / r.width - 0.5;
            const ny = (e.clientY - r.top) / r.height - 0.5;
            movers.forEach((m) => {
              m.x(nx * m.depth * 70);
              m.y(ny * m.depth * 70);
            });
          };
          const leave = () => movers.forEach((m) => (m.x(0), m.y(0)));
          hero.addEventListener("mousemove", move);
          hero.addEventListener("mouseleave", leave);
          cleanups.push(() => {
            hero.removeEventListener("mousemove", move);
            hero.removeEventListener("mouseleave", leave);
          });
        }

        return () => cleanups.forEach((fn) => fn());
      },
      root
    );

    return () => mm.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
