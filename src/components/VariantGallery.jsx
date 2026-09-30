import { useEffect, useRef } from "react";
import { resolveMediaUrl } from "../api/client";
import "../styles/variant-gallery.css";


export default function VariantGallery({ label, images, index, onIndexChange, onClose }) {
  const ref = useRef(null);
  const count = images.length;
  const current = Math.min(index, count - 1);
  const go = (i) => onIndexChange((i + count) % count);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const onKeyDown = (e) => {
    if (e.key === "ArrowLeft") go(current - 1);
    else if (e.key === "ArrowRight") go(current + 1);
    else if (e.key === "Escape") onClose();
  };

  return (
    <div className="vg" tabIndex={0} ref={ref} onKeyDown={onKeyDown} aria-label={`Images for ${label}`}>
      <div className="vg-head">
        <strong className="vg-title">{label}</strong>
        <span className="muted small">
          {current + 1} of {count}
        </span>
        <button type="button" className="vg-close" onClick={onClose} aria-label="Close images">
          ×
        </button>
      </div>

      <div className="vg-stage">
        {count > 1 && (
          <button type="button" className="vg-nav vg-prev" onClick={() => go(current - 1)} aria-label="Previous image">
            ‹
          </button>
        )}
        <img src={resolveMediaUrl(images[current])} alt={`${label} — image ${current + 1}`} />
        {count > 1 && (
          <button type="button" className="vg-nav vg-next" onClick={() => go(current + 1)} aria-label="Next image">
            ›
          </button>
        )}
      </div>

      {count > 1 && (
        <div className="vg-thumbs">
          {images.map((img, i) => (
            <button
              type="button"
              key={img + i}
              className={`vg-thumb${i === current ? " is-active" : ""}`}
              onClick={() => onIndexChange(i)}
              aria-label={`Show image ${i + 1}`}
            >
              <img src={resolveMediaUrl(img)} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
