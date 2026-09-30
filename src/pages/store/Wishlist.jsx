import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client, { resolveMediaUrl, removeFromWishlist } from "../../api/client";
import { useCustomerAuth } from "../../context/CustomerAuthContext";
import CustomerLoginModal from "../../components/CustomerLoginModal";
import { useCart } from "../../context/CartContext";
import { Loading, EmptyState } from "../../components/Ui";
import { formatMoney } from "../../utils/format";
import { useStoreSlug } from "../../context/StoreSlugContext";

export default function Wishlist() {
  const { slug, basePath } = useStoreSlug();
  const navigate = useNavigate();
  const { isLoggedIn, customer, loading: authLoading, setWishlist } = useCustomerAuth();
  const { addItem } = useCart();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !customer?.wishlist?.length) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all(
      customer.wishlist.map((id) =>
        client.get(`/store/${slug}/products/${id}`).then((r) => r.data).catch(() => null)
      )
    )
      .then((results) => setProducts(results.filter(Boolean)))
      .finally(() => setLoading(false));
  }, [isLoggedIn, customer, slug]);

  const handleRemove = async (productId) => {
    const wishlist = await removeFromWishlist(slug, productId).catch(() => null);
    setProducts((prev) => prev.filter((p) => p._id !== productId));
    if (wishlist) setWishlist(wishlist);
  };

  const handleBuyAll = () => {
    products.forEach((p) => addItem(p, 1));
    navigate(`${basePath}/cart`);
  };

  if (authLoading) return <Loading />;

  if (!isLoggedIn) {
    return (
      <div className="wishlist-page">
        <h1>Your wishlist</h1>
        <EmptyState>
          <p>Log in to see items you've saved — your wishlist follows you across any device.</p>
          <button className="btn btn-primary" onClick={() => setShowLogin(true)}>
            Log in
          </button>
        </EmptyState>
        {showLogin && <CustomerLoginModal onClose={() => setShowLogin(false)} onSuccess={() => setShowLogin(false)} />}
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <h1>Your wishlist</h1>
      {loading ? (
        <Loading />
      ) : products.length === 0 ? (
        <EmptyState>Nothing saved yet — tap the heart on any product to add it here.</EmptyState>
      ) : (
        <>
          <div className="wishlist-list">
            {products.map((p) => (
              <div className="wishlist-row" key={p._id}>
                <Link to={`${basePath}/product/${p._id}`} className="wishlist-row-thumb">
                  {p.images?.[0] ? (
                    <img src={resolveMediaUrl(p.images[0])} alt={p.name} />
                  ) : (
                    <div className="product-thumb-placeholder">{p.name?.[0] || "?"}</div>
                  )}
                </Link>
                <Link to={`${basePath}/product/${p._id}`} className="wishlist-row-info">
                  <div className="wishlist-row-name">{p.name}</div>
                </Link>
                <div className="wishlist-row-price">{formatMoney(p.price)}</div>
                <div className="wishlist-row-actions">
                  <button className="btn btn-primary" onClick={() => addItem(p, 1)}>
                    Add to cart
                  </button>
                  <button className="btn btn-ghost" onClick={() => handleRemove(p._id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div className="cart-summary-line">
              <span>Items</span>
              <strong>{products.length}</strong>
            </div>
            <div className="cart-summary-line total">
              <span>Total</span>
              <strong>{formatMoney(products.reduce((sum, p) => sum + (p.price || 0), 0))}</strong>
            </div>
            <button className="btn btn-primary btn-block" onClick={handleBuyAll}>
              Buy all
            </button>
          </div>
        </>
      )}
    </div>
  );
}
