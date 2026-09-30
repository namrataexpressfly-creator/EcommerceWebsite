import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import client, {
  resolveMediaUrl,
  addToWishlist,
  removeFromWishlist,
  getProductReviews,
  submitProductReview,
} from "../../api/client";
import { useCart } from "../../context/CartContext";
import { useCustomerAuth } from "../../context/CustomerAuthContext";
import CustomerLoginModal from "../../components/CustomerLoginModal";
import ProductCard from "../../components/ProductCard";
import { Loading, ErrorBox, SuccessBox } from "../../components/Ui";
import { StarRating, StarInput } from "../../components/StarRating";
import { formatMoney } from "../../utils/format";
import { FREE_SHIPPING_THRESHOLD, discountPercent } from "../../utils/shop";
import { useStoreSlug } from "../../context/StoreSlugContext";

const BESTSELLER_THRESHOLD = 10;

function swatchImageForOption(product, variantName, value) {
  const combo = (product.combinations || []).find(
    (c) => c.option_values?.[variantName] === value && c.images?.length
  );
  return combo?.images?.[0] || null;
}

export default function ProductDetail() {
  const { productId } = useParams();
  const { slug, basePath } = useStoreSlug();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isLoggedIn, customer, refreshAddresses, setWishlist } = useCustomerAuth();

  const [product, setProduct] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); 
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("description");
  const [related, setRelated] = useState([]);

  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ average_rating: 0, count: 0, breakdown: {} });
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [myRating, setMyRating] = useState(0);
  const [myTitle, setMyTitle] = useState("");
  const [myComment, setMyComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");

  useEffect(() => {
    setLoading(true);
    setSelectedOptions({});
    setSelectedImageIndex(0);
    setActiveTab("description");
    client
      .get(`/store/${slug}/products/${productId}`)
      .then(({ data }) => setProduct(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug, productId]);

  useEffect(() => {
    setWishlisted(Boolean(customer?.wishlist?.some((id) => String(id) === String(productId))));
  }, [customer, productId]);

  const loadReviews = () => {
    setReviewsLoading(true);
    getProductReviews(slug, productId)
      .then((data) => {
        setReviews(data.reviews || []);
        setReviewSummary({
          average_rating: data.average_rating || 0,
          count: data.count || 0,
          breakdown: data.breakdown || {},
        });
      })
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  };

  useEffect(() => {
    loadReviews();

  }, [slug, productId]);


  useEffect(() => {
    setRelated([]);
    const categorySlug = product?.category_id?.slug;
    if (!categorySlug) return;
    client
      .get(`/store/${slug}/products`, { params: { category: categorySlug, limit: 5 } })
      .then(({ data }) => {
        setRelated((data.products || []).filter((p) => String(p._id) !== String(productId)).slice(0, 4));
      })
      .catch(() => {});
  }, [slug, productId, product?.category_id?.slug]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setReviewError("");
    setReviewSuccess("");

    if (!isLoggedIn) {
      setShowLogin(true);
      return;
    }
    if (!myRating) {
      setReviewError("Please choose a star rating.");
      return;
    }

    setReviewSubmitting(true);
    try {
      await submitProductReview(slug, productId, { rating: myRating, title: myTitle, comment: myComment });
      setReviewSuccess("Thanks — your review has been posted.");
      loadReviews();
    } catch (err) {
      setReviewError(err.message || "Couldn't submit your review. Please try again.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) return <Loading label="Loading product…" />;
  if (error) return <ErrorBox message={error} />;
  if (!product) return null;

  const isVariable = product.product_type === "variable" && (product.variants || []).length > 0;

  const allSelected = isVariable && product.variants.every((v) => selectedOptions[v.name]);
  const selectedCombo = allSelected
    ? (product.combinations || []).find((c) =>
        product.variants.every((v) => c.option_values?.[v.name] === selectedOptions[v.name])
      )
    : null;


  const displayPrice = selectedCombo ? (selectedCombo.price ?? product.price) : product.price;
  const displayStock = isVariable ? (selectedCombo ? selectedCombo.stock : null) : product.stock_qty;
  const displayImages = selectedCombo?.images?.length ? selectedCombo.images : product.images;
  const outOfStock = isVariable ? (selectedCombo ? selectedCombo.stock <= 0 : false) : product.stock_qty <= 0;
  const canAddToCart = isVariable ? Boolean(selectedCombo) && !outOfStock : !outOfStock;
  const compareAt = Number(product.compare_at_price) || 0;
  const offPercent = discountPercent(displayPrice, compareAt);
  const isBestseller = Number(product.sold_count || 0) >= BESTSELLER_THRESHOLD;

  const pickOption = (variantName, value) => {
    setSelectedOptions((prev) => ({ ...prev, [variantName]: value }));
    setSelectedImageIndex(0);
  };


  const isOptionAvailable = (variantName, value) => {
    return (product.combinations || []).some((c) => {
      if (c.is_active === false) return false;
      if (c.option_values?.[variantName] !== value) return false;
      return Object.entries(selectedOptions).every(
        ([otherName, otherValue]) =>
          otherName === variantName || c.option_values?.[otherName] === otherValue
      );
    });
  };

  const handleBuyNow = () => {
    if (!canAddToCart) return;
    addItem(product, quantity, selectedCombo);
    if (!isLoggedIn) {
      setPendingAction("buy");
      setShowLogin(true);
      return;
    }
    navigate(`${basePath}/checkout`);
  };

  const handleToggleWishlist = async () => {
    if (!isLoggedIn) {
      setPendingAction(null);
      setShowLogin(true);
      return;
    }
    setWishlistBusy(true);
    try {
      if (wishlisted) {
        const updated = await removeFromWishlist(slug, productId);
        setWishlisted(false);
        setWishlist(updated);
      } else {
        const updated = await addToWishlist(slug, productId);
        setWishlisted(true);
        setWishlist(updated);
      }
    } catch {

    } finally {
      setWishlistBusy(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url });
      } catch {
        
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
     
    }
  };

  return (
    <div className="product-detail">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to={basePath || "/"}>Shop</Link>
        {product.category_id?.name && (
          <>
            <span aria-hidden="true">/</span>
            {product.category_id.slug ? (
              <Link to={`${basePath}/category/${product.category_id.slug}`}>{product.category_id.name}</Link>
            ) : (
              <span>{product.category_id.name}</span>
            )}
          </>
        )}
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>
      <div className="product-detail-grid">
        <div className="product-detail-image">
          <div className="product-gallery-main">
            {displayImages?.[selectedImageIndex] || displayImages?.[0] ? (
              <img
                src={resolveMediaUrl(displayImages[selectedImageIndex] || displayImages[0])}
                alt={product.name}
              />
            ) : (
              <div className="product-thumb-placeholder large">{product.name?.[0] || "?"}</div>
            )}
          </div>
          {displayImages?.length > 1 && (
            <div className="product-gallery-thumbs">
              {displayImages.map((img, idx) => (
                <button
                  type="button"
                  key={img + idx}
                  className={`product-gallery-thumb ${idx === selectedImageIndex ? "product-gallery-thumb-selected" : ""}`}
                  onClick={() => setSelectedImageIndex(idx)}
                >
                  <img src={resolveMediaUrl(img)} alt={`${product.name} ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="product-detail-info">
          <div className="product-detail-title-row">
            <div>
              {product.category_id?.name && (
                <div className="product-category-badge">{product.category_id.name}</div>
              )}
              {isBestseller && <span className="badge pdp-bestseller-badge">Bestseller</span>}
              <h1>{product.name}</h1>
              {reviewSummary.count > 0 && (
                <StarRating value={reviewSummary.average_rating} showValue count={reviewSummary.count} />
              )}
            </div>
            <button
              type="button"
              className="btn-icon pdp-share-btn"
              onClick={handleShare}
              title="Share this product"
            >
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
                <circle cx="15" cy="5" r="2.3" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="5" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="15" cy="15" r="2.3" stroke="currentColor" strokeWidth="1.5" />
                <path d="m7 8.8 6-2.6M7 11.2l6 2.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {shareCopied ? "Copied!" : ""}
            </button>
          </div>
          <div className="pdp-price">
            <span className="pdp-price-now">{formatMoney(displayPrice)}</span>
            {offPercent > 0 && (
              <>
                <span className="product-compare">{formatMoney(compareAt)}</span>
                <span className="pdp-save">{offPercent}% off</span>
              </>
            )}
          </div>

          {isVariable &&
            product.variants.map((v) => {
              const isColor = /^colou?r$/i.test(v.name);
              const isSize = /^size$/i.test(v.name);

              if (isSize) {
                return (
                  <div className="pdp-option-row" key={v.name}>
                    <span className="field-caption">{v.name}</span>
                    <select
                      className="input pdp-size-select"
                      value={selectedOptions[v.name] || ""}
                      onChange={(e) => pickOption(v.name, e.target.value)}
                    >
                      <option value="" disabled>
                        Select {v.name.toLowerCase()}
                      </option>
                      {v.options.map((opt) => (
                        <option key={opt} value={opt} disabled={!isOptionAvailable(v.name, opt)}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              return (
                <div className="variant-picker-group" key={v.name}>
                  <div className="variant-picker-label">{v.name}</div>
                  <div className="variant-picker-options">
                    {v.options.map((opt) => {
                      const selected = selectedOptions[v.name] === opt;
                      const available = isOptionAvailable(v.name, opt);
                      const swatchImg = isColor ? swatchImageForOption(product, v.name, opt) : null;

                      if (isColor) {
                        return (
                          <button
                            type="button"
                            key={opt}
                            className={`variant-swatch ${selected ? "variant-swatch-selected" : ""} ${
                              !available ? "variant-swatch-disabled" : ""
                            }`}
                            style={
                              swatchImg
                                ? { backgroundImage: `url(${resolveMediaUrl(swatchImg)})` }
                                : { backgroundColor: opt.toLowerCase().replace(/\s+/g, "") }
                            }
                            disabled={!available}
                            onClick={() => pickOption(v.name, opt)}
                            title={opt}
                          />
                        );
                      }

                      return (
                        <button
                          type="button"
                          key={opt}
                          className={`variant-option-btn ${selected ? "variant-option-btn-selected" : ""} ${
                            !available ? "variant-option-btn-disabled" : ""
                          }`}
                          disabled={!available}
                          onClick={() => pickOption(v.name, opt)}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          {isVariable && !allSelected && (
            <p className="muted small">Select {product.variants.map((v) => v.name).join(" and ")} to continue.</p>
          )}
          {isVariable && allSelected && !selectedCombo && (
            <p className="muted small">That combination isn't available — try a different option.</p>
          )}

          <div className="stock-line">
            {isVariable && !selectedCombo ? null : outOfStock ? (
              <span className="badge badge-out">Out of stock</span>
            ) : (
              <span className="muted">{displayStock} in stock</span>
            )}
          </div>

          {canAddToCart && (
            <>
              <div className="pdp-option-row">
                <span className="field-caption">Quantity</span>
                <div className="qty-stepper">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={displayStock}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(displayStock || q + 1, q + 1))}
                    disabled={displayStock != null && quantity >= displayStock}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="pdp-actions-row">
                <button
                  type="button"
                  className={`btn btn-ghost pdp-wishlist-btn ${wishlisted ? "pdp-wishlist-btn-active" : ""}`}
                  onClick={handleToggleWishlist}
                  disabled={wishlistBusy}
                >
                  <span aria-hidden="true">{wishlisted ? "♥" : "♡"}</span>
                  {wishlisted ? "In wishlist" : "Add to wishlist"}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    addItem(product, quantity, selectedCombo);
                    setAdded(true);
                  }}
                >
                  Add to cart
                </button>
                <button className="btn btn-primary" onClick={handleBuyNow}>
                  Buy Now
                </button>
              </div>
              {added && (
                <button className="btn btn-ghost pdp-goto-cart" onClick={() => navigate(`${basePath}/cart`)}>
                  Go to cart →
                </button>
              )}
            </>
          )}

          <ul className="pdp-assurances">
            <li>Free delivery on orders above {formatMoney(FREE_SHIPPING_THRESHOLD)}</li>
            <li>Easy returns</li>
            <li>Secure checkout</li>
          </ul>
        </div>
      </div>

      <div className="pdp-tabs-section">
        <div className="tab-strip">
          {[
            { id: "description", label: "Description" },
            { id: "specification", label: "Specification" },
            { id: "reviews", label: `Ratings & Reviews${reviewSummary.count ? ` (${reviewSummary.count})` : ""}` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab-strip-item ${activeTab === t.id ? "tab-strip-item-active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="tab-strip-content">
          {activeTab === "description" && (
            <p className="product-description">{product.description || "No description provided for this product yet."}</p>
          )}

          {activeTab === "specification" && (
            <dl className="pdp-spec-list">
              {product.sku && (
                <>
                  <dt>SKU</dt>
                  <dd>{product.sku}</dd>
                </>
              )}
              {product.category_id?.name && (
                <>
                  <dt>Category</dt>
                  <dd>{product.category_id.name}</dd>
                </>
              )}
              {product.weight_kg != null && (
                <>
                  <dt>Weight</dt>
                  <dd>{product.weight_kg} kg</dd>
                </>
              )}
              {(product.length_cm || product.width_cm || product.height_cm) && (
                <>
                  <dt>Dimensions (L × W × H)</dt>
                  <dd>
                    {product.length_cm || "—"} × {product.width_cm || "—"} × {product.height_cm || "—"} cm
                  </dd>
                </>
              )}
              {!product.sku &&
                !product.weight_kg &&
                !product.length_cm &&
                !product.width_cm &&
                !product.height_cm && <p className="muted">No specifications added for this product yet.</p>}
            </dl>
          )}

          {activeTab === "reviews" && (
            <div className="product-reviews-section">
              <div className="review-summary-row">
                <div className="review-summary-score">
                  <div className="review-summary-number">{reviewSummary.average_rating || "—"}</div>
                  <StarRating value={reviewSummary.average_rating} size={16} />
                  <div className="muted">{reviewSummary.count} review{reviewSummary.count === 1 ? "" : "s"}</div>
                </div>

                <div className="review-summary-breakdown">
                  {[5, 4, 3, 2, 1].map((n) => {
                    const count = reviewSummary.breakdown?.[n] || 0;
                    const pct = reviewSummary.count ? Math.round((count / reviewSummary.count) * 100) : 0;
                    return (
                      <div className="review-breakdown-row" key={n}>
                        <span>{n}★</span>
                        <div className="review-breakdown-bar">
                          <div className="review-breakdown-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="muted">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <details className="review-form-wrap">
              <summary className="btn btn-ghost">Write a review</summary>
              <form className="review-form" onSubmit={handleSubmitReview}>
                <StarInput value={myRating} onChange={setMyRating} />
                <input
                  className="input"
                  placeholder="Review title (optional)"
                  value={myTitle}
                  onChange={(e) => setMyTitle(e.target.value)}
                  maxLength={120}
                />
                <textarea
                  className="input"
                  placeholder="Share your experience with this product…"
                  rows={3}
                  value={myComment}
                  onChange={(e) => setMyComment(e.target.value)}
                  maxLength={2000}
                />
                <ErrorBox message={reviewError} />
                {reviewSuccess && <SuccessBox message={reviewSuccess} />}
                <button className="btn btn-primary" type="submit" disabled={reviewSubmitting}>
                  {reviewSubmitting ? "Submitting…" : "Submit review"}
                </button>
              </form>
              </details>

              {reviewsLoading ? (
                <Loading label="Loading reviews…" />
              ) : reviews.length === 0 ? (
                <p className="muted">No reviews yet — be the first to share your thoughts.</p>
              ) : (
                <div className="review-list">
                  {reviews.map((r) => (
                    <div className="review-card" key={r._id}>
                      <StarRating value={r.rating} />
                      {r.title && <div className="review-card-title">{r.title}</div>}
                      {r.comment && <p className="review-card-comment">{r.comment}</p>}
                      <div className="review-card-footer">
                        <span className="review-card-author">{r.customer_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <div className="store-section">
          <h2 className="store-section-title">You may also like</h2>
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard key={p._id} product={p} basePath={basePath} slug={slug} onNeedLogin={() => setShowLogin(true)} />
            ))}
          </div>
        </div>
      )}

      {showLogin && (
        <CustomerLoginModal
          onClose={() => {
            setShowLogin(false);
            setPendingAction(null);
          }}
          onSuccess={() => {
            setShowLogin(false);
            refreshAddresses().catch(() => {});
            if (pendingAction === "buy") navigate(`${basePath}/checkout`);
            setPendingAction(null);
          }}
        />
      )}
    </div>
  );
}
