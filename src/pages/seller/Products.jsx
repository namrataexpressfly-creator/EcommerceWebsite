import { Fragment, useEffect, useState } from "react";
import client from "../../api/client";
import { Loading, ErrorBox, EmptyState } from "../../components/Ui";
import Modal from "../../components/Modal";
import Switch from "../../components/Switch";
import ImageUploader from "../../components/ImageUploader";
import { formatMoney, slugify, formatDate as formatDateTime } from "../../utils/format";
import { resolveMediaUrl } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import Pagination from "../../components/Pagination";
import VariantGallery from "../../components/VariantGallery";
import usePagination from "../../hooks/usePagination";
import useTableSearch from "../../hooks/useTableSearch";
import TableSearch from "../../components/TableSearch";
import "../../styles/variant-warehouse.css";

const SEPARATORS = [
  { value: "-", label: "- (Dash)" },
  { value: "_", label: "_ (Underscore)" },
  { value: "/", label: "/ (Slash)" },
];

const emptyForm = {
  _id: null,
  name: "",
  slug: "",
  description: "",
  category_id: "",
  sku: "",
  price: "",
  stock_qty: "",
  warehouse_stock: [], 
  images: [],
  length_cm: "",
  width_cm: "",
  height_cm: "",
  weight_kg: "",
  discount_type: "percentage",
  discount_percentage: "0",
  tax_type: "percentage",
  tax_percentage: "0",
  product_type: "simple", 
  selectedVariants: [], 
  combination_separator: "-",
  combinations: [], 
};

function cartesian(arrays) {
  return arrays.reduce(
    (acc, arr) => acc.flatMap((combo) => arr.map((item) => [...combo, item])),
    [[]]
  );
}


function Field({ label, children }) {
  return (
    <label className="field-wrap">
      <span className="field-caption">{label}</span>
      {children}
    </label>
  );
}

export default function Products() {
  const { seller } = useAuth();
  const kycApproved = seller?.kyc?.status === "approved";
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [availableVariants, setAvailableVariants] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configuringIdx, setConfiguringIdx] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [viewTab, setViewTab] = useState("description");
  const [variantGallery, setVariantGallery] = useState(null); 
  const toast = useToast();
  const confirmAction = useConfirm();
  const { query: productQuery, setQuery: setProductQuery, filtered: filteredProducts } = useTableSearch(products);
  const { pageItems: pagedProducts, pagerProps } = usePagination(filteredProducts, { resetKey: productQuery });

  const load = () => {
    setLoading(true);
    Promise.all([
      client.get("/seller/products"),
      client.get("/seller/categories"),
      client.get("/seller/product-variants/active"),
      client.get("/seller/warehouses"),
    ])
      .then(([p, c, v, w]) => {
        setProducts(p.data);
        setCategories(c.data);
        setAvailableVariants(v.data);
        setWarehouses(w.data);
      })
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const update = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({
      ...f,
      [key]: value,
      ...(key === "name" && !f._id ? { slug: slugify(value) } : {}),
    }));
  };

  const startNew = () => {
    if (!kycApproved) return;
    setForm(emptyForm);
    setShowForm(true);
    setError("");
  };

  const startEdit = (p) => {
    setForm({
      _id: p._id,
      name: p.name,
      slug: p.slug,
      description: p.description || "",
      category_id: p.category_id || "",
      sku: p.sku || "",
      price: p.price ?? "",
      stock_qty: p.stock_qty ?? "",
      warehouse_stock: (p.warehouse_stock || []).map((w) => ({
        warehouse_id: typeof w.warehouse_id === "object" ? w.warehouse_id._id : w.warehouse_id,
        qty: w.qty ?? 0,
      })),
      images: p.images || [],
      length_cm: p.length_cm ?? "",
      width_cm: p.width_cm ?? "",
      height_cm: p.height_cm ?? "",
      weight_kg: p.weight_kg ?? "",
      discount_type: p.discount_type || "percentage",
      discount_percentage: p.discount_percentage ?? 0,
      tax_type: p.tax_type || "percentage",
      tax_percentage: p.tax_percentage ?? 0,
      product_type: p.product_type || "simple",
      selectedVariants: (p.variants || []).map((v) => ({
        variant_id: v.variant_id,
        name: v.name,
        options: v.options,
      })),
      combination_separator: p.combination_separator || "-",
      combinations: (p.combinations || []).map((c) => ({
        option_values: c.option_values || {},
        label: c.label || "",
        sku: c.sku,
        price: c.price ?? p.price ?? "",
        images: c.images || [],
        stock: c.stock ?? 0,
        warehouse_stock: (c.warehouse_stock || []).map((w) => ({
          warehouse_id: typeof w.warehouse_id === "object" ? w.warehouse_id._id : w.warehouse_id,
          qty: w.qty ?? 0,
        })),
        discount_type: c.discount_type || "percentage",
        discount_percentage: c.discount_percentage || 0,
        tax_type: c.tax_type || "percentage",
        tax_percentage: c.tax_percentage || 0,
      })),
    });
    setShowForm(true);
    setError("");
  };

  const toggleVariant = (variant) => {
    setForm((f) => {
      const exists = f.selectedVariants.some((v) => v.variant_id === variant._id);
      if (exists) {
        return { ...f, selectedVariants: f.selectedVariants.filter((v) => v.variant_id !== variant._id) };
      }
      return {
        ...f,
        selectedVariants: [
          ...f.selectedVariants,
          { variant_id: variant._id, name: variant.name, options: variant.options.map((o) => o.value) },
        ],
      };
    });
  };


  const addWarehouseRow = () => {
    setForm((f) => {
      const usedIds = new Set(f.warehouse_stock.map((w) => w.warehouse_id));
      const next = warehouses.find((w) => w.is_active && !usedIds.has(w._id));
      return {
        ...f,
        warehouse_stock: [...f.warehouse_stock, { warehouse_id: next?._id || "", qty: 0 }],
      };
    });
  };

  const updateWarehouseRow = (idx, patch) => {
    setForm((f) => {
      const rows = [...f.warehouse_stock];
      rows[idx] = { ...rows[idx], ...patch };
      return { ...f, warehouse_stock: rows };
    });
  };

  const removeWarehouseRow = (idx) => {
    setForm((f) => ({ ...f, warehouse_stock: f.warehouse_stock.filter((_, i) => i !== idx) }));
  };

  const warehouseStockTotal = form.warehouse_stock.reduce((sum, w) => sum + (Number(w.qty) || 0), 0);

  const buildSku = (parentSku, values, separator) => {
    const base = (parentSku || "SKU").trim() || "SKU";
    return [base, ...values].join(separator);
  };

  const generateCombinations = () => {
    if (form.selectedVariants.length === 0) return;
    const optionArrays = form.selectedVariants.map((v) => v.options.map((opt) => ({ variant: v.name, value: opt })));
    const combos = cartesian(optionArrays);

    const combinations = combos.map((combo) => {
      const option_values = {};
      combo.forEach((c) => {
        option_values[c.variant] = c.value;
      });
      const label = combo.map((c) => `${c.variant}: ${c.value}`).join(" / ");
      const sku = buildSku(form.sku, combo.map((c) => c.value), form.combination_separator);
      return {
        option_values,
        label,
        sku,
        price: form.price || "",
        images: [],
        stock: 0,
        warehouse_stock: [],
        discount_type: "percentage",
        discount_percentage: 0,
        tax_type: "percentage",
        tax_percentage: 0,
      };
    });

    setForm((f) => ({ ...f, combinations }));
  };

  const regenerateSkus = () => {
    setForm((f) => ({
      ...f,
      combinations: f.combinations.map((c) => {
        const values = Object.values(c.option_values);
        return { ...c, sku: buildSku(f.sku, values, f.combination_separator) };
      }),
    }));
  };

  const updateCombination = (idx, patch) => {
    setForm((f) => {
      const combinations = [...f.combinations];
      combinations[idx] = { ...combinations[idx], ...patch };
      return { ...f, combinations };
    });
  };

  const removeCombination = (idx) => {
    setForm((f) => ({ ...f, combinations: f.combinations.filter((_, i) => i !== idx) }));
  };

  const [whOpen, setWhOpen] = useState({}); 

  const comboRows = (c) => c.warehouse_stock || [];
  const comboWarehouseTotal = (c) => comboRows(c).reduce((sum, w) => sum + (Number(w.qty) || 0), 0);

  const setComboRows = (idx, updater) => {
    setForm((f) => {
      const combinations = [...f.combinations];
      combinations[idx] = { ...combinations[idx], warehouse_stock: updater(comboRows(combinations[idx])) };
      return { ...f, combinations };
    });
  };

  const addComboWarehouse = (idx) =>
    setComboRows(idx, (rows) => {
      const used = new Set(rows.map((w) => w.warehouse_id));
      const next = warehouses.find((w) => w.is_active && !used.has(w._id));
      return [...rows, { warehouse_id: next?._id || "", qty: 0 }];
    });

  const updateComboWarehouse = (idx, rowIdx, patch) =>
    setComboRows(idx, (rows) => rows.map((r, i) => (i === rowIdx ? { ...r, ...patch } : r)));

  const removeComboWarehouse = (idx, rowIdx) => setComboRows(idx, (rows) => rows.filter((_, i) => i !== rowIdx));

  const toggleWarehousePanel = (idx) => {
    const open = !!whOpen[idx];
    if (!open && comboRows(form.combinations[idx]).length === 0) addComboWarehouse(idx);
    setWhOpen((o) => ({ ...o, [idx]: !open }));
  };

  const copyWarehousesToAll = async (idx) => {
    const ok = await confirmAction({
      title: "Copy to all variants?",
      message: "Every other variant's warehouse stock will be replaced with these warehouses and quantities.",
      confirmText: "Copy to all",
    });
    if (!ok) return;
    const src = comboRows(form.combinations[idx]);
    setForm((f) => ({
      ...f,
      combinations: f.combinations.map((c) => ({ ...c, warehouse_stock: src.map((r) => ({ ...r })) })),
    }));
  };

  const warehouseName = (id) => {
    const key = typeof id === "object" ? id?._id : id;
    return warehouses.find((w) => w._id === key)?.name || "Warehouse";
  };

  
  const clampDiscount = (type, raw) => {
    if (raw === "" || raw === null || raw === undefined) return "";
    const n = Number(raw);
    if (Number.isNaN(n)) return raw;
    if (n < 0) return "0";
    if (type !== "flat" && n > 100) return "100";
    return raw;
  };

  const discountError = (type, value, base, priceLabel = "base price") => {
    const n = Number(value) || 0;
    if (n <= 0) return "";
    if (type === "flat") {
      const b = Number(base) || 0;
      if (b <= 0) return "Enter the base price first.";
      return n > b ? `Flat discount can't be more than the ${priceLabel} (${formatMoney(b)}).` : "";
    }
    return n > 100 ? "Percentage discount can't be more than 100." : "";
  };


  const comboHasOwnPrice = (c) => c.price !== "" && c.price !== null && c.price !== undefined && Number(c.price) > 0;
  const comboBase = (c) => (comboHasOwnPrice(c) ? Number(c.price) : Number(form.price) || 0);
  const comboDiscountError = (c) =>
    discountError(c.discount_type, c.discount_percentage, comboBase(c), comboHasOwnPrice(c) ? "variant price" : "base price");

  const discountHint = (type, base, priceLabel = "base price") =>
    type === "flat"
      ? Number(base) > 0
        ? `Max ${formatMoney(base)} (the ${priceLabel})`
        : "Enter the base price first"
      : "Max 100%";

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const isVariable = form.product_type === "variable";

    if (isVariable && form.combinations.length === 0) {
      setError("Generate at least one combination, or switch to a simple product.");
      return;
    }

    if (!isVariable) {
      const msg = discountError(form.discount_type, form.discount_percentage, form.price);
      if (msg) {
        setError(msg);
        toast.error(msg);
        return;
      }
    } else {
      for (const c of form.combinations) {
        const msg = comboDiscountError(c);
        if (msg) {
          const full = `${c.label || c.sku}: ${msg}`;
          setError(full);
          toast.error(full);
          return;
        }
        const rows = comboRows(c).filter((w) => w.warehouse_id);
        if (new Set(rows.map((w) => w.warehouse_id)).size !== rows.length) {
          const full = `${c.label || c.sku}: the same warehouse is listed more than once.`;
          setError(full);
          toast.error(full);
          return;
        }
      }
    }

    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      description: form.description,
      category_id: form.category_id || null,
      sku: form.sku || null,
      price: Number(form.price) || 0,
      stock_qty: isVariable ? 0 : Number(form.stock_qty) || 0,
      warehouse_stock: isVariable
        ? []
        : form.warehouse_stock
            .filter((w) => w.warehouse_id)
            .map((w) => ({ warehouse_id: w.warehouse_id, qty: Number(w.qty) || 0 })),
      images: form.images,
      length_cm: form.length_cm ? Number(form.length_cm) : null,
      width_cm: form.width_cm ? Number(form.width_cm) : null,
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      discount_type: form.discount_type,
      discount_percentage: Number(form.discount_percentage) || 0,
      tax_type: form.tax_type,
      tax_percentage: Number(form.tax_percentage) || 0,
      product_type: isVariable ? "variable" : "simple",
      variants: isVariable ? form.selectedVariants : [],
      combination_separator: form.combination_separator,
      combinations: isVariable
        ? form.combinations.map((c) => {
            const rows = comboRows(c)
              .filter((w) => w.warehouse_id)
              .map((w) => ({ warehouse_id: w.warehouse_id, qty: Number(w.qty) || 0 }));
            return {
            ...c,
            price: c.price === "" || c.price === null ? Number(form.price) || 0 : Number(c.price),
            warehouse_stock: rows,
            stock: rows.length > 0 ? rows.reduce((sum, w) => sum + w.qty, 0) : Number(c.stock) || 0,
            discount_percentage: Number(c.discount_percentage) || 0,
            tax_percentage: Number(c.tax_percentage) || 0,
            };
          })
        : [],
    };

    setSaving(true);
    try {
      if (form._id) {
        await client.put(`/seller/products/${form._id}`, payload);
      } else {
        await client.post("/seller/products", payload);
      }
      setShowForm(false);
      setForm(emptyForm);
      toast.success(form._id ? "Product updated." : "Product created.");
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      toast.error(err.response?.data?.error || err.message || "Could not save product.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    const ok = await confirmAction({
      title: "Remove this product?",
      message: "It will be removed from your storefront and can no longer be ordered.",
      confirmText: "Remove product",
      danger: true,
    });
    if (!ok) return;
    try {
      await client.delete(`/seller/products/${id}`);
      toast.success("Product removed.");
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      toast.error(err.response?.data?.error || err.message || "Could not remove product.");
    }
  };

  const configuringCombo = configuringIdx !== null ? form.combinations[configuringIdx] : null;

  const dimensionsLabel = (p) =>
    p.length_cm && p.width_cm && p.height_cm ? `${p.length_cm} x ${p.width_cm} x ${p.height_cm}` : "—";

  const computeFinalPrice = (price, discountType, discountValue, taxType, taxValue) => {
    const base = Number(price) || 0;
    const discount =
      discountType === "flat" ? Number(discountValue) || 0 : (base * (Number(discountValue) || 0)) / 100;
    const afterDiscount = Math.max(base - discount, 0);
    const tax = taxType === "flat" ? Number(taxValue) || 0 : (afterDiscount * (Number(taxValue) || 0)) / 100;
    return afterDiscount + tax;
  };

  const totalStock = (p) =>
    p.product_type === "variable"
      ? (p.combinations || []).reduce((sum, c) => sum + (Number(c.stock) || 0), 0)
      : p.stock_qty ?? 0;

  const openView = (p) => {
    setViewingProduct(p);
    setViewTab("description");
    setVariantGallery(null);
  };

  const categoryName = (p) => {
    if (!p.category_id) return "—";
    const cat = categories.find((c) => c._id === p.category_id || c._id === p.category_id?._id);
    return cat?.name || (typeof p.category_id === "object" ? p.category_id.name : "—") || "—";
  };

  const VIEW_TABS = [
    { key: "description", label: "Description" },
    { key: "specifications", label: "Specifications" },
    ...(viewingProduct?.product_type === "variable" ? [{ key: "variants", label: "Variants" }] : []),
    { key: "inventory", label: "Inventory" },
    { key: "system", label: "System Info" },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Products</h1>
        <button
          className="btn btn-primary"
          onClick={startNew}
          disabled={!kycApproved}
          title={!kycApproved ? "Complete KYC verification before adding products" : undefined}
        >
          + Add product
        </button>
      </div>

      {!kycApproved && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          Your KYC verification isn't approved yet, so you can't add new products.{" "}
          <Link to="/seller/kyc">Complete KYC</Link> to unlock product listing.
        </div>
      )}

      <ErrorBox message={!showForm ? error : ""} />

      {showForm && (
        <form className="panel form-panel" onSubmit={submit}>
          <h2>{form._id ? "Edit product" : "Add New Product"}</h2>

          <ErrorBox message={error} />

          <div style={{ marginBottom: 8 }}>
            <strong>Basic Information</strong>
          </div>
          <div className="form-row">
            <Field label="Product Name *">
              <input className="input" placeholder="e.g. Wireless Mouse" value={form.name} onChange={update("name")} required />
            </Field>
            <Field label="Category">
              <select className="input" value={form.category_id} onChange={update("category_id")}>
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="form-row">
            <Field label="SKU (Stock Keeping Unit) *">
              <input className="input" placeholder="e.g. WM-BLK-01" value={form.sku} onChange={update("sku")} />
            </Field>
            <Field label="Base Price *">
              <input
                className="input"
                type="number" min="0"
                placeholder="0.00"
                value={form.price}
                onChange={update("price")}
                required
              />
            </Field>
          </div>
          <Field label="Description">
            <textarea className="input" placeholder="Describe the product…" value={form.description} onChange={update("description")} />
          </Field>

          <div style={{ margin: "16px 0 8px" }}>
            <strong>Product Images</strong>
          </div>
          <ImageUploader value={form.images} onChange={(images) => setForm((f) => ({ ...f, images }))} />

          <div style={{ margin: "16px 0 8px" }}>
            <strong>Dimensions & Weight</strong>
          </div>
          <div className="form-row form-row-3">
            <Field label="Length (cm)">
              <input className="input" type="number" min="0" placeholder="0" value={form.length_cm} onChange={update("length_cm")} />
            </Field>
            <Field label="Width (cm)">
              <input className="input" type="number" min="0" placeholder="0" value={form.width_cm} onChange={update("width_cm")} />
            </Field>
            <Field label="Height (cm)">
              <input className="input" type="number" min="0" placeholder="0" value={form.height_cm} onChange={update("height_cm")} />
            </Field>
          </div>
          <Field label="Weight (kg)">
            <input className="input" type="number" min="0" placeholder="0" value={form.weight_kg} onChange={update("weight_kg")} />
          </Field>

          <div style={{ margin: "16px 0 8px" }}>
            <strong>Product Type</strong>
          </div>
          <Switch
            checked={form.product_type === "variable"}
            onChange={(val) => setForm((f) => ({ ...f, product_type: val ? "variable" : "simple" }))}
            label={form.product_type === "variable" ? "Variable Product (Has Variants)" : "Simple Product (No Variants)"}
          />

          {form.product_type === "simple" ? (
            <>
              <div style={{ margin: "16px 0 8px" }}>
                <strong>Product Details</strong>
              </div>
              <div className="form-row">
                <Field label="Stock Quantity">
                  <input
                    className="input"
                    type="number" min="0"
                    placeholder="0"
                    value={form.warehouse_stock.length > 0 ? warehouseStockTotal : form.stock_qty}
                    onChange={update("stock_qty")}
                    disabled={form.warehouse_stock.length > 0}
                    title={form.warehouse_stock.length > 0 ? "Auto-calculated from warehouse stock below" : undefined}
                  />
                </Field>
              </div>

              <div style={{ margin: "16px 0 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <strong>Stock by Warehouse (optional)</strong>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={addWarehouseRow}
                  disabled={warehouses.length === 0 || form.warehouse_stock.length >= warehouses.length}
                  title={
                    warehouses.length > 0 && form.warehouse_stock.length >= warehouses.length
                      ? `You've added all ${warehouses.length} warehouse${warehouses.length === 1 ? "" : "s"} already.`
                      : undefined
                  }
                >
                  + Add warehouse
                </button>
              </div>
              {warehouses.length === 0 ? (
                <p className="muted small">No warehouses set up yet — add one under Warehouses to split stock by location.</p>
              ) : form.warehouse_stock.length === 0 ? (
                <p className="muted small">Leave empty to just track total stock above, or add warehouses to split it by location.</p>
              ) : (
                <>
                  {(() => {
                    const usedWarehouseIds = new Set(form.warehouse_stock.map((w) => w.warehouse_id).filter(Boolean));
                    return form.warehouse_stock.map((row, idx) => (
                    <div className="form-row" key={idx}>
                      <Field label="Warehouse">
                        <select
                          className="input"
                          value={row.warehouse_id}
                          onChange={(e) => updateWarehouseRow(idx, { warehouse_id: e.target.value })}
                        >
                          <option value="">Select warehouse…</option>
                          {warehouses.map((w) => (
                            <option
                              key={w._id}
                              value={w._id}
                              disabled={!w.is_active || (usedWarehouseIds.has(w._id) && w._id !== row.warehouse_id)}
                            >
                              {w.name}
                              {!w.is_active ? " (deactivated)" : ""}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Qty">
                        <input
                          className="input"
                          type="number" min="0"
                          placeholder="0"
                          value={row.qty}
                          onChange={(e) => updateWarehouseRow(idx, { qty: e.target.value })}
                        />
                      </Field>
                      <button type="button" className="btn btn-ghost danger" onClick={() => removeWarehouseRow(idx)} style={{ alignSelf: "flex-end", marginBottom: 0 }}>
                        Remove
                      </button>
                    </div>
                    ));
                  })()}
                  <p className="muted small">
                    Total across warehouses: {warehouseStockTotal}
                    {form.warehouse_stock.length >= warehouses.length
                      ? " — you've added every warehouse you have."
                      : ""}
                  </p>
                </>
              )}

              <div style={{ margin: "16px 0 8px" }}>
                <strong>Discount & Tax Settings</strong>
              </div>
              <div className="form-row form-row-3">
                <Field label="Discount Type">
                  <select
                    className="input"
                    value={form.discount_type}
                    onChange={(e) => {
                      const type = e.target.value;
                      setForm((f) => ({ ...f, discount_type: type, discount_percentage: clampDiscount(type, f.discount_percentage) }));
                    }}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat amount</option>
                  </select>
                </Field>
                <Field label="Discount Value">
                  <input
                    className="input"
                    type="number" min="0"
                    max={form.discount_type === "flat" ? Number(form.price) || undefined : 100}
                    placeholder="0"
                    value={form.discount_percentage}
                    onChange={(e) => {
                      const value = clampDiscount(form.discount_type, e.target.value);
                      setForm((f) => ({ ...f, discount_percentage: value }));
                    }}
                  />
                  {discountError(form.discount_type, form.discount_percentage, form.price) ? (
                    <span className="field-error">{discountError(form.discount_type, form.discount_percentage, form.price)}</span>
                  ) : (
                    <span className="field-hint">{discountHint(form.discount_type, form.price)}</span>
                  )}
                </Field>
              </div>
              <div className="form-row form-row-3">
                <Field label="Tax Type">
                  <select className="input" value={form.tax_type} onChange={update("tax_type")}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat amount</option>
                  </select>
                </Field>
                <Field label="Tax Value">
                  <input
                    className="input"
                    type="number" min="0"
                    placeholder="0"
                    value={form.tax_percentage}
                    onChange={update("tax_percentage")}
                  />
                </Field>
              </div>
            </>
          ) : (
            <>
              <div style={{ margin: "16px 0 8px" }}>
                <strong>Variant Configuration</strong>
              </div>
              {availableVariants.length === 0 ? (
                <div className="muted small" style={{ marginBottom: 12 }}>
                  You don't have any product variants yet.{" "}
                  <a href="/seller/product-variants">Create one first</a> (e.g. Size, Color), then come back here.
                </div>
              ) : (
                <>
                  <div className="muted small" style={{ marginBottom: 8 }}>Choose variants (e.g. Color, Size)</div>
                  <div style={{ marginBottom: 12 }}>
                    {availableVariants.map((v) => {
                      const selected = form.selectedVariants.some((sv) => sv.variant_id === v._id);
                      return (
                        <button
                          type="button"
                          key={v._id}
                          className={`variant-chip`}
                          style={{
                            cursor: "pointer",
                            border: "1px solid var(--line, #ddd)",
                            background: selected ? "var(--brand, #4f46e5)" : "#f2f2f7",
                            color: selected ? "#fff" : "#222",
                          }}
                          onClick={() => toggleVariant(v)}
                        >
                          {v.name}
                        </button>
                      );
                    })}
                  </div>

                  {form.selectedVariants.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div className="muted small" style={{ marginBottom: 8 }}>Selected Variants & Options</div>
                      {form.selectedVariants.map((v) => (
                        <div className="variant-chip-group" key={v.variant_id}>
                          <div className="variant-chip-group-title">{v.name}</div>
                          {v.options.map((opt) => (
                            <span className="variant-chip" key={opt}>
                              {opt}
                            </span>
                          ))}
                        </div>
                      ))}
                      <button type="button" className="btn btn-primary" onClick={generateCombinations}>
                        ⟳ Generate Combinations
                      </button>
                    </div>
                  )}

                  {form.combinations.length > 0 && (
                    <>
                      <div className="form-row" style={{ alignItems: "center", marginBottom: 12 }}>
                        <label className="muted small">Separator</label>
                        <select
                          className="input"
                          style={{ maxWidth: 180 }}
                          value={form.combination_separator}
                          onChange={(e) => setForm((f) => ({ ...f, combination_separator: e.target.value }))}
                        >
                          {SEPARATORS.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                        <button type="button" className="btn btn-ghost" onClick={regenerateSkus}>
                          ⟳ Regenerate All SKUs
                        </button>
                      </div>

                      <div style={{ margin: "8px 0" }}>
                        <strong>Product Combinations ({form.combinations.length})</strong>
                      </div>

                      <div className="combo-table-wrap">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Combination</th>
                              <th>SKU</th>
                              <th>Price</th>
                              <th>Stock</th>
                              <th>Discount & Tax/Images</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {form.combinations.map((c, idx) => {
                              const rows = comboRows(c);
                              const hasWh = rows.length > 0;
                              const dErr = comboDiscountError(c);
                              const usedInCombo = new Set(rows.map((w) => w.warehouse_id));
                              return (
                                <Fragment key={idx}>
                                  <tr>
                                    <td>{c.label}</td>
                                    <td>
                                      <input
                                        className="input"
                                        value={c.sku}
                                        onChange={(e) => updateCombination(idx, { sku: e.target.value })}
                                      />
                                    </td>
                                    <td>
                                      <input
                                        className="input"
                                        type="number" min="0"
                                        placeholder={form.price ? `${form.price} (base price)` : "Price"}
                                        value={c.price}
                                        onChange={(e) => updateCombination(idx, { price: e.target.value })}
                                      />
                                    </td>
                                    <td>
                                      <input
                                        className="input"
                                        type="number" min="0"
                                        value={hasWh ? comboWarehouseTotal(c) : c.stock}
                                        disabled={hasWh}
                                        title={hasWh ? "Auto-calculated from the warehouse stock of this variant" : undefined}
                                        onChange={(e) => updateCombination(idx, { stock: e.target.value })}
                                      />
                                      <button
                                        type="button"
                                        className="combo-wh-toggle"
                                        onClick={() => toggleWarehousePanel(idx)}
                                        disabled={warehouses.length === 0}
                                        title={warehouses.length === 0 ? "Add a warehouse under Warehouses first" : undefined}
                                      >
                                        {hasWh ? `Warehouses (${rows.length}) ${whOpen[idx] ? "▴" : "▾"}` : "+ Warehouse stock"}
                                      </button>
                                    </td>
                                    <td>
                                      <button
                                        type="button"
                                        className={`btn btn-ghost ${dErr ? "danger" : ""}`}
                                        title={dErr || undefined}
                                        onClick={() => setConfiguringIdx(idx)}
                                      >
                                        {dErr ? "⚠ " : ""}
                                        Discount: {c.discount_type === "flat" ? formatMoney(c.discount_percentage || 0) : `${c.discount_percentage || 0}%`} · Tax:{" "}
                                        {c.tax_type === "flat" ? formatMoney(c.tax_percentage || 0) : `${c.tax_percentage || 0}%`}
                                      </button>
                                    </td>
                                    <td className="table-actions">
                                      <button type="button" className="icon-btn" onClick={() => removeCombination(idx)}>
                                        🗑
                                      </button>
                                    </td>
                                  </tr>

                                  {whOpen[idx] && (
                                    <tr className="combo-wh-row">
                                      <td colSpan={6}>
                                        <div className="combo-wh-panel">
                                          <div className="combo-wh-head">
                                            <strong>Stock by Warehouse — {c.label}</strong>
                                            <div className="combo-wh-actions">
                                              <button
                                                type="button"
                                                className="btn btn-ghost"
                                                onClick={() => addComboWarehouse(idx)}
                                                disabled={rows.length >= warehouses.length}
                                                title={
                                                  rows.length >= warehouses.length
                                                    ? `You've added all ${warehouses.length} warehouse${warehouses.length === 1 ? "" : "s"} already.`
                                                    : undefined
                                                }
                                              >
                                                + Add warehouse
                                              </button>
                                              {form.combinations.length > 1 && hasWh && (
                                                <button type="button" className="btn btn-ghost" onClick={() => copyWarehousesToAll(idx)}>
                                                  Copy to all variants
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                          {!hasWh ? (
                                            <p className="muted small">
                                              No warehouse rows — this variant just uses the stock number above. Add a warehouse to split it by location.
                                            </p>
                                          ) : (
                                            <>
                                              {rows.map((row, rowIdx) => (
                                                <div className="form-row" key={rowIdx}>
                                                  <Field label="Warehouse">
                                                    <select
                                                      className="input"
                                                      value={row.warehouse_id}
                                                      onChange={(e) => updateComboWarehouse(idx, rowIdx, { warehouse_id: e.target.value })}
                                                    >
                                                      <option value="">Select warehouse…</option>
                                                      {warehouses.map((w) => (
                                                        <option
                                                          key={w._id}
                                                          value={w._id}
                                                          disabled={!w.is_active || (usedInCombo.has(w._id) && w._id !== row.warehouse_id)}
                                                        >
                                                          {w.name}
                                                          {!w.is_active ? " (deactivated)" : ""}
                                                        </option>
                                                      ))}
                                                    </select>
                                                  </Field>
                                                  <Field label="Qty">
                                                    <input
                                                      className="input"
                                                      type="number" min="0"
                                                      placeholder="0"
                                                      value={row.qty}
                                                      onChange={(e) => updateComboWarehouse(idx, rowIdx, { qty: e.target.value })}
                                                    />
                                                  </Field>
                                                  <button
                                                    type="button"
                                                    className="btn btn-ghost danger"
                                                    onClick={() => removeComboWarehouse(idx, rowIdx)}
                                                    style={{ alignSelf: "flex-end", marginBottom: 0 }}
                                                  >
                                                    Remove
                                                  </button>
                                                </div>
                                              ))}
                                              <p className="muted small">Total across warehouses: {comboWarehouseTotal(c)}</p>
                                            </>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}

          <div className="form-row" style={{ marginTop: 20 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : form._id ? "Save changes" : "Submit"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <Loading />
      ) : products.length === 0 ? (
        <EmptyState>No products yet. Add your first product above.</EmptyState>
      ) : (
        <div className="panel">
          <TableSearch query={productQuery} onChange={setProductQuery} shown={filteredProducts.length} total={products.length} placeholder="Search products by name, category, SKU…" />
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Type</th>
                <th>Value</th>
                <th>Weight (Kg)</th>
                <th>Dimensions (L/W/H)</th>
                <th>Quantity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedProducts.map((p) => (
                <tr key={p._id}>
                  <td className="muted small">{p.sku || "-"}</td>
                  <td>{p.name}</td>
                  <td>
                    <span className={`badge ${p.product_type === "variable" ? "badge-active" : ""}`}>
                      {p.product_type === "variable" ? "Variable" : "Simple"}
                    </span>
                  </td>
                  <td>{formatMoney(p.price)}</td>
                  <td>{p.weight_kg ?? "—"}</td>
                  <td>{dimensionsLabel(p)}</td>
                  <td>
                    {p.product_type === "variable"
                      ? (p.combinations || []).reduce((sum, c) => sum + (Number(c.stock) || 0), 0)
                      : p.stock_qty ?? "—"}
                  </td>
                  <td className="table-actions">
                    <button className="btn-icon" onClick={() => openView(p)} title="View">
                      <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
                        <path d="M1.7 10S4.5 4.3 10 4.3 18.3 10 18.3 10 15.5 15.7 10 15.7 1.7 10 1.7 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                        <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </button>
                    <button className="btn-icon" onClick={() => startEdit(p)} title="Edit">
                      <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
                        <path d="M12.9 3.5 16.5 7 7.4 16.1l-4 .9.9-4L12.9 3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button className="btn-icon danger" onClick={() => remove(p._id)} title="Delete">
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

      {configuringCombo && (
        <Modal title={`Configure: ${configuringCombo.label}`} onClose={() => setConfiguringIdx(null)} width={520}>
          <div style={{ marginBottom: 8 }}>
            <strong>Images for this variant</strong>
          </div>
          <p className="muted small" style={{ marginTop: 0, marginBottom: 10 }}>
            Optional — shown to customers instead of the product's main photos once they pick this
            option. Leave empty to just use the main product images.
          </p>
          <div style={{ marginBottom: 20 }}>
            <ImageUploader
              value={configuringCombo.images || []}
              onChange={(images) => updateCombination(configuringIdx, { images })}
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <strong>Discount</strong>
          </div>
          <div className="form-row form-row-3" style={{ marginBottom: 4 }}>
            <select
              className="input"
              value={configuringCombo.discount_type}
              onChange={(e) => {
                const type = e.target.value;
                updateCombination(configuringIdx, {
                  discount_type: type,
                  discount_percentage: clampDiscount(type, configuringCombo.discount_percentage),
                });
              }}
            >
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat amount</option>
            </select>
            <input
              className="input"
              type="number" min="0"
              max={configuringCombo.discount_type === "flat" ? comboBase(configuringCombo) || undefined : 100}
              value={configuringCombo.discount_percentage}
              onChange={(e) =>
                updateCombination(configuringIdx, {
                  discount_percentage: clampDiscount(configuringCombo.discount_type, e.target.value),
                })
              }
            />
          </div>
          {comboDiscountError(configuringCombo) ? (
            <p className="field-error" style={{ marginTop: 0, marginBottom: 16 }}>{comboDiscountError(configuringCombo)}</p>
          ) : (
            <p className="field-hint" style={{ marginTop: 0, marginBottom: 16 }}>
              {discountHint(configuringCombo.discount_type, comboBase(configuringCombo), comboHasOwnPrice(configuringCombo) ? "variant price" : "base price")}
            </p>
          )}

          <div style={{ marginBottom: 8 }}>
            <strong>Tax</strong>
          </div>
          <div className="form-row form-row-3">
            <select
              className="input"
              value={configuringCombo.tax_type}
              onChange={(e) => updateCombination(configuringIdx, { tax_type: e.target.value })}
            >
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat amount</option>
            </select>
            <input
              className="input"
              type="number" min="0"
              value={configuringCombo.tax_percentage}
              onChange={(e) => updateCombination(configuringIdx, { tax_percentage: e.target.value })}
            />
          </div>

          <div className="form-row" style={{ marginTop: 20, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-primary" onClick={() => setConfiguringIdx(null)}>
              Done
            </button>
          </div>
        </Modal>
      )}

      {viewingProduct && (
        <Modal title="Product Details" onClose={() => setViewingProduct(null)} width={760}>
          <div className="product-view-header">
            <div className="product-view-image">
              {viewingProduct.images?.[0] ? (
                <img src={resolveMediaUrl(viewingProduct.images[0])} alt={viewingProduct.name} />
              ) : (
                <div className="product-view-image-empty">No Image Available</div>
              )}
            </div>

            <div className="product-view-summary">
              <div className="form-row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ margin: 0 }}>{viewingProduct.name}</h2>
                  <div className="muted small">Code Product: {viewingProduct.sku || "—"}</div>
                </div>
                <span className={`badge ${viewingProduct.is_active === false ? "badge-out" : "badge-active"}`}>
                  {viewingProduct.is_active === false ? "Inactive" : "Active"}
                </span>
              </div>

              <div className="product-view-grid">
                <div>
                  <div className="muted small">Product Type</div>
                  <strong>{viewingProduct.product_type === "variable" ? "Variable" : "Simple"}</strong>
                </div>
                <div>
                  <div className="muted small">Price</div>
                  <strong style={{ color: "var(--brand, #4f46e5)" }}>{formatMoney(viewingProduct.price)}</strong>
                </div>
                <div>
                  <div className="muted small">Category</div>
                  <strong>{categoryName(viewingProduct)}</strong>
                </div>
                <div>
                  <div className="muted small">Tax</div>
                  <strong>{viewingProduct.tax_percentage || 0}%</strong>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-ghost danger"
                style={{ marginTop: 12 }}
                onClick={() => {
                  setViewingProduct(null);
                  remove(viewingProduct._id);
                }}
              >
                🗑 Delete
              </button>
            </div>
          </div>

          <div className="tab-strip">
            {VIEW_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`tab-strip-item ${viewTab === t.key ? "tab-strip-item-active" : ""}`}
                onClick={() => setViewTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="tab-strip-content">
            {viewTab === "description" && (
              <p style={{ margin: 0 }}>{viewingProduct.description || "No description provided."}</p>
            )}

            {viewTab === "specifications" && (
              <div className="product-view-grid">
                <div>
                  <div className="muted small">Weight</div>
                  <strong>{viewingProduct.weight_kg ? `${viewingProduct.weight_kg} kg` : "—"}</strong>
                </div>
                <div>
                  <div className="muted small">Dimensions</div>
                  <strong>
                    {viewingProduct.length_cm && viewingProduct.width_cm && viewingProduct.height_cm
                      ? `${viewingProduct.length_cm} × ${viewingProduct.width_cm} × ${viewingProduct.height_cm} cm`
                      : "—"}
                  </strong>
                </div>
                <div>
                  <div className="muted small">Status</div>
                  <span className={`badge ${viewingProduct.is_active === false ? "badge-out" : "badge-active"}`}>
                    {viewingProduct.is_active === false ? "Inactive" : "Active"}
                  </span>
                </div>
                <div>
                  <div className="muted small">Product Type</div>
                  <strong>{viewingProduct.product_type === "variable" ? "Variable Product" : "Simple Product"}</strong>
                </div>
              </div>
            )}

            {viewTab === "variants" && (
              <>
              {variantGallery && (viewingProduct.combinations || [])[variantGallery.idx]?.images?.length > 0 && (
                <VariantGallery
                  label={
                    viewingProduct.combinations[variantGallery.idx].label ||
                    Object.values(viewingProduct.combinations[variantGallery.idx].option_values || {}).join(" / ")
                  }
                  images={viewingProduct.combinations[variantGallery.idx].images}
                  index={variantGallery.img}
                  onIndexChange={(img) => setVariantGallery((g) => ({ ...g, img }))}
                  onClose={() => setVariantGallery(null)}
                />
              )}
              <div className="combo-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sr No</th>
                      <th>Image</th>
                      <th>Variant</th>
                      <th>SKU</th>
                      <th>Price</th>
                      <th>Discount</th>
                      <th>Tax</th>
                      <th>Final Price</th>
                      <th>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewingProduct.combinations || []).map((c, idx) => (
                      <tr key={c._id || idx}>
                        <td>{idx + 1}</td>
                        <td>
                          {(c.images || []).length > 0 ? (
                            <button
                              type="button"
                              className="variant-thumbs"
                              onClick={() => setVariantGallery({ idx, img: 0 })}
                              title="View all images"
                            >
                              {c.images.slice(0, 2).map((img, i) => (
                                <img key={img + i} src={resolveMediaUrl(img)} alt="" />
                              ))}
                              {c.images.length > 2 && <span className="variant-thumbs-more">+{c.images.length - 2}</span>}
                            </button>
                          ) : (
                            <span className="muted small">No image</span>
                          )}
                        </td>
                        <td>{c.label || Object.entries(c.option_values || {}).map(([k, v]) => `${k}: ${v}`).join(" | ")}</td>
                        <td className="muted small">{c.sku}</td>
                        <td>{formatMoney(c.price)}</td>
                        <td>{c.discount_percentage ? `${c.discount_percentage}${c.discount_type === "flat" ? "" : "%"}` : "-"}</td>
                        <td>{c.tax_percentage ? `${c.tax_percentage}${c.tax_type === "flat" ? "" : "%"}` : "-"}</td>
                        <td style={{ color: "var(--brand, #4f46e5)", fontWeight: 600 }}>
                          {formatMoney(
                            computeFinalPrice(c.price, c.discount_type, c.discount_percentage, c.tax_type, c.tax_percentage)
                          )}
                        </td>
                        <td>
                          <span className="badge badge-active">{c.stock ?? 0}</span>
                          {(c.warehouse_stock || []).length > 0 && (
                            <div className="muted small" style={{ marginTop: 4 }}>
                              {c.warehouse_stock.map((w) => `${warehouseName(w.warehouse_id)}: ${w.qty}`).join(" · ")}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}

            {viewTab === "inventory" && (
              <div className="product-view-grid">
                {viewingProduct.product_type === "variable" ? (
                  <>
                    <div className="stat-box">
                      <div className="muted small">Total Stock</div>
                      <strong style={{ fontSize: "1.3rem" }}>{totalStock(viewingProduct)}</strong>
                    </div>
                    <div className="stat-box">
                      <div className="muted small">Variants Count</div>
                      <strong style={{ fontSize: "1.3rem" }}>{(viewingProduct.combinations || []).length}</strong>
                    </div>
                  </>
                ) : (
                  <div className="stat-box">
                    <div className="muted small">Stock Quantity</div>
                    <strong style={{ fontSize: "1.3rem" }}>{viewingProduct.stock_qty ?? 0}</strong>
                  </div>
                )}
              </div>
            )}

            {viewTab === "system" && (
              <div className="product-view-grid">
                <div>
                  <div className="muted small">Product ID</div>
                  <div style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{viewingProduct._id}</div>
                </div>
                <div>
                  <div className="muted small">Created At</div>
                  <strong>{formatDateTime(viewingProduct.created_at)}</strong>
                </div>
                <div>
                  <div className="muted small">Last Updated</div>
                  <strong>{formatDateTime(viewingProduct.updated_at)}</strong>
                </div>
                <div>
                  <div className="muted small">Status</div>
                  <span className={`badge ${viewingProduct.is_active === false ? "badge-out" : "badge-active"}`}>
                    {viewingProduct.is_active === false ? "Inactive" : "Active"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
