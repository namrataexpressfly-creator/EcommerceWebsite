import { useEffect, useRef, useState } from "react";
import client, { uploadVariantOptionImage, resolveMediaUrl } from "../../api/client";
import { Loading, ErrorBox, EmptyState } from "../../components/Ui";
import Modal from "../../components/Modal";
import Switch from "../../components/Switch";
import { formatDate } from "../../utils/format";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";
import useTableSearch from "../../hooks/useTableSearch";
import TableSearch from "../../components/TableSearch";

function ActiveBadge({ active }) {
  return <span className={`badge ${active ? "badge-active" : "badge-out"}`}>{active ? "Active" : "Inactive"}</span>;
}


function OptionImagePicker({ value, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadVariantOptionImage(file);
      onChange(url);
    } catch {

    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="option-image-picker">
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} />
      <button
        type="button"
        className="option-image-thumb"
        onClick={() => inputRef.current?.click()}
        title={value ? "Change image" : "Add image (optional)"}
        disabled={uploading}
      >
        {value ? (
          <img src={resolveMediaUrl(value)} alt="" />
        ) : (
          <span className="option-image-thumb-placeholder">{uploading ? "…" : "+"}</span>
        )}
      </button>
      {value && (
        <button type="button" className="option-image-clear" onClick={() => onChange("")} title="Remove image">
          ×
        </button>
      )}
    </div>
  );
}

const emptyForm = {
  _id: null,
  name: "",
  is_active: true,
  options: [{ value: "", image_url: "", is_active: true }],
};

export default function ProductVariants() {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const confirmAction = useConfirm();
  const { query, setQuery, filtered } = useTableSearch(variants);
  const { pageItems, startIndex, pagerProps } = usePagination(filtered, { resetKey: query });

  const load = () => {
    setLoading(true);
    client
      .get("/seller/product-variants")
      .then(({ data }) => setVariants(data))
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const startNew = () => {
    setForm(emptyForm);
    setShowForm(true);
    setError("");
  };

  const startEdit = (v) => {
    setForm({
      _id: v._id,
      name: v.name,
      is_active: v.is_active,
      options: v.options.length
        ? v.options.map((o) => ({ value: o.value, image_url: o.image_url || "", is_active: o.is_active }))
        : [{ value: "", image_url: "", is_active: true }],
    });
    setShowForm(true);
    setError("");
  };

  const updateOption = (idx, key, value) => {
    setForm((f) => {
      const options = [...f.options];
      options[idx] = { ...options[idx], [key]: value };
      return { ...f, options };
    });
  };

  const addOption = () => {
    setForm((f) => ({ ...f, options: [...f.options, { value: "", image_url: "", is_active: true }] }));
  };

  const removeOption = (idx) => {
    setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== idx) }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanOptions = form.options.map((o) => ({ ...o, value: o.value.trim() })).filter((o) => o.value);
    if (!form.name.trim()) {
      setError("Variant name is required");
      return;
    }
    if (cleanOptions.length === 0) {
      setError("Add at least one option value");
      return;
    }

    setSaving(true);
    try {
      const payload = { name: form.name.trim(), is_active: form.is_active, options: cleanOptions };
      if (form._id) {
        await client.put(`/seller/product-variants/${form._id}`, payload);
      } else {
        await client.post("/seller/product-variants", payload);
      }
      setShowForm(false);
      setForm(emptyForm);
      toast.success(form._id ? "Variant updated." : "Variant created.");
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      toast.error(err.response?.data?.error || err.message || "Could not save variant.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    const ok = await confirmAction({
      title: "Delete this variant?",
      message: "Products that already used it keep their saved combinations.",
      confirmText: "Delete variant",
      danger: true,
    });
    if (!ok) return;
    try {
      await client.delete(`/seller/product-variants/${id}`);
      toast.success("Variant deleted.");
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      toast.error(err.response?.data?.error || err.message || "Could not delete variant.");
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Product Variants</h1>
        <button className="btn btn-primary" onClick={startNew}>
          + Add
        </button>
      </div>

      <ErrorBox message={!showForm ? error : ""} />

      {showForm && (
        <form className="panel form-panel" onSubmit={submit}>
          <h2>{form._id ? "Edit variant" : "Create Product Variant"}</h2>

          <ErrorBox message={error} />

          <label className="muted small">Variant Name</label>
          <input
            className="input"
            placeholder="e.g. Size, Color, Material"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />

          <div style={{ marginTop: 16, marginBottom: 8 }}>
            <strong>Variant Options</strong>
            <div className="muted small">Add different values for this variant</div>
          </div>

          {form.options.map((opt, idx) => (
            <div className="variant-option-row" key={idx}>
              <OptionImagePicker value={opt.image_url} onChange={(url) => updateOption(idx, "image_url", url)} />
              <input
                className="input"
                placeholder="Option Value"
                value={opt.value}
                onChange={(e) => updateOption(idx, "value", e.target.value)}
              />
              <Switch
                checked={opt.is_active}
                onChange={(val) => updateOption(idx, "is_active", val)}
                label="Active"
              />
              {form.options.length > 1 && (
                <button type="button" className="icon-btn" onClick={() => removeOption(idx)} title="Remove option">
                  🗑
                </button>
              )}
            </div>
          ))}

          <button type="button" className="btn btn-ghost" onClick={addOption} style={{ marginBottom: 16 }}>
            + Add Another Option
          </button>

          {form._id && (
            <div style={{ marginBottom: 16 }}>
              <Switch
                checked={form.is_active}
                onChange={(val) => setForm((f) => ({ ...f, is_active: val }))}
                label="Variant active"
              />
            </div>
          )}

          <div className="form-row">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Submit"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <Loading />
      ) : variants.length === 0 ? (
        <EmptyState>No product variants yet. Add one above (e.g. Size, Color).</EmptyState>
      ) : (
        <div className="panel">
          <TableSearch query={query} onChange={setQuery} shown={filtered.length} total={variants.length} placeholder="Search variants (e.g. Size, Color)…" />
          <table className="data-table">
            <thead>
              <tr>
                <th>Sr No</th>
                <th>Variant Name</th>
                <th>Option Count</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((v, idx) => (
                <tr key={v._id}>
                  <td>{startIndex + idx + 1}</td>
                  <td>{v.name}</td>
                  <td>{v.options.length}</td>
                  <td>
                    <ActiveBadge active={v.is_active} />
                  </td>
                  <td className="muted small">{formatDate(v.created_at)}</td>
                  <td className="table-actions">
                    <button className="btn-icon" onClick={() => setViewing(v)} title="View">
                      <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
                        <path d="M1.7 10S4.5 4.3 10 4.3 18.3 10 18.3 10 15.5 15.7 10 15.7 1.7 10 1.7 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                        <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </button>
                    <button className="btn-icon" onClick={() => startEdit(v)} title="Edit">
                      <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
                        <path d="M12.9 3.5 16.5 7 7.4 16.1l-4 .9.9-4L12.9 3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button className="btn-icon danger" onClick={() => remove(v._id)} title="Delete">
                      <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
                        <path d="M4 6h12M8.3 6V4.4a1 1 0 0 1 1-1h1.4a1 1 0 0 1 1 1V6M5.6 6l.6 9.6a1.5 1.5 0 0 0 1.5 1.4h4.6a1.5 1.5 0 0 0 1.5-1.4L14.4 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination {...pagerProps} />
        </div>
      )}

      {viewing && (
        <Modal title="Variant Details" onClose={() => setViewing(null)} width={560}>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div>
              <div className="muted small">Variant Name</div>
              <strong>{viewing.name}</strong>
            </div>
            <div>
              <div className="muted small">Status</div>
              <ActiveBadge active={viewing.is_active} />
            </div>
          </div>
          <div className="muted small" style={{ marginBottom: 4 }}>Variant ID</div>
          <div style={{ marginBottom: 12, fontFamily: "monospace", fontSize: "0.85rem" }}>{viewing._id}</div>
          <div className="muted small" style={{ marginBottom: 4 }}>Created At</div>
          <div style={{ marginBottom: 16 }}>{formatDate(viewing.created_at)}</div>

          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th></th>
                <th>Option Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {viewing.options.map((o, i) => (
                <tr key={o._id || i}>
                  <td>{i + 1}</td>
                  <td>
                    {o.image_url ? (
                      <img
                        src={resolveMediaUrl(o.image_url)}
                        alt=""
                        style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }}
                      />
                    ) : null}
                  </td>
                  <td>{o.value}</td>
                  <td>
                    <ActiveBadge active={o.is_active} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="muted small" style={{ marginTop: 12 }}>Total Options: {viewing.options.length}</div>
        </Modal>
      )}
    </div>
  );
}
