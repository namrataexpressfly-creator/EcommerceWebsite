import { createContext, useContext } from "react";
import { useParams } from "react-router-dom";


const StoreSlugContext = createContext(null);

export function StoreSlugProvider({ value, children }) {
  return (
    <StoreSlugContext.Provider value={value}>
      {children}
    </StoreSlugContext.Provider>
  );
}

export function useStoreSlug() {
  const ctx = useContext(StoreSlugContext);

  const params = useParams();

  if (ctx) return ctx;

  return {
    slug: params.slug,
    basePath: params.slug ? `/store/${params.slug}` : "",
    isCustomDomain: false,
    storeName: "",
  };
}
