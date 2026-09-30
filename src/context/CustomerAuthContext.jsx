import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useStoreSlug } from "./StoreSlugContext";
import {
  sendCustomerOtp,
  customerLogin,
  getCustomerProfile,
  updateCustomerProfile,
  getCustomerToken,
  setCustomerToken,
  clearCustomerToken,
  getCustomerAddresses,
  addCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  syncCustomerCart,
} from "../api/client";

const CustomerAuthContext = createContext(null);

export function CustomerAuthProvider({ children }) {
  const { slug } = useStoreSlug();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    const token = getCustomerToken(slug);
    if (!token) {
      setCustomer(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getCustomerProfile(slug)
      .then((data) => setCustomer(data))
      .catch(() => {
        clearCustomerToken(slug);
        setCustomer(null);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const sendOtp = useCallback((phone) => sendCustomerOtp(slug, phone), [slug]);

  const login = useCallback(
    async (phone, otp, name) => {
      const data = await customerLogin(slug, phone, otp, name);
      setCustomerToken(slug, data.token);
      setCustomer(data.customer);
      return data.customer;
    },
    [slug]
  );

  const logout = useCallback(() => {
    clearCustomerToken(slug);
    setCustomer(null);
  }, [slug]);

  const updateProfile = useCallback(
    async (payload) => {
      const updated = await updateCustomerProfile(slug, payload);
      setCustomer((c) => (c ? { ...c, ...updated } : c));
      return updated;
    },
    [slug]
  );

  const refreshAddresses = useCallback(async () => {
    const addresses = await getCustomerAddresses(slug);
    setCustomer((c) => (c ? { ...c, addresses } : c));
    return addresses;
  }, [slug]);

  const saveAddress = useCallback(
    async (payload) => {
      await addCustomerAddress(slug, payload);
      return refreshAddresses();
    },
    [slug, refreshAddresses]
  );

  const editAddress = useCallback(
    async (id, payload) => {
      await updateCustomerAddress(slug, id, payload);
      return refreshAddresses();
    },
    [slug, refreshAddresses]
  );

  const removeAddress = useCallback(
    async (id) => {
      await deleteCustomerAddress(slug, id);
      return refreshAddresses();
    },
    [slug, refreshAddresses]
  );


  const pushCart = useCallback(
    (items) => {
      if (!getCustomerToken(slug)) return;
      syncCustomerCart(
        slug,
        items.map((i) => ({ product_id: i.product_id, combination_id: i.combination_id || null, quantity: i.quantity }))
      ).catch(() => {});
    },
    [slug]
  );


  const setWishlist = useCallback((wishlist) => {
    setCustomer((c) => (c ? { ...c, wishlist } : c));
  }, []);

  const isLoggedIn = Boolean(customer);

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        loading,
        isLoggedIn,
        sendOtp,
        login,
        logout,
        updateProfile,
        refreshAddresses,
        saveAddress,
        editAddress,
        removeAddress,
        pushCart,
        setWishlist,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  return ctx;
}
