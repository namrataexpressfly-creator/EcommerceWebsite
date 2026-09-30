import { createContext, useCallback, useContext, useRef, useState } from "react";
import Modal from "../components/Modal";

const ConfirmContext = createContext(null);

const DEFAULTS = {
  title: "Are you sure?",
  message: "This action cannot be undone.",
  confirmText: "Confirm",
  cancelText: "Cancel",
  danger: false,
};

export function ConfirmProvider({ children }) {
  const [options, setOptions] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((opts = {}) => {
    setOptions({ ...DEFAULTS, ...opts });
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result) => {
    if (resolver.current) {
      resolver.current(result);
      resolver.current = null;
    }
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <Modal
          title={options.title}
          onClose={() => close(false)}
          width={420}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => close(false)}>
                {options.cancelText}
              </button>
              <button
                type="button"
                className={`btn ${options.danger ? "btn-danger" : "btn-primary"}`}
                onClick={() => close(true)}
                autoFocus
              >
                {options.confirmText}
              </button>
            </>
          }
        >
          <p className="confirm-message">{options.message}</p>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}


export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return ctx;
}
