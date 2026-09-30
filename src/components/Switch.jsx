export default function Switch({ checked, onChange, label, disabled = false }) {
  return (
    <label className={`switch-row ${disabled ? "switch-row-disabled" : ""}`}>
      <span
        className={`switch ${checked ? "switch-on" : ""}`}
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
      >
        <span className="switch-thumb" />
      </span>
      {label && <span className="switch-label">{label}</span>}
    </label>
  );
}
