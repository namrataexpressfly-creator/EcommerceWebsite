import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import client from "../api/client";
import { useCustomerAuth } from "./CustomerAuthContext";

const CartContext = createContext(null);

function storageKey(slug) {
  return `expressfly_cart_${slug}`;
}


function sameLine(item, productId, combinationId) {
  return item.product_id === productId && (item.combination_id || null) === (combinationId || null);
}

export function CartProvider({ children }) {
  const { slug } = useParams();
  const key = storageKey(slug || "default");
  const { customer, isLoggedIn, pushCart } = useCustomerAuth();
  const hydratedForPhone = useRef(null);
  const wasLoggedIn = useRef(false);
  const [hydrated, setHydrated] = useState(false);

  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setItems(raw ? JSON.parse(raw) : []);
    } catch {
      setItems([]);
    }
  }, [key]);

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(items));
  }, [items, key]);


  useEffect(() => {
    if (isLoggedIn) {
      wasLoggedIn.current = true;
      return;
    }
    if (wasLoggedIn.current) {
      wasLoggedIn.current = false;
      hydratedForPhone.current = null;
      setHydrated(false);
      setItems([]);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !slug) return;
    if (hydratedForPhone.current === customer.phone) return;
    hydratedForPhone.current = customer.phone;

    const saved = customer.cart || [];
    if (!saved.length) {
      setHydrated(true);
      return;
    }

    (async () => {
      const results = await Promise.all(
        saved.map((ci) =>
          client
            .get(`/store/${slug}/products/${ci.product_id}`)
            .then((r) => ({ product: r.data, quantity: ci.quantity, combination_id: ci.combination_id || null }))
            .catch(() => null)
        )
      );
      setItems((prev) => {
        const merged = [...prev];
        results.filter(Boolean).forEach(({ product, quantity, combination_id }) => {
          const hasVariants = (product.combinations || []).length > 0;
          const combo = combination_id
            ? (product.combinations || []).find((c) => String(c._id) === String(combination_id))
            : null;

          if (hasVariants && !combo) return;
          if (merged.some((i) => sameLine(i, product._id, combo ? String(combo._id) : null))) return;
          merged.push({
            product_id: product._id,
            combination_id: combo ? String(combo._id) : null,
            variant_label: combo?.label || "",
            name: product.name,
            price: combo?.price != null ? combo.price : product.price,
            image: (combo?.images?.length ? combo.images : product.images)?.[0] || null,
            quantity,
          });
        });
        return merged;
      });
      setHydrated(true);
    })();
  }, [isLoggedIn, customer, slug]);

  useEffect(() => {
    if (!isLoggedIn || !hydrated) return;
    pushCart(items);

  }, [items, isLoggedIn, hydrated]);

  const addItem = (product, quantity = 1, combination = null) => {
    const combinationId = combination?._id || null;
    setItems((prev) => {
      const existing = prev.find((i) => sameLine(i, product._id, combinationId));
      if (existing) {
        return prev.map((i) =>
          sameLine(i, product._id, combinationId) ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          product_id: product._id,
          combination_id: combinationId,
          variant_label: combination?.label || "",
          name: product.name,
          price: combination?.price != null ? combination.price : product.price,
          image: (combination?.images?.length ? combination.images : product.images)?.[0] || null,
          quantity,
        },
      ];
    });
  };

  const updateQuantity = (productId, quantity, combinationId = null) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => !sameLine(i, productId, combinationId))
        : prev.map((i) => (sameLine(i, productId, combinationId) ? { ...i, quantity } : i))
    );
  };

  const removeItem = (productId, combinationId = null) => {
    setItems((prev) => prev.filter((i) => !sameLine(i, productId, combinationId)));
  };

  const clearCart = () => setItems([]);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  const totalQuantity = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  return (
    <CartContext.Provider
      value={{ items, addItem, updateQuantity, removeItem, clearCart, subtotal, totalQuantity }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
