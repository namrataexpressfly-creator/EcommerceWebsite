import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import gsap from "gsap";

import client, { uploadLogoImage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import SellerAuthShell from "../../components/SellerAuthShell";
import { slugify } from "../../utils/format";
import {
  firstError,
  isRequired,
  isValidEmail,
  isValidPhone,
  digitsOnly,
} from "../../utils/validate";



function strength(password) {
  let score = 0;

  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

  return score;
}

const LEVELS = [
  "Too short",
  "Weak",
  "Okay",
  "Good",
  "Strong",
];



const Arrow = () => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M4 10h12M11 5l5 5-5 5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);



const EyeIcon = ({ open }) =>
  open ? (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 3l14 14M8.6 8.7a2.2 2.2 0 0 0 3 3M6 6.2C4 7.5 2.7 9.3 2.3 10c1.3 2.4 4.1 5.3 7.7 5.3 1.3 0 2.5-.3 3.6-.9M10 4.7c3.6 0 6.4 2.9 7.7 5.3-.4.8-1.1 1.8-2 2.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.3 10S5.1 4.7 10 4.7 17.7 10 17.7 10 14.9 15.3 10 15.3 2.3 10 2.3 10z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <circle
        cx="10"
        cy="10"
        r="2.3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );


export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const fileRef = useRef(null);
  const errorRef = useRef(null);


  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    store_name: "",
    store_slug: "",
  });

  const [slugTouched, setSlugTouched] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");



  const set = (key) => (e) => {
    const value = e.target.value;

    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };



  const setStoreName = (e) => {
    const value = e.target.value;

    setForm((current) => ({
      ...current,
      store_name: value,

      ...(slugTouched
        ? {}
        : {
          store_slug: slugify(value),
        }),
    }));
  };


  const pickLogo = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;


    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }


    if (file.size > 5 * 1024 * 1024) {
      setError("Logo image must be smaller than 5MB.");
      return;
    }

    setError("");
    setLogoFile(file);


    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }

    setLogoPreview(URL.createObjectURL(file));
  };


  const removeLogo = () => {
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }

    setLogoFile(null);
    setLogoPreview("");

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };



  useEffect(() => {
    return () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);



  useEffect(() => {
    if (
      error &&
      errorRef.current &&
      !window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ) {
      gsap.fromTo(
        errorRef.current,
        {
          x: -8,
        },
        {
          x: 0,
          duration: 0.6,
          ease: "elastic.out(1, 0.25)",
        }
      );
    }
  }, [error]);


  const validateForm = () => {
    return firstError([
      [
        !isRequired(form.name),
        "Please enter your name.",
      ],

      [
        !isRequired(form.email),
        "Please enter your email address.",
      ],

      [
        isRequired(form.email) &&
        !isValidEmail(form.email),
        "Please enter a valid email address.",
      ],

      [
        !isRequired(form.phone),
        "Please enter your phone number.",
      ],

      [
        isRequired(form.phone) &&
        !isValidPhone(form.phone),
        "Please enter a valid 10-digit phone number.",
      ],

      [
        !isRequired(form.password),
        "Please enter a password.",
      ],

      [
        isRequired(form.password) &&
        form.password.length < 6,
        "Password needs to be at least 6 characters.",
      ],

      [
        !isRequired(form.store_name),
        "Please enter your store name.",
      ],

      [
        !isRequired(form.store_slug),
        "Please enter a store address (slug).",
      ],
    ]);
  };



  const submit = async (e) => {
    e.preventDefault();

    setError("");


    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {

      await register(form);


      if (logoFile) {
        try {
          const url = await uploadLogoImage(
            logoFile
          );

          await client.put(
            "/seller/storefront",
            {
              logo_url: url,
            }
          );
        } catch (logoError) {

          console.error(
            "Logo upload failed:",
            logoError
          );
        }
      }


      navigate("/seller/kyc");
    } catch (err) {
      setError(
        err?.message ||
        "Unable to create your store."
      );
    } finally {
      setLoading(false);
    }
  };


  const score = form.password
    ? strength(form.password)
    : -1;



  const storeUrl = `${window.location.origin
    }/store/${form.store_slug || "your-store"
    }`;


  return (
    <SellerAuthShell
      wide
      eyebrow="Create your store"
      headline="Start selling online in minutes, not weeks."
      lead="Set up your account, name your store and you're ready to add products and take orders."
      points={[
        "Your own store website, ready to share",
        "Orders, shipping and payouts in one dashboard",
        "Verify once and start getting paid",
      ]}
      chips={[
        "No coding needed",
      ]}
    >


      <h1 className="slp-anim">
        Create your store
      </h1>

      <p className="slp-sub slp-anim">
        Enter your details to create your
        seller account.
      </p>


      <form
        onSubmit={submit}
        noValidate
      >


        <div className="slp-field">
          <input
            id="rg-name"
            autoFocus
            autoComplete="name"
            placeholder=" "
            value={form.name}
            onChange={set("name")}
          />

          <label htmlFor="rg-name">
            Your name
          </label>
        </div>


        <div className="slp-field">
          <input
            id="rg-email"
            type="email"
            autoComplete="email"
            placeholder=" "
            value={form.email}
            onChange={set("email")}
          />

          <label htmlFor="rg-email">
            Email
          </label>
        </div>



        <div className="slp-field slp-prefixed phone-field">
          <span className="slp-pfx">+91</span>

          <input
            id="rg-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={10}
            placeholder=" "
            value={form.phone}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                phone: digitsOnly(e.target.value, 10),
              }))
            }
          />

          <label htmlFor="rg-phone">
            Phone number
          </label>
        </div>


        <div className="slp-field">
          <input
            id="rg-pass"
            type={
              showPw
                ? "text"
                : "password"
            }
            autoComplete="new-password"
            placeholder=" "
            value={form.password}
            onChange={set("password")}
          />

          <label htmlFor="rg-pass">
            Password
          </label>

          <button
            type="button"
            className="slp-eye"
            onClick={() =>
              setShowPw(
                (current) => !current
              )
            }
            aria-label={
              showPw
                ? "Hide password"
                : "Show password"
            }
          >
            <EyeIcon
              open={showPw}
            />
          </button>
        </div>



        {form.password && (
          <div
            className="slp-meter"
            aria-live="polite"
          >
            <div className="slp-meter-bars">
              {[0, 1, 2, 3].map(
                (i) => (
                  <span
                    key={i}
                    className={
                      i < score
                        ? `on lvl-${score}`
                        : ""
                    }
                  />
                )
              )}
            </div>

            <span className="slp-meter-text">
              {LEVELS[score]}
            </span>
          </div>
        )}



        <div className="slp-field">
          <input
            id="rg-store"
            autoComplete="organization"
            placeholder=" "
            value={form.store_name}
            onChange={setStoreName}
          />

          <label htmlFor="rg-store">
            Store name
          </label>
        </div>


        <div className="slp-field slp-prefixed slug-field">
          <span className="slp-pfx">/store/</span>

          <input
            id="rg-slug"
            type="text"
            placeholder=" "
            value={form.store_slug}
            onChange={(e) => {
              setSlugTouched(true);

              setForm((f) => ({
                ...f,
                store_slug: slugify(e.target.value),
              }));
            }}
          />

          <label htmlFor="rg-slug">
            Store address
          </label>
        </div>



        <div className="slp-urlbox">
          <span>
            Your store will be live at
          </span>

          <strong>
            {storeUrl}
          </strong>
        </div>



        <span className="slp-label">
          Store logo{" "}
          <em>
            (optional)
          </em>
        </span>



        <div className="slp-upload">

          {logoPreview ? (
            <>
              <img
                src={logoPreview}
                alt="Store logo preview"
              />

              <div className="slp-upload-text">
                <strong>
                  {logoFile?.name}
                </strong>

                <button
                  type="button"
                  onClick={removeLogo}
                >
                  Remove
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="slp-upload-drop"
              onClick={() =>
                fileRef.current?.click()
              }
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12 16V5M12 5l-4 4M12 5l4 4M5 16v2.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <span>
                + Add store logo
                (optional)
              </span>

              <small>
                PNG or JPG, square works best
              </small>
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            hidden
            onChange={pickLogo}
          />
        </div>


        {error && (
          <div
            className="slp-error"
            role="alert"
            ref={errorRef}
          >
            {error}
          </div>
        )}



        <div className="slp-actions slp-anim">
          <button
            type="submit"
            className="slp-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="slp-spin" />
                Creating your store…
              </>
            ) : (
              <>
                Create store
                <Arrow />
              </>
            )}
          </button>
        </div>
      </form>



      <p className="slp-reg slp-anim">
        Already have a store?{" "}
        <Link to="/seller/login">
          Sign in
        </Link>
      </p>
    </SellerAuthShell>
  );
}