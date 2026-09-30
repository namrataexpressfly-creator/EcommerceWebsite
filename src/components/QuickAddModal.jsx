import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { resolveMediaUrl } from "../api/client";
import { formatMoney } from "../utils/format";

export default function QuickAddModal({ product, onClose, onAddToCart, onBuyNow }) {
  const variants = product.variants || [];
  const combos = (product.combinations || []).filter((c) => c.is_active !== false);


  const [selected, setSelected] = useState(() =>
    Object.fromEntries(variants.filter((v) => v.options?.length === 1).map((v) => [v.name, v.options[0]]))
  );
  const [qty, setQty] = useState(1);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const matches = (combo, sel) => Object.entries(sel).every(([name, val]) => combo.option_values?.[name] === val);

  const allSelected = variants.every((v) => selected[v.name]);
  const combo = allSelected ? combos.find((c) => matches(c, selected)) : null;


  const isAvailable = (name, opt) => {
    const others = Object.fromEntries(Object.entries(selected).filter(([n]) => n !== name));
    return combos.some((c) => c.stock > 0 && c.option_values?.[name] === opt && matches(c, others));
  };

  const pick = (name, opt) => {
    setSelected((prev) => {
      const next = { ...prev, [name]: opt };

      for (const [n, val] of Object.entries(prev)) {
        if (n === name) continue;
        const ok = combos.some(
          (c) => c.stock > 0 && c.option_values?.[name] === opt && c.option_values?.[n] === val
        );
        if (!ok) delete next[n];
      }
      return next;
    });
    setQty(1);
  };

  const swatchImage = (name, opt) =>
    combos.find((c) => c.option_values?.[name] === opt && c.images?.length)?.images?.[0] || null;

  const previewCombo = combo || combos.find((c) => matches(c, selected) && c.images?.length);
  const image = previewCombo?.images?.[0] || product.images?.[0];
  const price = combo ? combo.price ?? product.price : product.price;
  const maxQty = combo ? combo.stock : 1;
  const canBuy = Boolean(combo) && combo.stock > 0;

  let hint = "";
  if (!allSelected) hint = `Select ${variants.map((v) => v.name).join(" and ")} to continue.`;
  else if (!combo) hint = "That combination isn't available — try a different option.";
  else if (combo.stock <= 0) hint = "This option is out of stock.";
  else if (combo.stock <= 5) hint = `Only ${combo.stock} left.`;

  const portalTarget = document.querySelector(".store-shell") || document.body;

  return createPortal(
    <div className="modal-overlay qa-overlay" onClick={onClose}>
      <div className="modal-box qa-box" role="dialog" aria-modal="true" aria-label={product.name} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close qa-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="qa-grid">
          <div className="qa-image">
            {image ? <img src={resolveMediaUrl(image)} alt={product.name} /> : <div className="product-thumb-placeholder">{product.name?.[0] || "?"}</div>}
          </div>

          <div className="qa-info">
            <h3 className="qa-name">{product.name}</h3>
            <div className="qa-price">
              {formatMoney(price)}
              {!combo && product.compare_at_price ? <span className="product-compare">{formatMoney(product.compare_at_price)}</span> : null}
            </div>

            {variants.map((v) => {
              const isColor = /^colou?r$/i.test(v.name);
              return (
                <div className="qa-group" key={v.name}>
                  <div className="qa-label">
                    {v.name}
                    {selected[v.name] ? <strong>: {selected[v.name]}</strong> : null}
                  </div>
                  <div className="variant-picker-options">
                    {v.options.map((opt) => {
                      const isSel = selected[v.name] === opt;
                      const available = isAvailable(v.name, opt);
                      if (isColor) {
                        const img = swatchImage(v.name, opt);
                        return (
                          <button
                            type="button"
                            key={opt}
                            title={opt}
                            disabled={!available}
                            className={`variant-swatch ${isSel ? "variant-swatch-selected" : ""} ${!available ? "variant-swatch-disabled" : ""}`}
                            style={img ? { backgroundImage: `url(${resolveMediaUrl(img)})` } : { backgroundColor: opt.toLowerCase().replace(/\s+/g, "") }}
                            onClick={() => pick(v.name, opt)}
                          />
                        );
                      }
                      return (
                        <button
                          type="button"
                          key={opt}
                          disabled={!available}
                          className={`variant-option-btn ${isSel ? "variant-option-btn-selected" : ""} ${!available ? "variant-option-btn-disabled" : ""}`}
                          onClick={() => pick(v.name, opt)}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {hint && <p className={`qa-hint ${combo && combo.stock > 0 ? "qa-hint-warn" : ""}`}>{hint}</p>}

            <div className="qa-group">
              <div className="qa-label">Quantity</div>
              <div className="qty-stepper">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity">
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max={maxQty}
                  value={qty}
                  onChange={(e) => setQty(Math.min(maxQty, Math.max(1, Number(e.target.value) || 1)))}
                />
                <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={!canBuy || qty >= maxQty} aria-label="Increase quantity">
                  +
                </button>
              </div>
            </div>

            <div className="qa-actions">
              <button type="button" className="btn btn-ghost" disabled={!canBuy} onClick={() => onAddToCart(combo, qty)}>
                Add to cart
              </button>
              <button type="button" className="btn btn-primary" disabled={!canBuy} onClick={() => onBuyNow(combo, qty)}>
                Buy now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    portalTarget
  );
}
