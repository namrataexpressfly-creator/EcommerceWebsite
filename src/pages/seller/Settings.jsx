import { useEffect, useState, lazy, Suspense } from "react";
import client, {
  setCustomDomain,
  verifyCustomDomain,
  removeCustomDomain,
} from "../../api/client";
import {
  Loading,
  ErrorBox,
} from "../../components/Ui";
import SingleImageUploader from "../../components/SingleImageUploader";
import { uploadPageImage, uploadLogoImage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { shadeColor } from "../../utils/format";
import { getLayoutPreset } from "../../utils/layoutPresets";
import { openThemePreview } from "../../utils/shop";
import { digitsOnly } from "../../utils/validate";

const RichTextEditor = lazy(() => import("../../components/RichTextEditor"));

const FONT_OPTIONS = [
  "Fraunces",
  "Inter",
  "Poppins",
  "Playfair Display",
];

const emptyPageForm = {
  about_heading: "",
  about_body: "",
  about_image_url: "",
  contact_heading: "",
  contact_intro: "",
  contact_email: "",
  contact_phone: "",
  contact_address: "",
  contact_map_url: "",
};

const emptyPrivacyForm = {
  privacy_heading: "Privacy Policy",
  privacy_body: "",
};

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const toast = useToast();

  const [templates, setTemplates] = useState([]);
  const [theme, setTheme] = useState(null);
  const [storeSlug, setStoreSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [savingLogo, setSavingLogo] = useState(false);
  const [socialLinks, setSocialLinks] = useState({ facebook: "", instagram: "", twitter: "", youtube: "", whatsapp: "", pinterest: "" });
  const [savingSocial, setSavingSocial] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [applyingTemplateId, setApplyingTemplateId] = useState("");

  const [pageForm, setPageForm] = useState(emptyPageForm);
  const [savingPages, setSavingPages] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const [domainInput, setDomainInput] = useState("");
  const [domainInfo, setDomainInfo] = useState(null); 
  const [savingDomain, setSavingDomain] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [removingDomain, setRemovingDomain] = useState(false);
  const [domainError, setDomainError] = useState("");


  const [privacyForm, setPrivacyForm] =
    useState(emptyPrivacyForm);

  const [savingPrivacy, setSavingPrivacy] =
    useState(false);

  const [faqs, setFaqs] = useState([]);
  const [savingFaqs, setSavingFaqs] = useState(false);



  const flash = (msg) => {
    toast.success(msg);
  };



  const load = () => {
    setLoading(true);
    setError("");

    Promise.all([
      client.get("/seller/storefront/templates"),

      client.get("/seller/storefront"),

      client
        .get("/seller/pages")
        .catch(() => ({
          data: null,
        })),

      client
        .get("/seller/privacy-policy")
        .catch(() => ({
          data: null,
        })),

      client
        .get("/seller/faqs")
        .catch(() => ({
          data: null,
        })),
    ])
      .then(
        ([
          tplRes,
          storeRes,
          pageRes,
          privacyRes,
          faqRes,
        ]) => {
      

          setTemplates(
            tplRes.data?.templates || []
          );

          setTheme(
            storeRes.data?.theme || null
          );

          setLogoUrl(storeRes.data?.logo_url || "");
          setStoreSlug(storeRes.data?.slug || "");

          setSocialLinks((s) => ({ ...s, ...(storeRes.data?.social_links || {}) }));

          setDomainInfo({
            custom_domain: storeRes.data?.custom_domain || null,
            domain_status: storeRes.data?.domain_status || "none",
          });
          setDomainInput(storeRes.data?.custom_domain || "");

          if (pageRes.data) {
            setPageForm({
              ...emptyPageForm,
              ...pageRes.data,
            });
          }

          if (privacyRes.data) {
            setPrivacyForm({
              ...emptyPrivacyForm,
              ...privacyRes.data,
            });
          }

          if (faqRes.data?.faqs) {
            setFaqs(faqRes.data.faqs);
          }
        }
      )
      .catch((err) => {
        console.error(
          "Settings load error:",
          err
        );

        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            err.message ||
            "Failed to load settings"
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const saveDomain = async (e) => {
    e.preventDefault();
    setDomainError("");

    if (!domainInput.trim()) {
      setDomainError("Please enter a domain.");
      return;
    }
    if (!/^([\w-]+\.)+[a-zA-Z]{2,}$/.test(domainInput.trim())) {
      setDomainError("Please enter a valid domain (like example.com).");
      return;
    }

    setSavingDomain(true);
    try {
      const { data } = await setCustomDomain(domainInput.trim());
      setDomainInfo({
        custom_domain: data.custom_domain,
        domain_status: data.domain_status,
        dns_instructions: data.dns_instructions,
      });
      flash("Domain saved. Add the DNS records below, then verify.");
    } catch (err) {
      setDomainError(
        err.response?.data?.error ||
          err.message ||
          "Failed to save domain"
      );
    } finally {
      setSavingDomain(false);
    }
  };

  const runDomainVerify = async () => {
    setVerifyingDomain(true);
    setDomainError("");

    try {
      const { data } = await verifyCustomDomain();
      setDomainInfo((info) => ({
        ...info,
        custom_domain: data.custom_domain,
        domain_status: data.domain_status,
      }));

      if (data.verified) {
        flash("Domain verified — it's live.");
      } else {
        setDomainError(
          "Couldn't confirm the DNS TXT record yet. DNS changes can take a while to propagate — try again in a few minutes."
        );
      }
    } catch (err) {
      setDomainError(
        err.response?.data?.error ||
          err.message ||
          "Failed to verify domain"
      );
    } finally {
      setVerifyingDomain(false);
    }
  };

  const disconnectDomain = async () => {
    setRemovingDomain(true);
    setDomainError("");

    try {
      await removeCustomDomain();
      setDomainInfo({ custom_domain: null, domain_status: "none" });
      setDomainInput("");
      flash("Custom domain disconnected.");
    } catch (err) {
      setDomainError(
        err.response?.data?.error ||
          err.message ||
          "Failed to disconnect domain"
      );
    } finally {
      setRemovingDomain(false);
    }
  };


  const applyTemplate = async (templateId) => {
    setApplyingTemplateId(templateId);
    setError("");

    try {
      const { data } =
        await client.put(
          "/seller/storefront/theme/template",
          {
            template_id: templateId,
          }
        );

      setTheme(data.theme);

      setTemplates((prev) =>
        prev.map((t) => ({
          ...t,
          is_selected:
            t.id === templateId,
        }))
      );

      flash("Template applied.");
    } catch (err) {
      console.error(
        "Apply template error:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to apply template"
      );
    } finally {
      setApplyingTemplateId("");
    }
  };


  const updateThemeField =
    (key) => (e) => {
      const value = e.target.value;

      setTheme((t) => {
        const next = {
          ...t,
          [key]: value,
        };

        if (key === "primary_color") {
          next.primary_dark =
            shadeColor(value, -20);

          next.primary_soft =
            shadeColor(value, 45);
        }

        return next;
      });
    };



  const saveTheme = async (e) => {
    e.preventDefault();

    setSavingTheme(true);
    setError("");

    try {
      const { data } =
        await client.put(
          "/seller/storefront/theme",
          theme
        );

      setTheme(data.theme);

      flash("Theme saved.");
    } catch (err) {
      console.error(
        "Save theme error:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to save theme"
      );
    } finally {
      setSavingTheme(false);
    }
  };

  const updateSocialLink = (key) => (e) => setSocialLinks((s) => ({ ...s, [key]: e.target.value }));

  const saveSocialLinks = async (e) => {
    e.preventDefault();
    setError("");

    const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;
    for (const [key, value] of Object.entries(socialLinks)) {
      if (value && !urlPattern.test(value.trim())) {
        setError(`Please enter a valid URL for ${key}.`);
        return;
      }
    }

    setSavingSocial(true);
    try {
      const { data } = await client.put("/seller/storefront/social-links", socialLinks);
      setSocialLinks((s) => ({ ...s, ...data }));
      flash("Social links saved.");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to save social links");
    } finally {
      setSavingSocial(false);
    }
  };

  const updatePageField =
    (key) => (e) => {
      setPageForm((form) => ({
        ...form,
        [key]: e.target.value,
      }));
    };

 

  const savePages = async (e) => {
    e.preventDefault();
    setError("");

    if (pageForm.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pageForm.contact_email.trim())) {
      setError("Please enter a valid contact email address.");
      return;
    }
    if (pageForm.contact_phone && pageForm.contact_phone.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid 10-digit contact phone number.");
      return;
    }
    if (pageForm.contact_map_url && !/^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i.test(pageForm.contact_map_url.trim())) {
      setError("Please enter a valid map URL.");
      return;
    }

    setSavingPages(true);

    try {
      const { data } =
        await client.put(
          "/seller/pages",
          pageForm
        );

      setPageForm({
        ...emptyPageForm,
        ...data,
      });

      flash(
        "About & Contact pages saved."
      );
    } catch (err) {
      console.error(
        "Save pages error:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to save pages"
      );
    } finally {
      setSavingPages(false);
    }
  };


  const regeneratePages =
    async () => {
      setRegenerating(true);
      setError("");

      try {
        const { data } =
          await client.post(
            "/seller/pages/generate"
          );

        setPageForm({
          ...emptyPageForm,
          ...data,
        });

        flash(
          "Defaults regenerated — review and save."
        );
      } catch (err) {
        console.error(
          "Regenerate pages error:",
          err
        );

        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            err.message ||
            "Failed to regenerate pages"
        );
      } finally {
        setRegenerating(false);
      }
    };



  const updatePrivacyField =
    (key) => (e) => {
      setPrivacyForm((form) => ({
        ...form,
        [key]: e.target.value,
      }));
    };


  const savePrivacyPolicy =
    async (e) => {
      e.preventDefault();

      setSavingPrivacy(true);
      setError("");

      try {
    

        console.log(
          "Privacy Policy Payload:",
          privacyForm
        );

        const heading =
          String(
            privacyForm.privacy_heading || ""
          ).trim();

        const body =
          String(
            privacyForm.privacy_body || ""
          ).trim();

        if (!heading) {
          setError(
            "Privacy Policy heading is required"
          );

          setSavingPrivacy(false);
          return;
        }

        if (!body) {
          setError(
            "Privacy Policy content is required"
          );

          setSavingPrivacy(false);
          return;
        }


        const payload = {
          privacy_heading: heading,
          privacy_body: body,
        };

        console.log(
          "Sending Privacy Policy:",
          payload
        );

        const { data } =
          await client.put(
            "/seller/privacy-policy",
            payload
          );

        console.log(
          "Privacy Policy Response:",
          data
        );

        setPrivacyForm({
          privacy_heading:
            data.privacy_heading ||
            "Privacy Policy",

          privacy_body:
            data.privacy_body || "",
        });


        flash(
          "Privacy Policy saved successfully."
        );
      } catch (err) {
        console.error(
          "Save privacy policy error:",
          err
        );

        console.error(
          "Status:",
          err.response?.status
        );

        console.error(
          "Backend response:",
          err.response?.data
        );

        console.error(
          "Request data:",
          err.config?.data
        );

        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            err.message ||
            "Failed to save Privacy Policy"
        );
      } finally {
        setSavingPrivacy(false);
      }
    };


  const addFaqRow = () => {
    setFaqs((rows) => [...rows, { question: "", answer: "" }]);
  };

  const updateFaqRow = (idx, key) => (e) => {
    const value = e.target.value;
    setFaqs((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  };

  const removeFaqRow = (idx) => {
    setFaqs((rows) => rows.filter((_, i) => i !== idx));
  };

  const saveFaqs = async (e) => {
    e.preventDefault();
    setSavingFaqs(true);
    setError("");
    try {
      const cleaned = faqs.filter((f) => f.question.trim() && f.answer.trim());
      const { data } = await client.put("/seller/faqs", { faqs: cleaned });
      setFaqs(data.faqs || cleaned);
      flash("FAQs saved successfully.");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to save FAQs");
    } finally {
      setSavingFaqs(false);
    }
  };


  if (loading) {
    return (
      <Loading label="Loading settings…" />
    );
  }


  return (
    <div>
      <div className="page-header">
        <h1>Store settings</h1>
      </div>

      <ErrorBox message={error} />


      <section className="panel form-panel settings-section">
        <h2>Store logo</h2>
        <p className="muted small">Shown at the top left of your storefront, in place of your store name.</p>
        <SingleImageUploader
          value={logoUrl}
          onChange={async (url) => {
            setLogoUrl(url);
            setSavingLogo(true);
            try {
              await client.put("/seller/storefront", { logo_url: url });
              flash(url ? "Logo updated." : "Logo removed.");
            } catch (err) {
              toast.error(err.response?.data?.error || "Couldn't save the logo.");
            } finally {
              setSavingLogo(false);
            }
          }}
          uploadFn={uploadLogoImage}
          label={savingLogo ? "Saving…" : "PNG or SVG with a transparent background works best."}
        />
      </section>

      <section className="panel form-panel settings-section">
        <h2>Template</h2>

        <p className="muted small">
          Each template changes the full look
          and feel — colors, fonts, button and
          card shapes, nav layout, and hero
          framing — not just colors. Pick one,
          then fine-tune individual colors below
          if you like.
        </p>

        <div className="template-gallery">
          {templates.map((t) => {
            const active = t.is_selected;

            const layout =
              getLayoutPreset(
                t.theme.layout_style
              );

            return (
              <div
                key={t.id}
                className={`template-card${
                  active
                    ? " template-card-active"
                    : ""
                }`}
              >
                <div
                  className="template-card-swatch"
                  style={{
                    background:
                      t.theme.background_color,

                    borderColor:
                      t.theme.primary_soft,

                    borderRadius:
                      layout.radiusLg,
                  }}
                >
                  <span
                    className="template-swatch-dot"
                    style={{
                      background:
                        t.theme.primary_color,

                      borderRadius:
                        layout.radius ===
                        "0px"
                          ? "2px"
                          : "50%",
                    }}
                  />

                  <span
                    className="template-swatch-dot"
                    style={{
                      background:
                        t.theme.accent_color,

                      borderRadius:
                        layout.radius ===
                        "0px"
                          ? "2px"
                          : "50%",
                    }}
                  />

                  <span
                    className="template-swatch-font"
                    style={{
                      fontFamily: `"${t.theme.font_display}", serif`,
                      color:
                        t.theme.text_color,
                    }}
                  >
                    Aa
                  </span>
                </div>

                <div className="template-card-name">
                  {t.name}

                  {active && (
                    <span className="badge badge-active">
                      Active
                    </span>
                  )}
                </div>

                <div className="muted small">
                  {t.description}
                </div>

                <div className="template-card-actions">
                  <button
                    type="button"
                    className="btn btn-ghost template-card-btn"
                    onClick={() => openThemePreview(storeSlug, { template_id: t.id, ...t.theme })}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary template-card-btn"
                    onClick={() => applyTemplate(t.id)}
                    disabled={applyingTemplateId === t.id || active}
                  >
                    {applyingTemplateId === t.id ? "Applying…" : active ? "Currently applied" : "Use this template"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel form-panel settings-section">
        <h2>Custom domain</h2>

        <p className="muted small">
          Connect your own domain (e.g. shop.yourbrand.com) so customers
          reach your store without seeing Expressfly in the URL. You'll add
          two DNS records at your domain registrar, then verify here.
        </p>

        {domainError && <ErrorBox message={domainError} />}

        <div className="form-row" style={{ alignItems: "center", gap: 8 }}>
          <span className="muted small">Status:</span>
          {domainInfo?.domain_status === "verified" && (
            <span className="badge badge-active">Verified — live</span>
          )}
          {domainInfo?.domain_status === "pending" && (
            <span className="badge">Pending verification</span>
          )}
          {domainInfo?.domain_status === "failed" && (
            <span className="badge badge-out">Verification failed</span>
          )}
          {(!domainInfo || domainInfo?.domain_status === "none") && (
            <span className="muted small">No custom domain connected</span>
          )}
        </div>

        <form
          className="form-row"
          onSubmit={saveDomain}
          style={{ marginTop: 8 }}
        >
          <input
            className="input"
            placeholder="shop.yourbrand.com"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
          />
          <button
            className="btn btn-primary"
            type="submit"
            disabled={savingDomain || !domainInput.trim()}
          >
            {savingDomain
              ? "Saving…"
              : domainInfo?.custom_domain
              ? "Update domain"
              : "Connect domain"}
          </button>
        </form>

        {domainInfo?.dns_instructions && (
          <div className="panel" style={{ marginTop: 12, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>Add these DNS records</h3>
            <p className="muted small">
              In your domain registrar's DNS settings, add:
            </p>

            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Host</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{domainInfo.dns_instructions.cname.type}</td>
                  <td>{domainInfo.dns_instructions.cname.host}</td>
                  <td>{domainInfo.dns_instructions.cname.value}</td>
                </tr>
                <tr>
                  <td>{domainInfo.dns_instructions.txt.type}</td>
                  <td>{domainInfo.dns_instructions.txt.host}</td>
                  <td style={{ wordBreak: "break-all" }}>
                    {domainInfo.dns_instructions.txt.value}
                  </td>
                </tr>
              </tbody>
            </table>

            <p className="muted small">
              {domainInfo.dns_instructions.cname.note}
            </p>
            <p className="muted small">
              {domainInfo.dns_instructions.txt.note}
            </p>
          </div>
        )}

        {domainInfo?.custom_domain && (
          <div className="form-row" style={{ marginTop: 12 }}>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={runDomainVerify}
              disabled={verifyingDomain}
            >
              {verifyingDomain ? "Checking DNS…" : "Verify domain"}
            </button>

            <button
              className="btn btn-ghost"
              type="button"
              onClick={disconnectDomain}
              disabled={removingDomain}
            >
              {removingDomain ? "Disconnecting…" : "Disconnect domain"}
            </button>
          </div>
        )}
      </section>

    
      <form
        className="panel form-panel settings-section"
        onSubmit={saveTheme}
      >
        <h2>
          Custom colors & fonts
        </h2>

        <p className="muted small">
          Fine-tune the theme applied above.
          Changes preview live on the right.
        </p>

        <div className="theme-editor">
          <div className="theme-editor-fields">
            <label className="theme-field">
              <span>
                Primary color
              </span>

              <input
                type="color"
                value={
                  theme?.primary_color ||
                  "#1c5f45"
                }
                onChange={updateThemeField(
                  "primary_color"
                )}
              />
            </label>

            <label className="theme-field">
              <span>
                Accent color
              </span>

              <input
                type="color"
                value={
                  theme?.accent_color ||
                  "#a8763e"
                }
                onChange={updateThemeField(
                  "accent_color"
                )}
              />
            </label>

            <label className="theme-field">
              <span>
                Background color
              </span>

              <input
                type="color"
                value={
                  theme?.background_color ||
                  "#faf8f3"
                }
                onChange={updateThemeField(
                  "background_color"
                )}
              />
            </label>

            <label className="theme-field">
              <span>
                Text color
              </span>

              <input
                type="color"
                value={
                  theme?.text_color ||
                  "#15140f"
                }
                onChange={updateThemeField(
                  "text_color"
                )}
              />
            </label>

            <label className="theme-field">
              <span>
                Heading font
              </span>

              <select
                className="input"
                value={
                  theme?.font_display ||
                  "Fraunces"
                }
                onChange={updateThemeField(
                  "font_display"
                )}
              >
                {FONT_OPTIONS.map(
                  (font) => (
                    <option
                      key={font}
                      value={font}
                    >
                      {font}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="theme-field">
              <span>
                Body font
              </span>

              <select
                className="input"
                value={
                  theme?.font_body ||
                  "Inter"
                }
                onChange={updateThemeField(
                  "font_body"
                )}
              >
                {FONT_OPTIONS.map(
                  (font) => (
                    <option
                      key={font}
                      value={font}
                    >
                      {font}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>

          <div
            className="theme-preview"
            style={{
              background:
                theme?.background_color,

              color:
                theme?.text_color,

              borderColor:
                theme?.primary_soft,

              borderRadius:
                getLayoutPreset(
                  theme?.layout_style
                ).radiusLg,
            }}
          >
            <div
              className="theme-preview-eyebrow"
              style={{
                color:
                  theme?.accent_color,
              }}
            >
              Live preview
            </div>

            <div
              className="theme-preview-heading"
              style={{
                fontFamily: `"${theme?.font_display}", serif`,
              }}
            >
              {pageForm.about_heading ||
                "Your store"}
            </div>

            <p
              className="theme-preview-body"
              style={{
                fontFamily: `"${theme?.font_body}", sans-serif`,
              }}
            >
              This is how your storefront's
              headline and body text will
              look.
            </p>

            <span
              className="theme-preview-btn"
              style={{
                background:
                  theme?.primary_color,

                borderColor:
                  theme?.primary_color,

                borderRadius:
                  getLayoutPreset(
                    theme?.layout_style
                  ).radius,
              }}
            >
              Shop now
            </span>
          </div>
        </div>

        <div className="form-row">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => openThemePreview(storeSlug, theme)}
          >
            Preview on my site
          </button>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={savingTheme}
          >
            {savingTheme
              ? "Saving…"
              : "Save theme"}
          </button>
        </div>
      </form>

      <form className="panel form-panel settings-section" onSubmit={saveSocialLinks}>
        <h2>Social links</h2>
        <p className="muted small" style={{ marginTop: "-8px" }}>
          Shown as icons in your storefront footer. Leave any field blank to hide that icon.
        </p>
        <div className="form-row">
          <input className="input" placeholder="Facebook URL" value={socialLinks.facebook} onChange={updateSocialLink("facebook")} />
          <input className="input" placeholder="Instagram URL" value={socialLinks.instagram} onChange={updateSocialLink("instagram")} />
        </div>
        <div className="form-row">
          <input className="input" placeholder="Twitter / X URL" value={socialLinks.twitter} onChange={updateSocialLink("twitter")} />
          <input className="input" placeholder="YouTube URL" value={socialLinks.youtube} onChange={updateSocialLink("youtube")} />
        </div>
        <div className="form-row">
          <input className="input" placeholder="WhatsApp link (wa.me/…)" value={socialLinks.whatsapp} onChange={updateSocialLink("whatsapp")} />
          <input className="input" placeholder="Pinterest URL" value={socialLinks.pinterest} onChange={updateSocialLink("pinterest")} />
        </div>
        <div className="form-row">
          <button className="btn btn-primary" type="submit" disabled={savingSocial}>
            {savingSocial ? "Saving…" : "Save social links"}
          </button>
        </div>
      </form>

      <form
        className="panel form-panel settings-section"
        onSubmit={savePages}
      >
        <div
          className="page-header"
          style={{
            marginBottom: 4,
          }}
        >
          <h2 style={{ margin: 0 }}>
            About Us & Contact Us pages
          </h2>

          <button
            className="btn btn-ghost"
            type="button"
            onClick={
              regeneratePages
            }
            disabled={regenerating}
          >
            {regenerating
              ? "Regenerating…"
              : "Regenerate defaults"}
          </button>
        </div>

        <p className="muted small">
          These pages were created
          automatically when your store was
          set up. Edit them any time — changes
          go live immediately on your
          storefront's About Us and Contact
          Us pages.
        </p>

        <h3>About Us</h3>

        <input
          className="input"
          placeholder="Heading"
          value={
            pageForm.about_heading
          }
          onChange={updatePageField(
            "about_heading"
          )}
        />

        <textarea
          className="input"
          rows={4}
          placeholder="About us body text"
          value={
            pageForm.about_body
          }
          onChange={updatePageField(
            "about_body"
          )}
        />

        <SingleImageUploader
          value={pageForm.about_image_url}
          onChange={(url) =>
            setPageForm((f) => ({ ...f, about_image_url: url }))
          }
          uploadFn={uploadPageImage}
          label="Shown on your About Us page"
        />

        <h3>Contact Us</h3>

        <input
          className="input"
          placeholder="Heading"
          value={
            pageForm.contact_heading
          }
          onChange={updatePageField(
            "contact_heading"
          )}
        />

        <textarea
          className="input"
          rows={3}
          placeholder="Intro text"
          value={
            pageForm.contact_intro
          }
          onChange={updatePageField(
            "contact_intro"
          )}
        />

        <div className="form-row">
          <input
            className="input"
            placeholder="Contact email"
            value={
              pageForm.contact_email
            }
            onChange={updatePageField(
              "contact_email"
            )}
          />

          <input
            className="input"
            placeholder="Contact phone"
            value={
              pageForm.contact_phone
            }
            maxLength={10}
            inputMode="numeric"
            onChange={(e) =>
              setPageForm((f) => ({ ...f, contact_phone: digitsOnly(e.target.value, 10) }))
            }
          />
        </div>

        <input
          className="input"
          placeholder="Address (optional)"
          value={
            pageForm.contact_address ||
            ""
          }
          onChange={updatePageField(
            "contact_address"
          )}
        />

        <div className="form-row">
          <button
            className="btn btn-primary"
            type="submit"
            disabled={savingPages}
          >
            {savingPages
              ? "Saving…"
              : "Save pages"}
          </button>
        </div>
      </form>

   
      <form
        className="panel form-panel settings-section"
        onSubmit={savePrivacyPolicy}
      >
        <div
          className="page-header"
          style={{
            marginBottom: 4,
          }}
        >
          <h2 style={{ margin: 0 }}>
            Privacy Policy
          </h2>
        </div>

        <p className="muted small">
          Create a custom Privacy Policy
          specifically for your store. This
          content will be displayed publicly
          on your store's Privacy Policy page.
        </p>

        <h3>
          Privacy Policy Heading
        </h3>

        <input
          className="input"
          placeholder="Privacy Policy"
          value={
            privacyForm.privacy_heading
          }
          onChange={updatePrivacyField(
            "privacy_heading"
          )}
        />

        <h3>
          Privacy Policy Content
        </h3>

        <Suspense fallback={<div className="muted small">Loading editor…</div>}>
          <RichTextEditor
            value={privacyForm.privacy_body}
            onChange={(html) =>
              setPrivacyForm((form) => ({
                ...form,
                privacy_body: html,
              }))
            }
            placeholder="Enter your store's Privacy Policy here…"
          />
        </Suspense>

        <div className="form-row">
          <button
            className="btn btn-primary"
            type="submit"
            disabled={savingPrivacy}
          >
            {savingPrivacy
              ? "Saving…"
              : "Save Privacy Policy"}
          </button>
        </div>
      </form>

      <form
        className="panel form-panel settings-section"
        onSubmit={saveFaqs}
      >
        <div
          className="page-header"
          style={{
            marginBottom: 4,
          }}
        >
          <h2 style={{ margin: 0 }}>FAQs</h2>
          <button type="button" className="btn btn-ghost" onClick={addFaqRow}>
            + Add question
          </button>
        </div>

        <p className="muted small">
          Answer common shopper questions here — they'll show up on your store's public FAQs page.
        </p>

        {faqs.length === 0 ? (
          <p className="muted small">No FAQs yet. Add your first question above.</p>
        ) : (
          faqs.map((f, idx) => (
            <div key={idx} className="faq-row">
              <div className="form-row">
                <input
                  className="input"
                  placeholder="Question"
                  value={f.question}
                  onChange={updateFaqRow(idx, "question")}
                />
                <button type="button" className="btn btn-ghost danger" onClick={() => removeFaqRow(idx)}>
                  Remove
                </button>
              </div>
              <textarea
                className="input"
                rows={2}
                placeholder="Answer"
                value={f.answer}
                onChange={updateFaqRow(idx, "answer")}
              />
            </div>
          ))
        )}

        <div className="form-row">
          <button className="btn btn-primary" type="submit" disabled={savingFaqs}>
            {savingFaqs ? "Saving…" : "Save FAQs"}
          </button>
        </div>
      </form>
    </div>
  );
}