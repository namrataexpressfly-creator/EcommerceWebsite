import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import gsap from "gsap";
import client, { resolveMediaUrl } from "../api/client";
import { formatMoney } from "../utils/format";

const AUTOPLAY_MS = 5500;

export default function HeroSlider({ slug, basePath = "", storeName, headline = "Good things, delivered with care.", tagline, products, overlay }) {
  const [banners, setBanners] = useState([]);
  const [bannersLoaded, setBannersLoaded] = useState(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0);
  const navigate = useNavigate();

  const slideRefs = useRef([]);
  const mediaRefs = useRef([]);
  const timerRef = useRef(null);
  const prevIndexRef = useRef(0);

  useEffect(() => {
    client
      .get(`/store/${slug}/banners`)
      .then(({ data }) => setBanners(Array.isArray(data) ? data : []))
      .catch(() => setBanners([]))
      .finally(() => setBannersLoaded(true));
  }, [slug]);

  const bannerSlides = banners.slice(0, 5).map((b) => ({
    id: b._id,
    kind: "banner",
    image: resolveMediaUrl(b.image_url),
    title: b.title,
    subtitle: b.subtitle,
    link: b.link_url || basePath || "/",
  }));

  const slides = bannerSlides;

  useEffect(() => {
    setIndex(0);
    prevIndexRef.current = 0;
  }, [slides.length, bannersLoaded]);

  const animateTo = (newIndex, prevIndex) => {
    const activeEl = slideRefs.current[newIndex];
    const prevEl = slideRefs.current[prevIndex];
    const mediaEl = mediaRefs.current[newIndex];
    if (!activeEl) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const others = slideRefs.current.filter((el) => el && el !== activeEl && el !== prevEl);
    gsap.killTweensOf([activeEl, prevEl, mediaEl].filter(Boolean));
    gsap.set(others, { visibility: "hidden" });

    const tl = gsap.timeline();
    const changed = prevEl && prevEl !== activeEl && !reduce;

    if (changed) {
      // new slide wipes in from the right while the old one drifts left
      tl.set(prevEl, { zIndex: 1, visibility: "visible", clipPath: "none" }, 0);
      tl.set(activeEl, { zIndex: 2, visibility: "visible", clipPath: "inset(0 0 0 100%)" }, 0);
      tl.to(activeEl, { clipPath: "inset(0 0 0 0%)", duration: 1.15, ease: "expo.inOut" }, 0);
      tl.to(prevEl, { xPercent: -12, duration: 1.15, ease: "expo.inOut" }, 0);
      tl.set(prevEl, { visibility: "hidden", xPercent: 0 }, 1.2);
    } else {
      if (prevEl && prevEl !== activeEl) gsap.set(prevEl, { visibility: "hidden", xPercent: 0 });
      tl.set(activeEl, { zIndex: 2, visibility: "visible", clipPath: "none", xPercent: 0 }, 0);
    }

    if (mediaEl && !reduce) {
      // slow settle-in zoom, so the photo is always gently moving
      tl.set(mediaEl, { scale: 1 }, 0);
    }

    const animatedChildren = activeEl.querySelectorAll(".hs-anim");
    if (animatedChildren.length && !reduce) {
      tl.fromTo(
        animatedChildren,
        { opacity: 0, y: 64 },
        { opacity: 1, y: 0, duration: 1.1, stagger: 0.12, ease: "expo.out" },
        changed ? 0.5 : 0.15
      );
    }
  };

  useEffect(() => {
    if (slides.length === 0) return;
    animateTo(index, prevIndexRef.current);
    prevIndexRef.current = index;
  
  }, [index, slides.length]);

  useEffect(() => {
    if (slides.length < 2 || paused) return undefined;
    timerRef.current = setTimeout(() => setIndex((i) => (i + 1) % slides.length), AUTOPLAY_MS);
    return () => clearTimeout(timerRef.current);
  }, [slides.length, paused, index, cycle]);

  if (!bannersLoaded) return <div className="hero-slider-placeholder" />;

  if (slides.length === 0) {
    // No banners set by the seller: editorial hero with a strip of real product photos
    const tiles = (products || []).filter((p) => p.images?.[0]).slice(0, 3);
    const placeholders = Array.from({ length: Math.max(0, 3 - tiles.length) });
    const scrollToProducts = () =>
      document.getElementById("all-products")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return (
      <section className="sf-hero">
        <div className="sf-hero-copy">
          <h1>{headline}</h1>
          <p>{tagline}</p>
          <div className="sf-hero-cta">
            <button type="button" className="btn btn-primary btn-lg" onClick={scrollToProducts}>
              Shop now
            </button>
            <button type="button" className="btn btn-ghost btn-lg" onClick={() => navigate(`${basePath}/categories`)}>
              Browse categories
            </button>
          </div>
          {overlay}
        </div>
        <div className="sf-hero-strip">
          {tiles.map((p) => (
            <Link key={p._id} to={`${basePath}/product/${p._id}`} className="sf-hero-tile">
              <img src={resolveMediaUrl(p.images[0])} alt={p.name} loading="lazy" />
              <span className="sf-hero-tile-label">{p.name}</span>
            </Link>
          ))}
          {placeholders.map((_, i) => (
            <div key={`ph-${i}`} className="sf-hero-tile is-empty" aria-hidden="true" />
          ))}
        </div>
      </section>
    );
  }

  const goTo = (i) => setIndex((i + slides.length) % slides.length);

  const handleSlideClick = (e, link) => {
    e.preventDefault();
    if (link.startsWith("http")) window.location.href = link;
    else navigate(link);
  };

  return (
    <section
      className="hero-slider"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false);
        setCycle((c) => c + 1);
      }}
    >
      {slides.map((s, i) => (
        <a
          key={s.id}
          href={s.link}
          ref={(el) => (slideRefs.current[i] = el)}
          className="hero-slide-abs"
          style={{ visibility: i === 0 ? "visible" : "hidden", zIndex: i === 0 ? 2 : 1 }}
          onClick={(e) => handleSlideClick(e, s.link)}
        >
          <img
            ref={(el) => (mediaRefs.current[i] = el)}
            className="hero-slide-media"
            src={s.image}
            alt=""
            decoding="async"
            fetchpriority={i === 0 ? "high" : "auto"}
          />
          {(s.title || s.subtitle) && (
            <div className="hero-slide-content">
              {s.title && <h1 className="hs-anim">{s.title}</h1>}
              {s.subtitle && <p className="hero-slide-subtitle hs-anim">{s.subtitle}</p>}
              <span className="hero-slide-cta hs-anim">Shop now <span aria-hidden="true">→</span></span>
            </div>
          )}
        </a>
      ))}

      {slides.length > 1 && (
        <>
          <div className="hero-slider-bar">
            <div className="hero-slider-segs">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className={`hs-seg${i < index ? " is-done" : ""}${i === index ? " is-active" : ""}`}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => goTo(i)}
                >
                  <span
                    key={i === index ? `a-${cycle}` : "x"}
                    className="hs-seg-fill"
                    style={i === index ? { animationDuration: `${AUTOPLAY_MS}ms`, animationPlayState: paused ? "paused" : "running" } : undefined}
                  />
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="hero-slider-arrow prev" aria-label="Previous slide" onClick={() => goTo(index - 1)}>‹</button>
          <button type="button" className="hero-slider-arrow next" aria-label="Next slide" onClick={() => goTo(index + 1)}>›</button>
        </>
      )}
      {overlay}
    </section>
  );
}
