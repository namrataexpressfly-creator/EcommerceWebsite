import { useEffect, useState } from "react";
import client from "../../api/client";
import { Loading, ErrorBox, EmptyState } from "../../components/Ui";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";
import useTableSearch from "../../hooks/useTableSearch";
import TableSearch from "../../components/TableSearch";
import { formatMoney } from "../../utils/format";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";

const emptyForm = {
  _id: null,
  code: "",
  discount_type: "percentage",
  discount_value: "",
  min_order_value: "",
  usage_limit: "",
  applies_to: "store",
  product_ids: [],
  category_ids: [],
};

const APPLIES_TO_LABEL = {
  store: "Whole store",
  products: "Specific products",
  category: "Specific category",
};

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();
  const confirmAction = useConfirm();
  const { query, setQuery, filtered } = useTableSearch(coupons);
  const { pageItems, pagerProps } = usePagination(filtered, { resetKey: query });

  const load = () => {
    setLoading(true);
    Promise.all([
      client.get("/seller/coupons"),
      client.get("/seller/products"),
      client.get("/seller/categories"),
    ])
      .then(([couponsRes, productsRes, categoriesRes]) => {
        setCoupons(couponsRes.data);
        setProducts(productsRes.data);
        setCategories(categoriesRes.data);
      })
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleId = (key, id) => {
    setForm((f) => {
      const current = f[key] || [];
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      return { ...f, [key]: next };
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.applies_to === "products" && form.product_ids.length === 0) {
      setError("Pick at least one product for this coupon to apply to.");
      return;
    }
    if (form.applies_to === "category" && form.category_ids.length === 0) {
      setError("Pick at least one category for this coupon to apply to.");
      return;
    }

    const payload = {
      code: form.code.toUpperCase(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_order_value: Number(form.min_order_value) || 0,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      applies_to: form.applies_to,
      product_ids: form.applies_to === "products" ? form.product_ids : [],
      category_ids: form.applies_to === "category" ? form.category_ids : [],
    };
    try {
      if (form._id) await client.put(`/seller/coupons/${form._id}`, payload);
      else await client.post("/seller/coupons", payload);
      toast.success(form._id ? "Coupon updated." : "Coupon created.");
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      toast.error(err.response?.data?.error || err.message || "Could not save coupon.");
    }
  };

  const toggleActive = async (coupon) => {
    if (coupon.is_active) {
      const ok = await confirmAction({
        title: "Deactivate this coupon?",
        message: "Shoppers won't be able to apply this coupon code anymore. You can turn it back on later.",
        confirmText: "Deactivate",
        danger: true,
      });
      if (!ok) return;
    }
    try {
      if (coupon.is_active) await client.delete(`/seller/coupons/${coupon._id}`);
      else await client.put(`/seller/coupons/${coupon._id}`, { is_active: true });
      toast.success(coupon.is_active ? "Coupon deactivated." : "Coupon is active again.");
      load();
    } catch (err) {
      const msg = err.response?.data?.error || "We couldn't update this coupon. Please try again.";
      setError(msg);
      toast.error(msg);
    }
  };

  const couponScopeLabel = (c) => {
    if (c.applies_to === "products") {
      const n = c.product_ids?.length || 0;
      return `${n} product${n === 1 ? "" : "s"}`;
    }
    if (c.applies_to === "category") {
      const names = (c.category_ids || [])
        .map((id) => categories.find((cat) => cat._id === id)?.name)
        .filter(Boolean);
      return names.length ? names.join(", ") : "Category";
    }
    return "Whole store";
  };

  return (
    <div>
      <div className="page-header">
        <h1>Coupons</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            setForm(emptyForm);
            setShowForm(true);
          }}
        >
          + Add coupon
        </button>
      </div>

      <ErrorBox message={error} />

      {showForm && (
        <form className="panel form-panel" onSubmit={submit}>
          <h2>{form._id ? "Edit coupon" : "New coupon"}</h2>
          <div className="form-row">
            <input className="input" placeholder="Code (e.g. WELCOME10)" value={form.code} onChange={update("code")} required />
            <select className="input" value={form.discount_type} onChange={update("discount_type")}>
              <option value="percentage">Percentage off</option>
              <option value="flat">Flat amount off</option>
            </select>
          </div>
          <div className="form-row form-row-3">
            <input
              className="input"
              type="number" min="0"
              placeholder="Discount value"
              value={form.discount_value}
              onChange={update("discount_value")}
              required
            />
            <input
              className="input"
              type="number" min="0"
              placeholder="Min order value"
              value={form.min_order_value}
              onChange={update("min_order_value")}
            />
            <input
              className="input"
              type="number" min="0"
              placeholder="Usage limit (optional)"
              value={form.usage_limit}
              onChange={update("usage_limit")}
            />
          </div>

          <label className="field-label" style={{ display: "block", marginTop: 14 }}>
            Applies to
          </label>
          <div className="form-row">
            <select className="input" value={form.applies_to} onChange={update("applies_to")}>
              <option value="store">Whole store — any product</option>
              <option value="category">Specific category</option>
              <option value="products">Specific products</option>
            </select>
          </div>

          {form.applies_to === "category" && (
            <div className="checkbox-grid">
              {categories.length === 0 ? (
                <p className="muted small">No categories yet — create one under Categories first.</p>
              ) : (
                categories.map((cat) => (
                  <label key={cat._id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={form.category_ids.includes(cat._id)}
                      onChange={() => toggleId("category_ids", cat._id)}
                    />
                    {cat.name}
                  </label>
                ))
              )}
            </div>
          )}

          {form.applies_to === "products" && (
            <div className="checkbox-grid">
              {products.length === 0 ? (
                <p className="muted small">No products yet — add one under Products first.</p>
              ) : (
                products.map((p) => (
                  <label key={p._id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={form.product_ids.includes(p._id)}
                      onChange={() => toggleId("product_ids", p._id)}
                    />
                    {p.name}
                  </label>
                ))
              )}
            </div>
          )}

          <div className="form-row" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" type="submit">
              {form._id ? "Save changes" : "Create coupon"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <Loading />
      ) : coupons.length === 0 ? (
        <EmptyState>No coupons yet.</EmptyState>
      ) : (
        <>
          <TableSearch query={query} onChange={setQuery} shown={filtered.length} total={coupons.length} placeholder="Search by coupon code…" />
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Applies to</th>
                <th>Min order</th>
                <th>Used</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((c) => (
                <tr key={c._id}>
                  <td>{c.code}</td>
                  <td>{c.discount_type === "percentage" ? `${c.discount_value}%` : formatMoney(c.discount_value)}</td>
                  <td>
                    <span className="chip">{APPLIES_TO_LABEL[c.applies_to] || "Whole store"}</span>
                    {c.applies_to !== "store" && (
                      <div className="muted small" style={{ marginTop: 3 }}>
                        {couponScopeLabel(c)}
                      </div>
                    )}
                  </td>
                  <td>{formatMoney(c.min_order_value)}</td>
                  <td>
                    {c.used_count}
                    {c.usage_limit ? ` / ${c.usage_limit}` : ""}
                  </td>
                  <td>{c.is_active ? "Yes" : "No"}</td>
                  <td className="table-actions">
                    {/* Edit */}
                    <button
                      className="btn-icon"
                      onClick={() => {
                        setForm({
                          ...emptyForm,
                          ...c,
                          discount_value: c.discount_value,
                          usage_limit: c.usage_limit ?? "",
                          applies_to: c.applies_to || "store",
                          product_ids: c.product_ids || [],
                          category_ids: c.category_ids || [],
                        });
                        setShowForm(true);
                      }}
                      title="Edit"
                    >
                      <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
                        <path
                          d="M12.9 3.5 16.5 7 7.4 16.1l-4 .9.9-4L12.9 3.5Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <button
                      className={`btn-icon ${c.is_active ? "danger" : "success"}`}
                      onClick={() => toggleActive(c)}
                      title={c.is_active ? "Deactivate" : "Reactivate"}
                    >
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
                        <path
                          d="M12 2v10"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M6.34 5.64a8 8 0 1 0 11.32 0"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination {...pagerProps} />
        </>
      )}
    </div>
  );
}
