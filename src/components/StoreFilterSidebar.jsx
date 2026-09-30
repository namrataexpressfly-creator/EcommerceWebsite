import { useEffect, useState } from "react";
import { colorToSwatch } from "../utils/colorNames";

export default function StoreFilterSidebar({ open, onClose, categories, priceBounds, availability, variants, values, onApply, onClear }) {
  const [draftCategory, setDraftCategory] = useState(values.category || "");
  const [draftMin, setDraftMin] = useState(values.min_price || "");
  const [draftMax, setDraftMax] = useState(values.max_price || "");
  const [draftAvailability, setDraftAvailability] = useState(values.availability || "");
  const [draftVariants, setDraftVariants] = useState(values.variants || {});
  const [priceError, setPriceError] = useState("");

  useEffect(() => {
    if (open) {
      setPriceError("");
      setDraftCategory(values.category || "");
      setDraftMin(values.min_price || "");
      setDraftMax(values.max_price || "");
      setDraftAvailability(values.availability || "");
      setDraftVariants(values.variants || {});
    }

  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  const toggleVariantValue = (variantName, value) => {
    setDraftVariants((prev) => {
      const current = prev[variantName] || [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      const updated = { ...prev, [variantName]: next };
      if (next.length === 0) delete updated[variantName];
      return updated;
    });
  };

  const validatePrice = (minVal, maxVal) => {
    const hasMin = minVal !== "" && minVal != null;
    const hasMax = maxVal !== "" && maxVal != null;
    if (hasMin && (!Number.isFinite(Number(minVal)) || Number(minVal) < 0)) {
      return "Minimum price can't be negative. Please enter 0 or more.";
    }
    if (hasMax && (!Number.isFinite(Number(maxVal)) || Number(maxVal) < 0)) {
      return "Maximum price can't be negative. Please enter 0 or more.";
    }
    if (hasMin && hasMax && Number(minVal) > Number(maxVal)) {
      return "Minimum price can't be higher than the maximum price.";
    }
    return "";
  };

  const changeMin = (e) => {
    setDraftMin(e.target.value);
    if (priceError) setPriceError(validatePrice(e.target.value, draftMax));
  };
  const changeMax = (e) => {
    setDraftMax(e.target.value);
    if (priceError) setPriceError(validatePrice(draftMin, e.target.value));
  };
  const blockBadKeys = (e) => {
    if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
  };

  const handleApply = () => {
    const problem = validatePrice(draftMin, draftMax);
    if (problem) {
      setPriceError(problem);
      return;
    }
    onApply({
      category: draftCategory,
      min_price: draftMin,
      max_price: draftMax,
      availability: draftAvailability,
      variants: draftVariants,
    });
    onClose();
  };

  const handleClear = () => {
    setDraftCategory("");
    setDraftMin("");
    setDraftMax("");
    setDraftAvailability("");
    setDraftVariants({});
    setPriceError("");
    onClear();
    onClose();
  };

  return (
    <div className="side-panel-overlay" onClick={onClose}>
      <div className="side-panel" onClick={(e) => e.stopPropagation()}>
        <div className="side-panel-header">
          <h3>Filters</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="side-panel-body">
          <div className="filter-group">
            <div className="filter-group-title">Product categories</div>
            <label className="filter-check-row">
              <input
                type="radio"
                name="filter-category"
                checked={draftCategory === ""}
                onChange={() => setDraftCategory("")}
              />
              All categories
            </label>
            {categories.map((c) => (
              <label className="filter-check-row" key={c._id}>
                <input
                  type="radio"
                  name="filter-category"
                  checked={draftCategory === c.slug}
                  onChange={() => setDraftCategory(c.slug)}
                />
                {c.name}
                {typeof c.product_count === "number" && <span className="filter-count">({c.product_count})</span>}
              </label>
            ))}
          </div>

          {availability && (availability.in_stock > 0 || availability.out_of_stock > 0) && (
            <div className="filter-group">
              <div className="filter-group-title">Availability</div>
              <label className="filter-check-row">
                <input
                  type="checkbox"
                  checked={draftAvailability === "in_stock"}
                  onChange={() => setDraftAvailability((v) => (v === "in_stock" ? "" : "in_stock"))}
                />
                Available
                <span className="filter-count">({availability.in_stock})</span>
              </label>
              <label className="filter-check-row">
                <input
                  type="checkbox"
                  checked={draftAvailability === "out_of_stock"}
                  onChange={() => setDraftAvailability((v) => (v === "out_of_stock" ? "" : "out_of_stock"))}
                />
                Out of stock
                <span className="filter-count">({availability.out_of_stock})</span>
              </label>
            </div>
          )}

          <div className="filter-group">
            <div className="filter-group-title">Price</div>
            <div className="filter-price-row">
              <input
                className="input"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder={priceBounds?.min != null ? String(priceBounds.min) : "Min"}
                value={draftMin}
                onChange={changeMin}
                onKeyDown={blockBadKeys}
                onWheel={(e) => e.currentTarget.blur()}
              />
              <span className="muted">to</span>
              <input
                className="input"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder={priceBounds?.max != null ? String(priceBounds.max) : "Max"}
                value={draftMax}
                onChange={changeMax}
                onKeyDown={blockBadKeys}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
            {priceError && (
              <p className="field-error" role="alert" style={{ color: "#dc2626", fontSize: 13, margin: "6px 0 0" }}>
                {priceError}
              </p>
            )}
          </div>

          {(variants || []).map((variant) => {
            const isColor = variant.name.trim().toLowerCase() === "color" || variant.name.trim().toLowerCase() === "colour";
            const selected = draftVariants[variant.name] || [];
            return (
              <div className="filter-group" key={variant.name}>
                <div className="filter-group-title">{variant.name.toUpperCase()}</div>
                {isColor ? (
                  <div className="filter-color-row">
                    {variant.options.map((opt) => {
                      const swatch = colorToSwatch(opt.value);
                      const active = selected.includes(opt.value);
                      return (
                        <button
                          type="button"
                          key={opt.value}
                          className={`filter-color-swatch ${active ? "filter-color-swatch-active" : ""}`}
                          style={swatch ? { background: swatch } : undefined}
                          title={`${opt.value} (${opt.count})`}
                          onClick={() => toggleVariantValue(variant.name, opt.value)}
                        >
                          {!swatch && opt.value[0]}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="filter-chip-row">
                    {variant.options.map((opt) => {
                      const active = selected.includes(opt.value);
                      return (
                        <button
                          type="button"
                          key={opt.value}
                          className={`filter-chip ${active ? "filter-chip-active" : ""}`}
                          onClick={() => toggleVariantValue(variant.name, opt.value)}
                        >
                          {opt.value}
                          <span className="filter-count">({opt.count})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="side-panel-footer filter-footer">
          <button type="button" className="btn btn-ghost" onClick={handleClear}>
            Clear all
          </button>
          <button type="button" className="btn btn-primary" onClick={handleApply}>
            Apply filters
          </button>
        </div>
      </div>
    </div>
  );
}
