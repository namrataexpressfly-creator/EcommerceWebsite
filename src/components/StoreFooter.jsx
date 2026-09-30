import { useState } from "react";
import { Link } from "react-router-dom";
import client, { resolveMediaUrl } from "../api/client";
import { SOCIAL_LABELS, activeSocialLinks, normalizeSocialUrl } from "../utils/social";
import { SocialIcon } from "./SocialIcons";
import { isRequired, isValidEmail } from "../utils/validate";

export default function StoreFooter({ slug, basePath = "", storeName, logoUrl, socialLinks }) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubscribe = async (e) => {
    e.preventDefault();

    if (!isRequired(email)) {
      setError("Please enter your email address.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await client.post(
        `/store/${slug}/newsletter`,
        {
          email,
        }
      );

      console.log("Newsletter response:", response.data);

      setSubscribed(true);
      setEmail("");
    } catch (err) {
      console.error(
        "Newsletter subscription error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to subscribe. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const year = new Date().getFullYear();

  return (
    <footer className="store-footer-full">
      <div className="store-footer-inner">

   
        <div className="footer-col footer-col-brand">
          <div className="brand footer-brand">
            {logoUrl && <img src={resolveMediaUrl(logoUrl)} alt={storeName} className="brand-logo" />}
            {storeName || "Expressfly"}
          </div>

          <p className="muted small">
            Quality products, packed with care and
            delivered to your door.
          </p>

          {activeSocialLinks(socialLinks).length > 0 && (
            <div className="footer-social-links">
              {activeSocialLinks(socialLinks)
                .map(([key, url]) => (
                  <a
                    key={key}
                    href={normalizeSocialUrl(url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-social-icon"
                    title={SOCIAL_LABELS[key] || key}
                    aria-label={SOCIAL_LABELS[key] || key}
                  >
                    <SocialIcon platform={key} size={16} />
                  </a>
                ))}
            </div>
          )}
        </div>


        <div className="footer-col">
          <div className="footer-col-title">
            Shop
          </div>

          <Link to={basePath || "/"}>
            All products
          </Link>

          <Link to={`${basePath}/cart`}>
            Cart
          </Link>

          <Link to={`${basePath}/Aboutus`}>
            About us
          </Link>
             <Link to={`${basePath}/Privacy`}>
            Privacy Policy
          </Link>

          <Link to={`${basePath}/Contactus`}>
            Contact us
          </Link>

          <Link to={`${basePath}/track`}>
            Track your order
          </Link>
        </div>

  
        <div className="footer-col">
          <div className="footer-col-title">
            Support
          </div>

          <Link to={`${basePath}/track`}>
            Order status
          </Link>

          <span className="muted small">
            Cash on delivery available
          </span>

          <span className="muted small">
            Secure online payment
          </span>

          <Link to={`${basePath}/faqs`}>
            FAQs
          </Link>
          <Link to={`${basePath}/help`}>
            Help & Support
          </Link>

         <Link to="/seller/login">
              Seller login
            </Link>
        </div>

        <div className="footer-col footer-col-newsletter">

          <div className="footer-col-title">
            Stay in the loop
          </div>

          <p className="muted small">
            New arrivals and offers, straight to your
            inbox.
          </p>

          {subscribed ? (
            <p className="success-box">
              Thanks — you're on the list.
            </p>
          ) : (
            <>
              <form
                className="newsletter-form"
                onSubmit={handleSubscribe}
              >
                <input
                  type="email"
                  required
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  disabled={loading}
                />

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading
                    ? "Subscribing..."
                    : "Subscribe"}
                </button>
              </form>

              {error && (
                <p className="error-box">
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="store-footer-bottom">
        <span>
          © {year} {storeName || "Expressfly"}
        </span>

        <span>
          Powered by Expressfly
        </span>
      </div>
    </footer>
  );
}