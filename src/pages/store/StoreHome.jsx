import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import client, { getBestSellers, getAllStoreReviews, getStoreFilters, resolveMediaUrl } from "../../api/client";
import { formatMoney } from "../../utils/format";
import { SHIPPING_CHARGE } from "../../utils/shop";
import { Loading, ErrorBox, EmptyState } from "../../components/Ui";
import HeroSlider from "../../components/HeroSlider";
import ProductCard from "../../components/ProductCard";
import StoreFilterSidebar from "../../components/StoreFilterSidebar";
import { StarRating } from "../../components/StarRating";
import CustomerLoginModal from "../../components/CustomerLoginModal";
import { useStoreSlug } from "../../context/StoreSlugContext";

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8h11v9H3z" />
        <path d="M14 11h4l3 3v3h-7z" />
        <circle cx="7" cy="19" r="1.6" />
        <circle cx="17.5" cy="19" r="1.6" />
      </svg>
    ),
    title: "Flat-rate delivery",
    text: `${formatMoney(SHIPPING_CHARGE)} shipping on every order`,
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="5" width="19" height="14" rx="2" />
        <path d="M2.5 9.5h19" />
        <path d="M6 15h4" />
      </svg>
    ),
    title: "Flexible Payment",
    text: "Multiple secure payment options",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12a8 8 0 1 1 3 6.2" />
        <path d="M4 12v5H9" />
      </svg>
    ),
    title: "Easy Returns",
    text: "Hassle-free return policy",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l7 3.5v5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5v-5z" />
        <path d="M9.5 12l1.8 1.8 3.2-3.6" />
      </svg>
    ),
    title: "Premium Support",
    text: "Here to help, whenever you need",
  },
];

const STEPS = [
  { title: "Choose what you like", text: "Browse the categories or search the shop, then add your picks to the cart." },
  { title: "Check out in one page", text: "Add your address, pick a payment method and place the order. No long forms." },
  { title: "Track it to your door", text: "Follow your order at any time from the Track order page." },
];

function CategoryStrip({ categories, basePath }) {
  if (!categories.length) return null;
  return (
    <div className="sf-promo-row">
      {categories.slice(0, 4).map((c) => (
        <Link key={c._id} to={`${basePath}/category/${encodeURIComponent(c.slug)}`} className="sf-promo">
          {c.image ? <img src={resolveMediaUrl(c.image)} alt="" /> : <span className="sf-promo-initial">{c.name?.[0] || "?"}</span>}
          <span className="sf-promo-text">
            <strong>{c.name}</strong>
            <small>Shop the collection</small>
          </span>
          <span className="sf-promo-arrow" aria-hidden="true">›</span>
        </Link>
      ))}
    </div>
  );
}

function HeroSearch({ categories, basePath, onSearch }) {
  const [text, setText] = useState("");
  const [hint, setHint] = useState("");
  const listRef = useRef(null);
  const [edge, setEdge] = useState({ overflow: false, start: true, end: false });

  useEffect(() => {
    const el = listRef.current;
    if (!el) return undefined;
    const update = () =>
      setEdge({
        overflow: el.scrollWidth > el.clientWidth + 2,
        start: el.scrollLeft <= 2,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
      });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [categories]);

  const scrollChips = (dir) => {
    const el = listRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: "smooth" });
  };

  const submit = (e) => {
    e.preventDefault();
    const value = text.trim();
    if (value.length < 3) {
      setHint("Type at least 3 letters to search.");
      return;
    }
    setHint("");
    onSearch(value);
  };
  return (
    <div className="hero-overlay">
      <form className="hero-search" onSubmit={submit} role="search">
        <input
          type="search"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (hint) setHint("");
          }}
          placeholder="Search products in this store"
          aria-label="Search products"
        />
        <button type="submit" className="hero-search-btn" aria-label="Search">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5" />
          </svg>
        </button>
      </form>
      {hint && <div className="hero-search-hint" role="alert">{hint}</div>}
      {categories.length > 0 && (
        <div className="hero-chips">
          <span className="hero-chips-label">Shop by category</span>
          {edge.overflow && (
            <button type="button" className="hero-chips-arrow" aria-label="Scroll categories left" disabled={edge.start} onClick={() => scrollChips(-1)}>‹</button>
          )}
          <div className="hero-chips-list" ref={listRef}>
            {categories.map((c) => (
              <Link key={c._id} to={`${basePath}/category/${encodeURIComponent(c.slug)}`} className="hero-chip">
                {c.image ? <img src={resolveMediaUrl(c.image)} alt="" /> : <span className="hero-chip-initial">{c.name?.[0] || "?"}</span>}
                {c.name}
              </Link>
            ))}
          </div>
          {edge.overflow && (
            <button type="button" className="hero-chips-arrow" aria-label="Scroll categories right" disabled={edge.end} onClick={() => scrollChips(1)}>›</button>
          )}
        </div>
      )}
    </div>
  );
}

function HowItWorks() {
  return (
    <div className="sf-section">
      <div className="sf-head">
        <div>
          <h2 className="sf-title">Ordering in three simple steps</h2>
          <p className="sf-sub">From first click to your doorstep, kept as short as we can make it.</p>
        </div>
      </div>
      <div className="sf-steps">
        {STEPS.map((st, i) => (
          <div className="sf-step" key={st.title}>
            <div className="sf-step-num">{String(i + 1).padStart(2, "0")}</div>
            <h3>{st.title}</h3>
            <p>{st.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrustMarquee() {
  const items = FEATURES.map((f) => (
    <div className="sf-marquee-item" key={f.title}>
      {f.icon}
      {f.title}
      <span>{f.text}</span>
    </div>
  ));
  return (
    <div className="sf-marquee" role="presentation">
      <div className="sf-marquee-track">{items}</div>
      <div className="sf-marquee-track" aria-hidden="true">{items}</div>
    </div>
  );
}

export default function StoreHome() {
  const { slug, basePath } = useStoreSlug();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const sort = searchParams.get("sort") || "newest";
  const minPrice = searchParams.get("min_price") || "";
  const maxPrice = searchParams.get("max_price") || "";
  const availabilityParam = searchParams.get("availability") || "";
  const variantsParam = searchParams.get("variants") || ""; 
  const page = Number(searchParams.get("page") || 1);
  const limit = 12;


  const selectedVariants = {};
  if (variantsParam) {
    variantsParam.split(";").forEach((part) => {
      const [name, valuesStr] = part.split(":");
      if (!name || !valuesStr) return;
      selectedVariants[name] = valuesStr.split("|").filter(Boolean);
    });
  }

  const [searchText, setSearchText] = useState(q);
  const [storeConfig, setStoreConfig] = useState(null);
  const [categories, setCategories] = useState([]);
  const [priceBounds, setPriceBounds] = useState(null);
  const [availabilityStats, setAvailabilityStats] = useState(null);
  const [variantDefs, setVariantDefs] = useState([]);
  const productsRef = useRef(null);
  const reviewsRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bestSellers, setBestSellers] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [allReviewsTotal, setAllReviewsTotal] = useState(0);
  const [allReviewsPage, setAllReviewsPage] = useState(1);
  const [allReviewsLoading, setAllReviewsLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setSearchText(q);
  }, [q]);

  useEffect(() => {
    client
      .get(`/store/${slug}`)
      .then(({ data }) => setStoreConfig(data))
      .catch(() => setStoreConfig(null));

    getStoreFilters(slug)
      .then((data) => {
        setCategories(data.categories || []);
        setPriceBounds(data.price || null);
        setAvailabilityStats(data.availability || null);
        setVariantDefs(data.variants || []);
      })
      .catch(() => {
        setCategories([]);
        setPriceBounds(null);
        setAvailabilityStats(null);
        setVariantDefs([]);
      });

    getBestSellers(slug, 8)
      .then((data) => setBestSellers(data.products || []))
      .catch(() => setBestSellers([]));

    setAllReviewsPage(1);
    setAllReviewsLoading(true);
    getAllStoreReviews(slug, 1, 12)
      .then((data) => {
        setAllReviews(data.reviews || []);
        setAllReviewsTotal(data.total || 0);
      })
      .catch(() => {
        setAllReviews([]);
        setAllReviewsTotal(0);
      })
      .finally(() => setAllReviewsLoading(false));
  }, [slug]);

  const loadMoreReviews = () => {
    const nextPage = allReviewsPage + 1;
    setAllReviewsLoading(true);
    getAllStoreReviews(slug, nextPage, 12)
      .then((data) => {
        setAllReviews((prev) => [...prev, ...(data.reviews || [])]);
        setAllReviewsTotal(data.total || 0);
        setAllReviewsPage(nextPage);
      })
      .catch(() => {})
      .finally(() => setAllReviewsLoading(false));
  };


  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit,
      };

      if (q.length >= 3) {
        params.q = q;
      }

      if (category) {
        params.category = category;
      }

      if (minPrice) {
        params.min_price = minPrice;
      }

      if (maxPrice) {
        params.max_price = maxPrice;
      }

      if (sort && sort !== "newest") {
        params.sort = sort;
      }

      if (availabilityParam) {
        params.availability = availabilityParam;
      }

      Object.entries(selectedVariants).forEach(([name, values]) => {
        if (values.length > 0) {
          params[`variant_${name}`] = values.join(",");
        }
      });

      client
        .get(`/store/${slug}/products`, { params })
        .then(({ data }) => {
          setProducts(data.products || []);
          setTotal(data.total || 0);
        })
        .catch((err) => {
          setError(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 500);

    return () => clearTimeout(timer);
  
  }, [slug, q, category, minPrice, maxPrice, sort, page, availabilityParam, variantsParam]);


  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);

    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }

    if (key !== "page") {
      next.delete("page");
    }

    setSearchParams(next);
  };

  const applyFilters = ({ category: cat, min_price, max_price, availability, variants }) => {
    const next = new URLSearchParams(searchParams);
    const set = (key, value) => {
      if (value) next.set(key, value);
      else next.delete(key);
    };
    set("category", cat);
    set("min_price", min_price);
    set("max_price", max_price);
    set("availability", availability);

    const variantsStr = Object.entries(variants || {})
      .filter(([, values]) => values.length > 0)
      .map(([name, values]) => `${name}:${values.join("|")}`)
      .join(";");
    set("variants", variantsStr);

    next.delete("page");
    setSearchParams(next);
  };

  const clearFilters = () => applyFilters({ category: "", min_price: "", max_price: "", availability: "", variants: {} });

  const goToCategory = (slugValue) => {
    navigate(`${basePath}/category/${encodeURIComponent(slugValue)}`);
  };

  const activeFilterCount =
    [category, minPrice, maxPrice, availabilityParam].filter(Boolean).length +
    Object.values(selectedVariants).reduce((sum, values) => sum + values.length, 0);


  const handleSearch = (e) => {
    const value = e.target.value;

    setSearchText(value);

    if (value.length === 0) {
      updateParam("q", "");
      return;
    }

    if (value.length >= 3) {
      updateParam("q", value);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const runSearch = (value) => {
    updateParam("q", value);
    setTimeout(() => document.getElementById("all-products")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  const scrollReviews = (dir) => {
    const el = reviewsRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 420), behavior: "smooth" });
  };

  return (
    <div>
      <CategoryStrip categories={categories} basePath={basePath} />

      <HeroSlider
        overlay={<HeroSearch categories={categories} basePath={basePath} onSearch={runSearch} />}
        slug={slug}
        basePath={basePath}
        storeName={storeConfig?.store_name}
        tagline="Browse the full collection, add what you need to your cart, and check out in a single page."
        products={products}
      />

      <TrustMarquee />

      {categories.length > 0 && (
        <div className="category-shop-section">
          <div className="sf-head">
            <div>
              <h2 className="sf-title">Shop by category</h2>
              <p className="sf-sub">Find what you need faster. Start with a collection and go from there.</p>
            </div>
            <div className="sf-head-actions">
              <button type="button" className="btn btn-ghost" onClick={() => navigate(`${basePath}/categories`)}>
                View all categories
              </button>
            </div>
          </div>
          <div className="category-tile-grid">
            {categories.slice(0, 4).map((c) => (
              <button type="button" className="category-tile" key={c._id} onClick={() => goToCategory(c.slug)}>
                <div className="category-tile-thumb">
                  {c.image ? (
                    <img src={resolveMediaUrl(c.image)} alt="" />
                  ) : (
                    <div className="category-tile-placeholder">{c.name?.[0] || "?"}</div>
                  )}
                </div>
                <div className="category-tile-name">{c.name}</div>
              </button>
            ))}
            <button type="button" className="category-tile category-tile-all" onClick={() => navigate(`${basePath}/categories`)}>
              <div className="category-tile-thumb category-tile-all-thumb">
                <span className="category-tile-all-arrow" aria-hidden="true">→</span>
              </div>
              <div className="category-tile-name">View all categories</div>
            </button>
          </div>
        </div>
      )}

      {bestSellers.length > 0 && (
        <div className="sf-section">
          <div className="sf-head">
            <div>
              <h2 className="sf-title">Best sellers</h2>
              <p className="sf-sub">The products our customers keep coming back for.</p>
            </div>
          </div>
          <div className="product-grid">
            {bestSellers.map((p) => (
              <ProductCard
                key={p._id}
                product={p}
                basePath={basePath}
                slug={slug}
                badge="Best Seller"
                onNeedLogin={() => setShowLogin(true)}
              />
            ))}
          </div>
        </div>
      )}

      <HowItWorks />

      <div className="products-head" id="all-products" ref={productsRef}>
        <h2 className="store-section-title">{categories.find((c) => c.slug === category)?.name || "All products"}</h2>
        {!loading && (
          <span className="products-count">
            {total} {total === 1 ? "product" : "products"}
          </span>
        )}
      </div>

      <div className="filters-bar">
        <input
          className="input"
          placeholder="Search products…"
          value={searchText}
          onChange={handleSearch}
        />

        <button type="button" className="btn btn-ghost filters-btn" onClick={() => setShowFilters(true)}>
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>

        <select
          className="input"
          value={sort}
          onChange={(e) =>
            updateParam("sort", e.target.value)
          }
        >
          <option value="newest">Newest</option>
          <option value="price_asc">
            Price: Low to High
          </option>
          <option value="price_desc">
            Price: High to Low
          </option>
        </select>
      </div>

      <StoreFilterSidebar
        open={showFilters}
        onClose={() => setShowFilters(false)}
        categories={categories}
        priceBounds={priceBounds}
        availability={availabilityStats}
        variants={variantDefs}
        values={{ category, min_price: minPrice, max_price: maxPrice, availability: availabilityParam, variants: selectedVariants }}
        onApply={applyFilters}
        onClear={clearFilters}
      />

      <ErrorBox message={error} />

      {loading ? (
        <Loading label="Loading products…" />
      ) : products.length === 0 ? (
        <EmptyState>
          No products found. Try a different search or filter.
        </EmptyState>
      ) : (
        <>
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard
                key={p._id}
                product={p}
                basePath={basePath}
                slug={slug}
                onNeedLogin={() => setShowLogin(true)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-ghost"
                disabled={page <= 1}
                onClick={() =>
                  updateParam(
                    "page",
                    String(page - 1)
                  )
                }
              >
                ← Prev
              </button>

              <span>
                Page {page} of {totalPages}
              </span>

              <button
                className="btn btn-ghost"
                disabled={page >= totalPages}
                onClick={() =>
                  updateParam(
                    "page",
                    String(page + 1)
                  )
                }
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {allReviews.length > 0 && (
        <div className="sf-section">
          <div className="sf-head">
            <div>
              <h2 className="sf-title">What customers are saying</h2>
              <p className="sf-sub">Honest reviews from people who have ordered.</p>
            </div>
            <div className="sf-carousel-nav">
              <button type="button" className="sf-carousel-btn" aria-label="Previous reviews" onClick={() => scrollReviews(-1)}>←</button>
              <button type="button" className="sf-carousel-btn" aria-label="Next reviews" onClick={() => scrollReviews(1)}>→</button>
            </div>
          </div>
          <div className="review-card-grid" ref={reviewsRef}>
            {allReviews.map((r) => (
              <div className="review-card" key={r._id}>
                <StarRating value={r.rating} />
                {r.title && <div className="review-card-title">{r.title}</div>}
                {r.comment && <p className="review-card-comment">{r.comment}</p>}
                <div className="review-card-footer">
                  <span className="review-card-author">{r.customer_name}</span>
                  {r.product_id?.name && (
                    <span className="review-card-product">on {r.product_id.name}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {allReviews.length < allReviewsTotal && (
            <div className="form-row" style={{ justifyContent: "center", marginTop: 24 }}>
              <button className="btn btn-ghost" disabled={allReviewsLoading} onClick={loadMoreReviews}>
                {allReviewsLoading ? "Loading…" : "Load more reviews"}
              </button>
            </div>
          )}
        </div>
      )}

      {showLogin && <CustomerLoginModal onClose={() => setShowLogin(false)} onSuccess={() => setShowLogin(false)} />}
    </div>
  );
}