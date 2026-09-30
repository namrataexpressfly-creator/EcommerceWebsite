import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { resolveMediaUrl, addToWishlist, removeFromWishlist } from "../api/client";
import { formatMoney } from "../utils/format";
import { discountPercent } from "../utils/shop";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { useCart } from "../context/CartContext";
import QuickAddModal from "./QuickAddModal";
import CustomerLoginModal from "./CustomerLoginModal";

export default function ProductCard({ product, basePath, slug, badge, onNeedLogin }) {
  const { isLoggedIn, customer, setWishlist } = useCustomerAuth();
  const [wishlisted, setWishlisted] = useState(false);
  const [busy, setBusy] = useState(false);

  const navigate = useNavigate();
  const { addItem } = useCart();
  const [quickOpen, setQuickOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1800);
    return () => clearTimeout(t);
  }, [added]);

  useEffect(() => {
    setWishlisted(Boolean(customer?.wishlist?.some((id) => String(id) === String(product._id))));
  }, [customer, product._id]);

  const toggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      onNeedLogin?.();
      return;
    }

    setBusy(true);
    try {
      if (wishlisted) {
        const wishlist = await removeFromWishlist(slug, product._id);
        setWishlisted(false);
        setWishlist(wishlist);
      } else {
        const wishlist = await addToWishlist(slug, product._id);
        setWishlisted(true);
        setWishlist(wishlist);
      }
    } catch {
  
    } finally {
      setBusy(false);
    }
  };

  const off = discountPercent(product.price, product.compare_at_price);
  const soldOut = product.stock_qty <= 0;
  const isVariable = product.product_type === "variable" && (product.variants || []).length > 0;


  const stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const goToCheckout = () => {
    if (isLoggedIn) navigate(`${basePath}/checkout`);
    else setShowLogin(true); 
  };

  const handleAddToCart = (e) => {
    stop(e);
    if (soldOut) return;
    if (isVariable) return setQuickOpen(true); 
    addItem(product, 1, null);
    setAdded(true);
  };

  const handleBuyNow = (e) => {
    stop(e);
    if (soldOut) return;
    if (isVariable) return setQuickOpen(true);
    addItem(product, 1, null);
    goToCheckout();
  };

  return (
    <>
    <Link to={`${basePath}/product/${product._id}`} className={`product-card${soldOut ? " is-sold-out" : ""}`}>
      <div className="product-thumb">
        {(badge || off > 0) && (
          <div className="product-badges">
            {badge && <span className="product-badge">{badge}</span>}
            {off > 0 && <span className="product-badge product-badge-sale">-{off}%</span>}
          </div>
        )}

        <button
          type="button"
          className={`product-card-wishlist ${wishlisted ? "product-card-wishlist-active" : ""}`}
          onClick={toggleWishlist}
          disabled={busy}
          title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          {wishlisted ? "♥" : "♡"}
        </button>

        {product.images?.[0] ? (
          <img src={resolveMediaUrl(product.images[0])} alt={product.name} />
        ) : (
          <div className="product-thumb-placeholder">{product.name?.[0] || "?"}</div>
        )}

        {soldOut && <span className="product-soldout">Out of stock</span>}
      </div>

      <div className="product-card-body">
        {product.category_id?.name && (
          <div className="product-card-category">{product.category_id.name}</div>
        )}

        <div className="product-name">{product.name}</div>

        <div className="product-price">
          {formatMoney(product.price)}
          {product.compare_at_price ? (
            <span className="product-compare">{formatMoney(product.compare_at_price)}</span>
          ) : null}
        </div>

        <div className="product-card-actions">
          <button type="button" className="btn btn-ghost product-card-btn" onClick={handleAddToCart} disabled={soldOut}>
            {added ? "Added ✓" : "Add to cart"}
          </button>
          <button type="button" className="btn btn-primary product-card-btn" onClick={handleBuyNow} disabled={soldOut}>
            Buy now
          </button>
        </div>
      </div>
    </Link>

    {quickOpen && (
      <QuickAddModal
        product={product}
        onClose={() => setQuickOpen(false)}
        onAddToCart={(combo, qty) => {
          addItem(product, qty, combo);
          setQuickOpen(false);
          setAdded(true);
        }}
        onBuyNow={(combo, qty) => {
          addItem(product, qty, combo);
          setQuickOpen(false);
          goToCheckout();
        }}
      />
    )}

    {showLogin && (
      <CustomerLoginModal
        onClose={() => setShowLogin(false)}
        onSuccess={() => {
          setShowLogin(false);
          navigate(`${basePath}/checkout`);
        }}
      />
    )}
    </>
  );
}
