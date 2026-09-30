import { useEffect, useState } from "react";
import client, { resolveMediaUrl, uploadBannerImage } from "../../api/client";
import { Loading, ErrorBox, EmptyState } from "../../components/Ui";
import SingleImageUploader from "../../components/SingleImageUploader";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";

const MAX_BANNERS = 5;
const TITLE_MAX = 40;
const SUBTITLE_MAX = 80;
const emptyForm = { _id: null, image_url: "", title: "", subtitle: "", link_url: "" };

export default function Banners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const confirmAction = useConfirm();

  const load = () => {
    setLoading(true);
    client
      .get("/seller/banners")
      .then(({ data }) => setBanners((data || []).sort((a, b) => a.order - b.order)))
      .catch((err) => setError(err.response?.data?.error || "We couldn't load your slides. Please refresh the page."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const isEdit = Boolean(form._id);
      const payload = {
        image_url: form.image_url,
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        link_url: form.link_url.trim(),
      };
      if (isEdit) await client.patch(`/seller/banners/${form._id}`, payload);
      else await client.post("/seller/banners", payload);
      setForm(emptyForm);
      setShowForm(false);
      toast.success(isEdit ? "Slide updated." : "Slide added to your homepage slider.");
      load();
    } catch (err) {
      const msg = err.response?.data?.error || "We couldn't save this slide. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    const ok = await confirmAction({
      title: "Remove this slide?",
      message: "It will be taken off your storefront's homepage slider immediately.",
      confirmText: "Remove slide",
      danger: true,
    });
    if (!ok) return;
    try {
      await client.delete(`/seller/banners/${id}`);
      toast.success("Slide removed.");
      load();
    } catch (err) {
      const msg = err.response?.data?.error || "We couldn't remove this slide. Please try again.";
      setError(msg);
      toast.error(msg);
    }
  };

  const move = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= banners.length) return;
    const current = banners[index];
    const target = banners[targetIndex];
    try {
      await Promise.all([
        client.patch(`/seller/banners/${current._id}`, { order: target.order }),
        client.patch(`/seller/banners/${target._id}`, { order: current.order }),
      ]);
      load();
    } catch (err) {
      const msg = err.response?.data?.error || "We couldn't change the slide order. Please try again.";
      setError(msg);
      toast.error(msg);
    }
  };

  const atLimit = banners.length >= MAX_BANNERS;

  return (
    <div>
      <div className="page-header">
        <h1>Homepage slider</h1>
        <button
          className="btn btn-primary"
          disabled={atLimit}
          onClick={() => {
            setForm(emptyForm);
            setShowForm(true);
          }}
        >
          + Add slide
        </button>
      </div>

      <p className="muted small" style={{ marginTop: "-14px", marginBottom: "20px" }}>
        Up to {MAX_BANNERS} images shown as an auto-rotating slider on your storefront home page.
        {atLimit ? " You've reached the limit — remove a slide to add another." : ""}
      </p>

      <ErrorBox message={error} />

      {showForm && (
        <form className="panel form-panel" onSubmit={submit}>
          <h2>{form._id ? "Edit slide" : "New slide"}</h2>
          <SingleImageUploader
            value={form.image_url}
            onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
            uploadFn={uploadBannerImage}
            label="Recommended: wide banner image, up to 5MB"
          />
              <div className="form-row">
            <div style={{ flex: 1 }}>
              <input
                className="input"
                placeholder="Title"
                value={form.title}
                onChange={update("title")}
                maxLength={TITLE_MAX}
                required
              />
              <div className="muted small" style={{ textAlign: "right", marginTop: 2 }}>
                {form.title.length}/{TITLE_MAX}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <input
                className="input"
                placeholder="Subtitle (optional)"
                value={form.subtitle}
                onChange={update("subtitle")}
                maxLength={SUBTITLE_MAX}
              />
              <div className="muted small" style={{ textAlign: "right", marginTop: 2 }}>
                {form.subtitle.length}/{SUBTITLE_MAX}
              </div>
            </div>
          </div>
          <input
            className="input"
            placeholder="Link URL (optional — defaults to your storefront)"
            value={form.link_url}
            onChange={update("link_url")}
          />
          <div className="form-row">
            <button className="btn btn-primary" type="submit" disabled={saving || !form.image_url}>
              {saving ? "Saving…" : form._id ? "Save changes" : "Add slide"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <Loading />
      ) : banners.length === 0 ? (
        <EmptyState>
          No slides yet. Add up to {MAX_BANNERS} images to run a slider on your storefront home page.
        </EmptyState>
      ) : (
        <div className="banner-list">
          {banners.map((b, i) => (
            <div key={b._id} className="banner-row panel">
              <div className="banner-row-thumb">
                <img src={resolveMediaUrl(b.image_url)} alt={b.title} />
              </div>
              <div className="banner-row-info">
                <div className="product-name">{b.title}</div>
                {b.subtitle && <div className="muted small">{b.subtitle}</div>}
                {b.link_url && <div className="muted small">{b.link_url}</div>}
              </div>
              <div className="table-actions">
                <button className="btn btn-ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                  ↑
                </button>
                <button
                  className="btn btn-ghost"
                  disabled={i === banners.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setForm({
                      _id: b._id,
                      image_url: b.image_url || "",
                      title: b.title || "",
                      subtitle: b.subtitle || "",
                      link_url: b.link_url || "",
                    });
                    setShowForm(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Edit
                </button>
                <button className="btn btn-ghost danger" onClick={() => remove(b._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
