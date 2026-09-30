import { useRef, useState } from "react";
import client, { uploadLogoImage } from "../../api/client";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ErrorBox } from "../../components/Ui";
import { slugify } from "../../utils/format";
import { firstError, isRequired, isValidEmail, isValidPhone, digitsOnly } from "../../utils/validate";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    store_name: "",
    store_slug: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const fileRef = useRef(null);

  const pickLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const update = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({
      ...f,
      [key]: value,
      ...(key === "store_name" && !f.store_slug_touched ? { store_slug: slugify(value) } : {}),
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = firstError([
      [!isRequired(form.name), "Please enter your name."],
      [!isRequired(form.email), "Please enter your email address."],
      [isRequired(form.email) && !isValidEmail(form.email), "Please enter a valid email address."],
      [!isRequired(form.phone), "Please enter your phone number."],
      [isRequired(form.phone) && !isValidPhone(form.phone), "Please enter a valid 10-digit phone number."],
      [!isRequired(form.password), "Please enter a password."],
      [isRequired(form.password) && form.password.length < 6, "Password needs to be at least 6 characters."],
      [!isRequired(form.store_name), "Please enter your store name."],
      [!isRequired(form.store_slug), "Please enter a store address (slug)."],
    ]);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await register(form);

      if (logoFile) {
        try {
          const url = await uploadLogoImage(logoFile);
          await client.put("/seller/storefront", { logo_url: url });
        } catch {
   
        }
      }
      navigate("/seller/kyc");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Create your store</h1>
        <input className="input" placeholder="Your name" value={form.name} onChange={update("name")} />
        <input className="input" type="email" placeholder="Email" value={form.email} onChange={update("email")} />
        <input
          className="input"
          placeholder="Phone"
          value={form.phone}
          maxLength={10}
          inputMode="numeric"
          onChange={(e) => setForm((f) => ({ ...f, phone: digitsOnly(e.target.value, 10) }))}
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={update("password")}
        />
        <input className="input" placeholder="Store name" value={form.store_name} onChange={update("store_name")} />

        <label className="logo-picker" onClick={() => fileRef.current?.click()}>
          {logoPreview ? (
            <img src={logoPreview} alt="Store logo preview" />
          ) : (
            <span className="logo-picker-placeholder">+ Add store logo (optional)</span>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickLogo} />
        </label>
        <input
          className="input"
          placeholder="Store slug (e.g. my-store)"
          value={form.store_slug}
          onChange={(e) => setForm((f) => ({ ...f, store_slug: slugify(e.target.value), store_slug_touched: true }))}
        />
        <ErrorBox message={error} />
        <button className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "Creating…" : "Create store"}
        </button>
        <p className="muted small">
          Already have a store? <Link to="/seller/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
