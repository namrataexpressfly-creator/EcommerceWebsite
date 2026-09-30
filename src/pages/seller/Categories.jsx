import { useEffect, useState } from "react";
import client, { uploadCategoryImage, resolveMediaUrl } from "../../api/client";
import { Loading, ErrorBox, EmptyState } from "../../components/Ui";
import SingleImageUploader from "../../components/SingleImageUploader";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";
import useTableSearch from "../../hooks/useTableSearch";
import TableSearch from "../../components/TableSearch";
import { slugify } from "../../utils/format";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";

const emptyForm = { _id: null, name: "", slug: "", description: "", image_url: "" };

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();
  const confirmAction = useConfirm();
  const { query, setQuery, filtered } = useTableSearch(categories);
  const pagination = usePagination(filtered, { resetKey: query });

  const load = () => {
    setLoading(true);
    client
      .get("/seller/categories")
      .then(({ data }) => setCategories(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const update = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value, ...(key === "name" && !f._id ? { slug: slugify(value) } : {}) }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      description: form.description,
      image_url: form.image_url || "",
    };
    try {
      if (form._id) await client.put(`/seller/categories/${form._id}`, payload);
      else await client.post("/seller/categories", payload);
      toast.success(form._id ? "Category updated." : "Category created.");
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
      toast.error(err.message || "Could not save category.");
    }
  };

  const remove = async (id) => {
    const ok = await confirmAction({
      title: "Remove this category?",
      message: "Products in this category will no longer be grouped under it.",
      confirmText: "Remove category",
      danger: true,
    });
    if (!ok) return;
    try {
      await client.delete(`/seller/categories/${id}`);
      toast.success("Category removed.");
      load();
    } catch (err) {
      setError(err.message);
      toast.error(err.message || "Could not remove category.");
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Categories</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            setForm(emptyForm);
            setShowForm(true);
          }}
        >
          + Add category
        </button>
      </div>

      <ErrorBox message={error} />

      {showForm && (
        <form className="panel form-panel" onSubmit={submit}>
          <h2>{form._id ? "Edit category" : "New category"}</h2>
          <div className="form-row">
            <input className="input" placeholder="Name" value={form.name} onChange={update("name")} required />
            <input className="input" placeholder="Slug" value={form.slug} onChange={update("slug")} required />
          </div>
          <textarea
            className="input"
            placeholder="Description (optional)"
            value={form.description}
            onChange={update("description")}
          />
          <label className="field-label" style={{ display: "block", marginTop: 12 }}>
            Category image (optional)
          </label>
          <SingleImageUploader
            value={form.image_url}
            onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
            uploadFn={uploadCategoryImage}
          />
          <div className="form-row">
            <button className="btn btn-primary" type="submit">
              {form._id ? "Save changes" : "Create category"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <Loading />
      ) : categories.length === 0 ? (
        <EmptyState>No categories yet.</EmptyState>
      ) : (
        <>
        <TableSearch query={query} onChange={setQuery} shown={filtered.length} total={categories.length} placeholder="Search categories…" />
        <table className="data-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Slug</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagination.pageItems.map((c) => (
              <tr key={c._id}>
                <td>
                  {c.image_url ? (
                    <img
                      src={resolveMediaUrl(c.image_url)}
                      alt={c.name}
                      style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }}
                    />
                  ) : (
                    <div className="product-thumb-placeholder" style={{ width: 36, height: 36 }}>
                      {c.name?.[0]}
                    </div>
                  )}
                </td>
                <td>{c.name}</td>
                <td className="muted small">{c.slug}</td>
             

                   <td className="table-actions">
           
                    <button className="btn-icon"   onClick={() => {
                      setForm(c);
                      setShowForm(true);
                    }} title="Edit">
                      <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
                        <path d="M12.9 3.5 16.5 7 7.4 16.1l-4 .9.9-4L12.9 3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button className="btn-icon danger" onClick={() => remove(c._id)} title="Delete">
                      <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
                        <path d="M4 6h12M8.3 6V4.4a1 1 0 0 1 1-1h1.4a1 1 0 0 1 1 1V6M5.6 6l.6 9.6a1.5 1.5 0 0 0 1.5 1.4h4.6a1.5 1.5 0 0 0 1.5-1.4L14.4 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </td>
              </tr>
            ))}
          </tbody>
        </table>
        </>
      )}

      {!loading && categories.length > 0 && <Pagination {...pagination} />}
    </div>
  );
}
