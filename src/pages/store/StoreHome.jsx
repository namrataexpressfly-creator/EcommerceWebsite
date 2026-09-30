import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import client, { getBestSellers, getAllStoreReviews, getStoreFilters, resolveMediaUrl } from "../../api/client";
import { formatMoney } from "../../utils/format";
import { FREE_SHIPPING_THRESHOLD } from "../../utils/shop";
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
    title: "Free delivery",
    text: `On orders above ${formatMoney(FREE_SHIPPING_THRESHOLD)}`,
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

  return (
    <div>
      <HeroSlider
        slug={slug}
        basePath={basePath}
        storeName={storeConfig?.store_name}
        tagline="Browse the full collection, add what you need to your cart, and check out in a single page."
        products={products}
      />

      {categories.length > 0 && (
        <div className="store-section category-shop-section">
          <div className="category-shop-header">
            <h2 className="store-section-title">Shop by Category</h2>
            <button type="button" className="category-view-all" onClick={() => navigate(`${basePath}/categories`)}>
              View all →
            </button>
          </div>
          <div className="category-tile-grid">
            {categories.slice(0, 4).map((c) => (
              <button type="button" className="category-tile" key={c._id} onClick={() => goToCategory(c.slug)}>
                <div className="category-tile-thumb">
                  {c.image ? (
                    <img src={resolveMediaUrl(c.image)} alt={c.name} />
                  ) : (
                    <div className="category-tile-placeholder">{c.name?.[0] || "?"}</div>
                  )}
                </div>
                <div className="category-tile-name">{c.name}</div>
              </button>
            ))}
            <button type="button" className="category-tile category-tile-discover" onClick={() => navigate(`${basePath}/categories`)}>
              Discover all
              <br />
              categories →
            </button>
          </div>
        </div>
      )}

      <div className="feature-cards-row">
        {FEATURES.map((f) => (
          <div className="feature-card" key={f.title}>
            <div className="feature-card-icon">{f.icon}</div>
            <div>
              <div className="feature-card-title">{f.title}</div>
              <div className="feature-card-text">{f.text}</div>
            </div>
          </div>
        ))}
      </div>

      {bestSellers.length > 0 && (
        <div className="store-section">
          <h2 className="store-section-title">Best Sellers</h2>
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

      <div className="products-head" ref={productsRef}>
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
        <div className="store-section">
          <h2 className="store-section-title">What customers are saying</h2>
          <div className="review-card-grid">
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
            <div className="form-row" style={{ justifyContent: "center", marginTop: 12 }}>
              <button
                className="btn btn-ghost"
                disabled={allReviewsLoading}
                onClick={loadMoreReviews}
              >
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