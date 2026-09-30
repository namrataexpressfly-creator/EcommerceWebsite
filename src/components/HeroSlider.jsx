import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import gsap from "gsap";
import client, { resolveMediaUrl } from "../api/client";
import { formatMoney } from "../utils/format";

const AUTOPLAY_MS = 5500;

export default function HeroSlider({ slug, basePath = "", storeName, tagline, products }) {
  const [banners, setBanners] = useState([]);
  const [bannersLoaded, setBannersLoaded] = useState(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
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

  const productSlides = (products || [])
    .filter((p) => p.images?.[0])
    .slice(0, 5)
    .map((p) => ({
      id: p._id,
      kind: "product",
      image: resolveMediaUrl(p.images[0]),
      title: p.name,
      price: p.price,
      comparePrice: p.compare_at_price,
      link: `${basePath}/product/${p._id}`,
    }));

  const slides = bannerSlides.length > 0 ? bannerSlides : productSlides;

  useEffect(() => {
    setIndex(0);
    prevIndexRef.current = 0;
  }, [slides.length, bannersLoaded]);

  const animateTo = (newIndex, prevIndex) => {
    const activeEl = slideRefs.current[newIndex];
    const prevEl = slideRefs.current[prevIndex];
    const mediaEl = mediaRefs.current[newIndex];
    if (!activeEl) return;

    gsap.killTweensOf([activeEl, mediaEl]);
    if (prevEl && prevEl !== activeEl) gsap.killTweensOf(prevEl);

    const tl = gsap.timeline();

    if (prevEl && prevEl !== activeEl) {
      tl.set(prevEl, { zIndex: 1 });
      tl.to(prevEl, { opacity: 0, duration: 0.6, ease: "power1.out" }, 0);
    }

    tl.set(activeEl, { zIndex: 2, opacity: 1 }, 0);

    if (mediaEl) {
      tl.fromTo(
        mediaEl,
        { scale: 1.0 },
        { scale: 1.09, duration: AUTOPLAY_MS / 1000 + 1, ease: "none" },
        0
      );
    }

    const animatedChildren = activeEl.querySelectorAll(".hs-anim");
    if (animatedChildren.length) {
      tl.fromTo(
        animatedChildren,
        { opacity: 0, y: 26 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.09, ease: "power3.out" },
        0.15
      );
    }
  };

  useEffect(() => {
    if (slides.length === 0) return;
    animateTo(index, prevIndexRef.current);
    prevIndexRef.current = index;
  
  }, [index, slides.length]);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timerRef.current);
  }, [slides.length, paused]);

  if (!bannersLoaded) return <div className="hero-slider-placeholder" />;

  if (slides.length === 0) {
    return (
      <section className="hero">
        <span className="eyebrow">Storefront</span>
        <h1>{storeName || "Welcome"}</h1>
        <p>{tagline}</p>
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
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="hero-slider-stage">
        {slides.map((s, i) => (
          <a
            key={s.id}
            href={s.link}
            ref={(el) => (slideRefs.current[i] = el)}
            className={`hero-slide-abs${s.kind === "product" ? " is-product" : ""}`}
            style={{ opacity: i === index ? 1 : 0, zIndex: i === index ? 2 : 1 }}
            onClick={(e) => handleSlideClick(e, s.link)}
          >
            {s.kind === "product" ? (

              <div className="hero-product-media">
                <img ref={(el) => (mediaRefs.current[i] = el)} src={s.image} alt="" />
              </div>
            ) : (
              <>
                <div
                  ref={(el) => (mediaRefs.current[i] = el)}
                  className="hero-slide-media"
                  style={{ backgroundImage: `url(${s.image})` }}
                />
                <div className="hero-slide-scrim" />
              </>
            )}
            <div className="hero-slide-content">
              <h1 className="hs-anim">{s.title}</h1>
              {s.subtitle && <p className="hero-slide-subtitle hs-anim">{s.subtitle}</p>}
              {s.price !== undefined && (
                <div className="hero-slide-price hs-anim">
                  {formatMoney(s.price)}
                  {s.comparePrice ? (
                    <span className="product-compare hero-slide-compare">{formatMoney(s.comparePrice)}</span>
                  ) : null}
                </div>
              )}
            </div>
          </a>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            className="hero-slider-arrow prev"
            aria-label="Previous slide"
            onClick={() => goTo(index - 1)}
          >
            ←
          </button>
          <button
            type="button"
            className="hero-slider-arrow next"
            aria-label="Next slide"
            onClick={() => goTo(index + 1)}
          >
            →
          </button>
          <div className="hero-slider-dots">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`hero-slider-dot${i === index ? " active" : ""}`}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
