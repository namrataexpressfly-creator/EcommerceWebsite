import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useCustomerAuth } from "../../context/CustomerAuthContext";
import CustomerLoginModal from "../../components/CustomerLoginModal";
import { EmptyState, ErrorBox } from "../../components/Ui";
import { formatMoney } from "../../utils/format";
import { FREE_SHIPPING_THRESHOLD } from "../../utils/shop";
import { useStoreSlug } from "../../context/StoreSlugContext";
import client, { resolveMediaUrl } from "../../api/client";

export default function Cart() {
  const { slug, basePath } = useStoreSlug();
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, subtotal } = useCart();
  const { isLoggedIn, refreshAddresses } = useCustomerAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [checkingStock, setCheckingStock] = useState(false);
  const [stockError, setStockError] = useState("");

  const handleCheckout = async () => {
    if (!isLoggedIn) {
      setShowLogin(true);
      return;
    }


    setStockError("");
    setCheckingStock(true);
    try {
      await client.post("/checkout/init", {
        slug,
        items: items.map((i) => ({
          product_id: i.product_id,
          combination_id: i.combination_id || undefined,
          quantity: i.quantity,
        })),
      });
      navigate(`${basePath}/checkout`);
    } catch (err) {
      setStockError(err.response?.data?.error || err.message || "Something in your cart is no longer available.");
    } finally {
      setCheckingStock(false);
    }
  };

  const freeShipping = subtotal > FREE_SHIPPING_THRESHOLD;
  const shipRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD + 1 - subtotal);
  const shipProgress = freeShipping ? 100 : Math.min(100, Math.round((subtotal / (FREE_SHIPPING_THRESHOLD + 1)) * 100));

  if (items.length === 0) {
    return (
      <EmptyState>
        Your cart is empty.{" "}
        <Link to={basePath || "/"} className="link">
          Continue shopping →
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="cart-page">
      <h1>Your cart</h1>
      <div className="cart-layout">
      <div className="cart-list">
        {items.map((item) => (
          <div className="cart-row" key={`${item.product_id}:${item.combination_id || ""}`}>
            <div className="cart-row-thumb">
              {item.image ? (
                <img src={resolveMediaUrl(item.image)} alt={item.name} />
              ) : (
                <div className="product-thumb-placeholder">{item.name?.[0]}</div>
              )}
            </div>
            <div className="cart-row-info">
              <div className="product-name">{item.name}</div>
              {item.variant_label && <div className="muted small">{item.variant_label}</div>}
              <div className="muted">{formatMoney(item.price)} each</div>
            </div>
            <input
              type="number"
              min="1"
              className="input qty-input"
              value={item.quantity}
              onChange={(e) => updateQuantity(item.product_id, Number(e.target.value), item.combination_id)}
            />
            <div className="cart-row-total">{formatMoney(item.price * item.quantity)}</div>
            <button className="btn btn-ghost" onClick={() => removeItem(item.product_id, item.combination_id)}>
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <h2 className="cart-summary-title">Order summary</h2>
        <div className="cart-ship">
          <div className="cart-ship-text">
            {freeShipping ? (
              "You've unlocked free delivery"
            ) : (
              <>
                Add <strong>{formatMoney(shipRemaining)}</strong> more for free delivery
              </>
            )}
          </div>
          <div className="cart-ship-bar">
            <div style={{ width: `${shipProgress}%` }} />
          </div>
        </div>
        <div className="cart-summary-line">
          <span>Subtotal</span>
          <strong>{formatMoney(subtotal)}</strong>
        </div>
        <p className="muted">Discounts, tax, shipping and coupons are applied at checkout.</p>
        <ErrorBox message={stockError} />
        <button className="btn btn-primary btn-block" onClick={handleCheckout} disabled={checkingStock}>
          {checkingStock ? "Checking stock…" : "Proceed to checkout"}
        </button>
      </div>
      </div>

      {showLogin && (
        <CustomerLoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => {
            setShowLogin(false);
            refreshAddresses().catch(() => {});
            handleCheckout();
          }}
        />
      )}
    </div>
  );
}
