import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStoreFilters, resolveMediaUrl } from "../../api/client";
import { Loading, ErrorBox, EmptyState } from "../../components/Ui";
import { useStoreSlug } from "../../context/StoreSlugContext";

export default function AllCategories() {
  const { slug, basePath } = useStoreSlug();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    getStoreFilters(slug)
      .then((data) => setCategories(data.categories || []))
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const goToCategory = (categorySlug) => {
    navigate(`${basePath}/category/${encodeURIComponent(categorySlug)}`);
  };

  return (
    <div className="store-page">
      <div className="page-header">
        <h1>All categories</h1>
      </div>
      <p className="muted">Browse the full range of categories in this store.</p>

      <ErrorBox message={error} />

      {loading ? (
        <Loading />
      ) : categories.length === 0 ? (
        <EmptyState>No categories yet.</EmptyState>
      ) : (
        <div className="category-tile-grid" style={{ marginTop: 20 }}>
          {categories.map((c) => (
            <button type="button" className="category-tile" key={c._id} onClick={() => goToCategory(c.slug)}>
              <div className="category-tile-thumb">
                {c.image ? (
                  <img src={resolveMediaUrl(c.image)} alt={c.name} />
                ) : (
                  <div className="category-tile-placeholder">{c.name?.[0] || "?"}</div>
                )}
              </div>
              <div className="category-tile-name">{c.name}</div>
              <div className="muted small" style={{ textAlign: "center", marginTop: -6 }}>
                {c.product_count} product{c.product_count === 1 ? "" : "s"}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
