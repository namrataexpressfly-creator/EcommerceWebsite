import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles/index.css";
import "./i18n";
import { ThemeProvider } from "./context/ThemeContext.jsx";


document.addEventListener(
  "wheel",
  () => {
    const el = document.activeElement;
    if (el instanceof HTMLInputElement && el.type === "number") el.blur();
  },
  { passive: true }
);

const allowsNegative = (el) => el.min !== "" && Number(el.min) < 0;
const isNumberInput = (el) => el instanceof HTMLInputElement && el.type === "number";

document.addEventListener("keydown", (e) => {
  if (!isNumberInput(e.target) || allowsNegative(e.target)) return;
  if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
});

document.addEventListener("paste", (e) => {
  if (!isNumberInput(e.target) || allowsNegative(e.target)) return;
  if (/[-+eE]/.test(e.clipboardData?.getData("text") || "")) e.preventDefault();
});

document.addEventListener("input", (e) => {
  const el = e.target;
  if (!isNumberInput(el) || allowsNegative(el) || !(el.valueAsNumber < 0)) return;

  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, "");
  el.dispatchEvent(new Event("input", { bubbles: true }));
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
