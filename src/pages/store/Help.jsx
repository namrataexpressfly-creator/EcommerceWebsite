import { Link } from "react-router-dom";
import { useStoreSlug } from "../../context/StoreSlugContext";
import { useCustomerAuth } from "../../context/CustomerAuthContext";

export default function Help() {
  const { basePath } = useStoreSlug();
  const { isLoggedIn } = useCustomerAuth();

  return (
    <div className="store-page">
      <div className="page-header">
        <h1>Help & Support</h1>
      </div>

      <section className="panel form-panel">
        <p className="muted">
          Here's the fastest way to get help, depending on what you need.
        </p>

        <div className="help-links">
          {isLoggedIn && (
            <Link to={`${basePath}/my-conversations`} className="help-link-card">
              <strong>My conversations</strong>
              <span className="muted small">
                See every issue you've reported and your full conversation history with the seller.
              </span>
            </Link>
          )}

          <Link to={`${basePath}/track`} className="help-link-card">
            <strong>Track an order</strong>
            <span className="muted small">
              Enter your tracking token to see order status, delivery updates, and report an issue.
            </span>
          </Link>

          <Link to={`${basePath}/faqs`} className="help-link-card">
            <strong>Browse FAQs</strong>
            <span className="muted small">Answers to common questions about shipping, payments, and returns.</span>
          </Link>

          <Link to={`${basePath}/Contactus`} className="help-link-card">
            <strong>Contact us</strong>
            <span className="muted small">Send a message directly if you can't find what you're looking for.</span>
          </Link>
        </div>

        {!isLoggedIn && (
          <p className="muted small" style={{ marginTop: 12 }}>
            Log in from Track Order or My Account to see your full conversation history with the seller.
          </p>
        )}
      </section>
    </div>
  );
}
