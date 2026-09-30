import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../styles/hover-text.css";

function Tip({ anchor, children }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    const a = anchor.getBoundingClientRect();
    const t = ref.current.getBoundingClientRect();
    const margin = 8;
    const gap = 10;
    const center = a.left + a.width / 2;
    const left = Math.max(margin, Math.min(center - t.width / 2, window.innerWidth - t.width - margin));
    const above = a.top - t.height - gap >= margin; 
    const top = above ? a.top - t.height - gap : a.bottom + gap;
    const arrow = Math.max(14, Math.min(center - left, t.width - 14));
    setPos({ left, top, above, arrow });
  }, [anchor, children]);

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className={`ht-tip${pos ? (pos.above ? " is-above" : " is-below") : ""}`}
      style={pos ? { left: pos.left, top: pos.top, "--ht-arrow": `${pos.arrow}px` } : { left: 0, top: 0, visibility: "hidden" }}
    >
      {children}
    </div>,
    document.body
  );
}


export default function HoverText({ children, tip, lines = 2, width = 220, className = "" }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  const show = () => {
    const el = ref.current;
    if (el && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)) setOpen(true);
  };
  const hide = () => setOpen(false);


  useEffect(() => {
    if (!open) return undefined;
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, [open]);

  return (
    <>
      <div
        ref={ref}
        className={`ht ${className}`.trim()}
        style={{ "--ht-lines": lines, maxWidth: width }}
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        {children}
      </div>
      {open && ref.current && <Tip anchor={ref.current}>{tip ?? children}</Tip>}
    </>
  );
}
