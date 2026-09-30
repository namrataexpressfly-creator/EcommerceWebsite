
export function StarRating({ value = 0, size = 14, showValue = false, count }) {
  const stars = [1, 2, 3, 4, 5].map((n) => {
    const diff = value - n + 1;
    if (diff >= 1) return "full";
    if (diff >= 0.5) return "half";
    return "empty";
  });

  return (
    <span className="star-rating" style={{ fontSize: size }}>
      {stars.map((state, i) => (
        <span key={i} className={`star star-${state}`}>
          ★
        </span>
      ))}
      {showValue && <span className="star-rating-value">{value.toFixed(1)}</span>}
      {typeof count === "number" && <span className="star-rating-count">({count})</span>}
    </span>
  );
}

export function StarInput({ value, onChange, size = 22 }) {
  return (
    <span className="star-input" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star star-input-btn ${n <= value ? "star-full" : "star-empty"}`}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </span>
  );
}
