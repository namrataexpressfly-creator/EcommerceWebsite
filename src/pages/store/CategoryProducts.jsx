import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import client, { getStoreFilters } from "../../api/client";
import { Loading, ErrorBox, EmptyState } from "../../components/Ui";
import ProductCard from "../../components/ProductCard";
import CustomerLoginModal from "../../components/CustomerLoginModal";
import { useStoreSlug } from "../../context/StoreSlugContext";

const LIMIT = 12;

export default function CategoryProducts() {
  const { slug, basePath } = useStoreSlug();
  const { categorySlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const sort = searchParams.get("sort") || "newest";
  const page = Math.max(1, Number(searchParams.get("page") || 1));

  const [categoryName, setCategoryName] = useState("");
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    getStoreFilters(slug)
      .then((data) => {
        const found = (data.categories || []).find((c) => c.slug === categorySlug);
        setCategoryName(found?.name || "");
      })
      .catch(() => setCategoryName(""));
  }, [slug, categorySlug]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [categorySlug, page]);

  useEffect(() => {
    setLoading(true);
    setError("");
    const params = { page, limit: LIMIT, category: categorySlug };
    if (sort !== "newest") params.sort = sort;
    client
      .get(`/store/${slug}/products`, { params })
      .then(({ data }) => {
        setProducts(data.products || []);
        setTotal(data.total || 0);
      })
      .catch((err) => setError(err.response?.data?.error || "We couldn't load these products. Please try again."))
      .finally(() => setLoading(false));
  }, [slug, categorySlug, sort, page]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next);
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="store-page">
      <div className="page-header" style={{ alignItems: "center" }}>
        <div>
          <Link to={`${basePath}/categories`} className="muted small">
            ← All categories
          </Link>
          <h1 style={{ marginTop: 4 }}>{categoryName || "Category"}</h1>
        </div>
        {!loading && (
          <span className="products-count">
            {total} {total === 1 ? "product" : "products"}
          </span>
        )}
      </div>

      <div className="filters-bar">
        <select className="input" value={sort} onChange={(e) => setParam("sort", e.target.value)}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      <ErrorBox message={error} />

      {loading ? (
        <Loading label="Loading products…" />
      ) : products.length === 0 ? (
        <EmptyState>
          There are no products in this category yet.{" "}
          <button type="button" className="btn btn-ghost" onClick={() => navigate(basePath || "/")}>
            Continue shopping
          </button>
        </EmptyState>
      ) : (
        <>
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} basePath={basePath} slug={slug} onNeedLogin={() => setShowLogin(true)} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setParam("page", String(page - 1))}>
                ← Prev
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setParam("page", String(page + 1))}>
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {showLogin && <CustomerLoginModal onClose={() => setShowLogin(false)} onSuccess={() => setShowLogin(false)} />}
    </div>
  );
}
