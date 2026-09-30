import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import { useCart } from "../../context/CartContext";
import { useCustomerAuth } from "../../context/CustomerAuthContext";
import CustomerLoginModal from "../../components/CustomerLoginModal";
import AddressSidebar from "../../components/AddressSidebar";
import { ErrorBox } from "../../components/Ui";
import { formatMoney } from "../../utils/format";
import { useStoreSlug } from "../../context/StoreSlugContext";
import { digitsOnly } from "../../utils/validate";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Checkout() {
  const { slug, basePath } = useStoreSlug();
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const { isLoggedIn, loading: authLoading, customer, refreshAddresses } = useCustomerAuth();

  const [storeName, setStoreName] = useState("");
  useEffect(() => {
    if (!slug) return;
    client
      .get(`/store/${slug}`)
      .then(({ data }) => setStoreName(data?.store_name || ""))
      .catch(() => {});
  }, [slug]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [showLoginGate, setShowLoginGate] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressSidebar, setShowAddressSidebar] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");

  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [pricing, setPricing] = useState({ subtotal: null, item_discount: 0, tax: 0 });

  const [initError, setInitError] = useState("");
  const [initBlocked, setInitBlocked] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [paymentSettings, setPaymentSettings] = useState({
    cod_enabled: true,
    online_enabled: true,
    cod_extra_charge: 0,
    cod_min_order_value: 0,
    cod_max_order_value: 0,
  });

  useEffect(() => {
    if (!slug) return;
    client
      .get(`/store/${slug}`)
      .then(({ data }) => {
        if (data?.payment_settings) {
          setPaymentSettings((prev) => ({ ...prev, ...data.payment_settings }));
        }
      })
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!paymentSettings.cod_enabled && paymentMethod === "cod") {
      setPaymentMethod("online");
    } else if (!paymentSettings.online_enabled && paymentMethod === "online") {
      setPaymentMethod("cod");
    }
  }, [paymentSettings]);

  useEffect(() => {
    if (items.length === 0) navigate(`${basePath}/cart`);
    
  }, []);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) setShowLoginGate(true);
  }, [authLoading, isLoggedIn]);

  useEffect(() => {
    if (!customer) return;
    setForm((f) => ({
      ...f,
      name: f.name || customer.name || "",
      email: f.email || customer.email || "",
      phone: customer.phone || f.phone,
    }));
    setOtpVerified(true);

    const defaultAddress = customer.addresses?.find((a) => a.is_default) || customer.addresses?.[0];
    if (defaultAddress && !selectedAddressId) {
      setSelectedAddressId(defaultAddress._id);
    }
   
  }, [customer]);

  const savedAddresses = customer?.addresses || [];
  const selectedAddress = savedAddresses.find((a) => a._id === selectedAddressId);
  const usingSavedAddress = isLoggedIn && Boolean(selectedAddress);

  const cartItems = items.map((i) => ({
    product_id: i.product_id,
    combination_id: i.combination_id || undefined,
    quantity: i.quantity,
  }));

  useEffect(() => {
    if (!slug || items.length === 0) return;
    client
      .post("/checkout/init", { slug, items: cartItems })
      .then(({ data }) => {
        setInitError("");
        setInitBlocked(false);
        setPricing({ subtotal: data.subtotal, item_discount: data.item_discount || 0, tax: data.tax || 0 });
      })
      .catch((err) => {
        const status = err.response?.status;
        setInitError(err.response?.data?.error || err.message);
        setInitBlocked(status >= 400 && status < 500);
      });
  }, [slug, items]);

  const listSubtotal = pricing.subtotal ?? subtotal;
  const itemDiscount = pricing.item_discount;
  const tax = pricing.tax;
  const shipping = subtotal > 999 ? 0 : 49;
  const codCharge = paymentMethod === "cod" ? Number(paymentSettings.cod_extra_charge || 0) : 0;
  const total = Math.max(0, listSubtotal - itemDiscount - discount + tax + shipping + codCharge);

  const codBelowMin =
    paymentMethod === "cod" &&
    paymentSettings.cod_min_order_value > 0 &&
    subtotal < paymentSettings.cod_min_order_value;
  const codAboveMax =
    paymentMethod === "cod" &&
    paymentSettings.cod_max_order_value > 0 &&
    subtotal > paymentSettings.cod_max_order_value;
  const codBlocked = codBelowMin || codAboveMax;

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const sendOtp = async () => {
    setError("");
    setOtpMessage("");
    if (!form.phone) return setError("Enter a phone number first.");
    try {
      await client.post("/checkout/otp/send", { phone: form.phone });
      setOtpSent(true);
      setOtpMessage("We've sent a code to your phone.");
    } catch (err) {
      setError(err.message);
    }
  };

  const verifyOtp = async () => {
    setError("");
    try {
      await client.post("/checkout/otp/verify", { phone: form.phone, otp });
      setOtpVerified(true);
      setOtpMessage("Phone number verified.");
    } catch (err) {
      setOtpVerified(false);
      setError(err.message);
    }
  };

  const applyCoupon = async () => {
    setError("");
    setCouponMessage("");
    if (!couponCode) return;
    try {
      const { data } = await client.post("/checkout/coupon/apply", {
        slug,
        code: couponCode,
        subtotal: listSubtotal - itemDiscount,
        items: cartItems,
      });
      setDiscount(data.discount);
      setCouponMessage(`Coupon applied: -${formatMoney(data.discount)}`);
    } catch (err) {
      setDiscount(0);
      setError(err.message);
    }
  };

  const placeOrder = async () => {
    setError("");

    const addressPayload = usingSavedAddress
      ? {
          label: selectedAddress.label,
          line1: selectedAddress.line1,
          line2: selectedAddress.line2,
          city: selectedAddress.city,
          state: selectedAddress.state,
          pincode: selectedAddress.pincode,
        }
      : {
          line1: form.line1,
          line2: form.line2,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
        };

    if (!form.name || !form.phone) {
      setError("Please fill in your name and phone number.");
      return;
    }
    if (form.phone.length !== 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    if (!usingSavedAddress && (!form.line1 || !form.city || !form.state || !form.pincode)) {
      setError("Please fill in your full address.");
      return;
    }
    if (!usingSavedAddress && form.pincode.length !== 6) {
      setError("PIN code should be exactly 6 digits.");
      return;
    }

    setPlacing(true);
    try {
      const { data } = await client.post("/checkout/order", {
        slug,
        items: cartItems,
        address: addressPayload,
        phone: form.phone,
        name: form.name,
        email: form.email,
        payment_method: paymentMethod,
        coupon_code: couponCode || undefined,
        otp_verified: otpVerified,
      });

      if (paymentMethod === "cod") {
        clearCart();
        navigate(`${basePath}/track/${data.tracking_token}`);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        setError("Could not load Razorpay checkout. Try Cash on Delivery instead.");
        return;
      }

      const rzp = new window.Razorpay({
        key: data.razorpay_key_id,
        amount: data.amount,
        currency: data.currency,
        order_id: data.razorpay_order_id,
        name: storeName || "Online Store",
        description: `Order for ${slug}`,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        handler: async (response) => {
          try {
            const verifyRes = await client.post("/checkout/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (!verifyRes.data.verified || !verifyRes.data.tracking_token) {
              setError(
                verifyRes.data.error ||
                  "We couldn't confirm your payment. If money was deducted, please contact support — don't retry the payment."
              );
              setPlacing(false);
              return;
            }
            clearCart();
            navigate(`${basePath}/track/${verifyRes.data.tracking_token}`);
          } catch (err) {
            setError(err.message);
            setPlacing(false);
          }
        },
        modal: {
          ondismiss: () => setPlacing(false),
        },
      });
      rzp.open();
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>
      <div className="checkout-grid">
        <div className="checkout-form">
          <section className="checkout-section">
            <h2>Contact</h2>
            <div className="form-row">
              <input className="input" placeholder="Full name" value={form.name} onChange={update("name")} />
              <input className="input" placeholder="Email (optional)" value={form.email} onChange={update("email")} />
            </div>
            {isLoggedIn ? (
              <div className="form-row">
                <input className="input" value={form.phone} disabled />
                <span className="badge badge-confirmed">Verified</span>
              </div>
            ) : (
              <>
                <div className="form-row">
                  <input
                    className="input"
                    placeholder="Phone number"
                    value={form.phone}
                    maxLength={10}
                    inputMode="numeric"
                    onChange={(e) => setForm((f) => ({ ...f, phone: digitsOnly(e.target.value, 10) }))}
                  />
                  {!otpVerified ? (
                    <button className="btn btn-ghost" type="button" onClick={sendOtp}>
                      {otpSent ? "Resend OTP" : "Send OTP"}
                    </button>
                  ) : (
                    <span className="badge badge-confirmed">Verified</span>
                  )}
                </div>
                {otpSent && !otpVerified && (
                  <div className="form-row">
                    <input
                      className="input"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                    <button className="btn btn-ghost" type="button" onClick={verifyOtp}>
                      Verify
                    </button>
                  </div>
                )}
                {otpMessage && <p className="muted small">{otpMessage}</p>}
              </>
            )}
          </section>

          <section className="checkout-section">
            <h2>Shipping address</h2>
            {usingSavedAddress ? (
              <div className="selected-address-box">
                <div className="selected-address-box-text">
                  <strong>{selectedAddress.label || "Address"}</strong>
                  <div>{selectedAddress.line1}{selectedAddress.line2 ? `, ${selectedAddress.line2}` : ""}</div>
                  <div>{selectedAddress.city}, {selectedAddress.state} {selectedAddress.pincode}</div>
                </div>
                <button className="btn btn-ghost" type="button" onClick={() => setShowAddressSidebar(true)}>
                  Change
                </button>
              </div>
            ) : isLoggedIn ? (
              <div className="selected-address-box">
                <div className="selected-address-box-text muted">No saved address yet — add one to speed up checkout next time.</div>
                <button className="btn btn-primary" type="button" onClick={() => setShowAddressSidebar(true)}>
                  Add address
                </button>
              </div>
            ) : (
              <>
                <input className="input" placeholder="Address line 1" value={form.line1} onChange={update("line1")} />
                <input
                  className="input"
                  placeholder="Address line 2 (optional)"
                  value={form.line2}
                  onChange={update("line2")}
                />
                <div className="form-row form-row-3">
                  <input className="input" placeholder="City" value={form.city} onChange={update("city")} />
                  <input className="input" placeholder="State" value={form.state} onChange={update("state")} />
                  <input
                    className="input"
                    placeholder="Pincode"
                    value={form.pincode}
                    maxLength={6}
                    inputMode="numeric"
                    onChange={(e) => setForm((f) => ({ ...f, pincode: digitsOnly(e.target.value, 6) }))}
                  />
                </div>
              </>
            )}
          </section>

          <section className="checkout-section">
            <h2>Coupon</h2>
            <div className="form-row">
              <input
                className="input"
                placeholder="Coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              />
              <button className="btn btn-ghost" type="button" onClick={applyCoupon}>
                Apply
              </button>
            </div>
            {couponMessage && <p className="muted small">{couponMessage}</p>}
          </section>

          <section className="checkout-section">
            <h2>Payment method</h2>
            {paymentSettings.cod_enabled && (
              <label className="radio-row">
                <input
                  type="radio"
                  checked={paymentMethod === "cod"}
                  onChange={() => setPaymentMethod("cod")}
                />
                Cash on delivery
                {paymentSettings.cod_extra_charge > 0 && (
                  <span className="muted small"> (+{formatMoney(paymentSettings.cod_extra_charge)} COD charge)</span>
                )}
              </label>
            )}
            {paymentSettings.online_enabled && (
              <label className="radio-row">
                <input
                  type="radio"
                  checked={paymentMethod === "online"}
                  onChange={() => setPaymentMethod("online")}
                />
                Pay online (Razorpay)
              </label>
            )}
            {codBelowMin && (
              <p className="muted small" style={{ color: "#b45309" }}>
                Cash on Delivery is available on orders above {formatMoney(paymentSettings.cod_min_order_value)}. Please
                pay online or add more items.
              </p>
            )}
            {codAboveMax && (
              <p className="muted small" style={{ color: "#b45309" }}>
                Cash on Delivery is available up to {formatMoney(paymentSettings.cod_max_order_value)}. Please pay
                online for this order.
              </p>
            )}
          </section>

          <ErrorBox message={error} />
        </div>

        <aside className="checkout-summary">
          <h2>Order summary</h2>
          {initError && (
            <>
              <ErrorBox message={initError} />
              {initBlocked && (
                <button type="button" className="btn btn-ghost" onClick={() => navigate(`${basePath}/cart`)}>
                  ← Back to cart
                </button>
              )}
            </>
          )}
          {items.map((i) => (
            <div className="cart-summary-line" key={i.product_id}>
              <span>
                {i.name} × {i.quantity}
              </span>
              <span>{formatMoney(i.price * i.quantity)}</span>
            </div>
          ))}
          <hr />
          <div className="cart-summary-line">
            <span>Subtotal</span>
            <span>{formatMoney(listSubtotal)}</span>
          </div>
          {itemDiscount > 0 && (
            <div className="cart-summary-line">
              <span>Discount</span>
              <span>-{formatMoney(itemDiscount)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="cart-summary-line">
              <span>Coupon discount</span>
              <span>-{formatMoney(discount)}</span>
            </div>
          )}
          {tax > 0 && (
            <div className="cart-summary-line">
              <span>Tax</span>
              <span>{formatMoney(tax)}</span>
            </div>
          )}
          <div className="cart-summary-line">
            <span>Shipping</span>
            <span>{shipping === 0 ? "Free" : formatMoney(shipping)}</span>
          </div>
          {codCharge > 0 && (
            <div className="cart-summary-line">
              <span>COD charge</span>
              <span>{formatMoney(codCharge)}</span>
            </div>
          )}
          <div className="cart-summary-line total">
            <span>Total</span>
            <strong>{formatMoney(total)}</strong>
          </div>
          <button className="btn btn-primary btn-block" disabled={placing || codBlocked || initBlocked} onClick={placeOrder}>
            {placing ? "Placing order…" : "Place order"}
          </button>
        </aside>
      </div>

      {showLoginGate && (
        <CustomerLoginModal
          onClose={() => navigate(`${basePath}/cart`)}
          onSuccess={() => {
            setShowLoginGate(false);
            refreshAddresses().catch(() => {});
          }}
        />
      )}

      {showAddressSidebar && (
        <AddressSidebar
          addresses={savedAddresses}
          selectedId={selectedAddressId}
          onSelect={(id) => setSelectedAddressId(id)}
          onClose={() => setShowAddressSidebar(false)}
        />
      )}
    </div>
  );
}
