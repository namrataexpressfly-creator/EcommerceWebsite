
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AdminAuthProvider, useAdminAuth } from "./context/AdminAuthContext";
import { DEFAULT_SLUG, isCustomDomainHost, getCurrentHostname, resolveStoreByDomain } from "./api/client";
import { StoreSlugProvider } from "./context/StoreSlugContext";
import { ToastProvider } from "./context/ToastContext";
import { ConfirmProvider } from "./context/ConfirmContext";

import StoreLayout from "./components/StoreLayout";
import StoreHome from "./pages/store/StoreHome";
import AllCategories from "./pages/store/AllCategories";
import CategoryProducts from "./pages/store/CategoryProducts";
import ProductDetail from "./pages/store/ProductDetail";
import Wishlist from "./pages/store/Wishlist";
import MyAccount from "./pages/store/MyAccount";
import Cart from "./pages/store/Cart";
import Aboutus from "./pages/store/Aboutus";
import FAQs from "./pages/store/FAQs";
import Help from "./pages/store/Help";
import MyTickets from "./pages/store/MyTickets";
import Contactus from "./pages/store/Contactus";
import Privacy from "./pages/store/Privacy";

import Checkout from "./pages/store/Checkout";
import TrackOrder from "./pages/store/TrackOrder";

import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import Login from "./pages/seller/Login";
import ForgotPassword from "./pages/seller/ForgotPassword";
import ResetPassword from "./pages/seller/ResetPassword";
import Register from "./pages/seller/Register";
import Overview from "./pages/seller/Overview";
import Orders from "./pages/seller/Orders";
import OrderDetail from "./pages/seller/OrderDetail";
import Wallet from "./pages/seller/Wallet";
import Products from "./pages/seller/Products";
import ProductVariants from "./pages/seller/ProductVariants";
import Categories from "./pages/seller/Categories";
import Warehouses from "./pages/seller/Warehouses";
import Tickets from "./pages/seller/Tickets";
import Banners from "./pages/seller/Banners";
import Coupons from "./pages/seller/Coupons";
import CartList from "./pages/seller/CartList";
import Customers from "./pages/seller/Customers";
import Returns from "./pages/seller/Returns";
import Settings from "./pages/seller/Settings";
import Kyc from "./pages/seller/Kyc";
import PaymentSettings from "./pages/seller/PaymentSettings";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminKyc from "./pages/admin/AdminKyc";
import AdminSellers from "./pages/admin/AdminSellers";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";


function storeRoutes() {
  return (
    <>
      <Route index element={<StoreHome />} />
      <Route path="categories" element={<AllCategories />} />
      <Route path="category/:categorySlug" element={<CategoryProducts />} />
      <Route path="product/:productId" element={<ProductDetail />} />
      <Route path="cart" element={<Cart />} />
      <Route path="wishlist" element={<Wishlist />} />
      <Route path="account" element={<MyAccount />} />
      <Route path="Aboutus" element={<Aboutus />} />
      <Route path="faqs" element={<FAQs />} />
      <Route path="help" element={<Help />} />
      <Route path="my-conversations" element={<MyTickets />} />
      <Route path="Contactus" element={<Contactus />} />
      <Route path="Privacy" element={<Privacy />} />
      <Route path="checkout" element={<Checkout />} />
      <Route path="track" element={<TrackOrder />} />
      <Route path="track/:token" element={<TrackOrder />} />
    </>
  );
}

// /admin — sends a logged-in admin straight to the dashboard, otherwise to the login page.
function AdminIndex() {
  const { token, loading } = useAdminAuth();
  if (loading) return <div className="page-loading">Loading…</div>;
  return <Navigate to={token ? "/admin/dashboard" : "/admin/login"} replace />;
}

// Wraps AdminLogin so a already-signed-in admin visiting /admin/login is bounced to the dashboard
// instead of seeing the sign-in form again.
function AdminLoginRoute() {
  const { token, loading } = useAdminAuth();
  if (loading) return <div className="page-loading">Loading…</div>;
  if (token) return <Navigate to="/admin/dashboard" replace />;
  return <AdminLogin />;
}

function PlatformStoreLayout() {
  const { slug } = useParams();
  return (
    <StoreSlugProvider value={{ slug, basePath: `/store/${slug}`, isCustomDomain: false, storeName: "" }}>
      <StoreLayout slug={slug} />
    </StoreSlugProvider>
  );
}


function CustomDomainStoreLayout() {
  const [state, setState] = useState({ loading: true, slug: null, storeName: "", error: "" });

  useEffect(() => {
    const hostname = getCurrentHostname();
    resolveStoreByDomain(hostname)
      .then(({ data }) => {
        setState({ loading: false, slug: data.slug, storeName: data.store_name, error: "" });
      })
      .catch(() => {
        setState({ loading: false, slug: null, storeName: "", error: "not_found" });
      });
  }, []);

  if (state.loading) {
    return <div className="store-domain-loading">Loading store…</div>;
  }

  if (!state.slug) {
    return (
      <div className="store-domain-error">
        <h1>Store not found</h1>
        <p>This domain isn't connected to an active Expressfly store yet.</p>
      </div>
    );
  }

  return (
    <StoreSlugProvider
      value={{ slug: state.slug, basePath: "", isCustomDomain: true, storeName: state.storeName }}
    >
      <StoreLayout slug={state.slug} />
    </StoreSlugProvider>
  );
}

function StoreApp() {
  if (isCustomDomainHost()) {

    return (
      <Routes>
        <Route path="/" element={<CustomDomainStoreLayout />}>
          {storeRoutes()}
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }


  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/store" element={<Navigate to={`/store/${DEFAULT_SLUG}`} replace />} />

      <Route path="/store/:slug" element={<PlatformStoreLayout />}>
        {storeRoutes()}
      </Route>

      <Route path="/seller/login" element={<Login />} />
      <Route path="/seller/forgot-password" element={<ForgotPassword />} />
      <Route path="/seller/reset-password" element={<ResetPassword />} />
      <Route path="/seller/register" element={<Register />} />
      <Route path="/admin" element={<AdminIndex />} />
      <Route path="/admin/login" element={<AdminLoginRoute />} />
      <Route
        path="/admin/dashboard"
        element={
          <AdminProtectedRoute>
            <AdminDashboard />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/kyc"
        element={
          <AdminProtectedRoute>
            <AdminKyc />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/sellers"
        element={
          <AdminProtectedRoute>
            <AdminSellers />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/customers"
        element={
          <AdminProtectedRoute>
            <AdminCustomers />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/seller"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Overview />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="wallet" element={<Wallet />} />
        <Route path="products" element={<Products />} />
        <Route path="product-variants" element={<ProductVariants />} />
        <Route path="categories" element={<Categories />} />
        <Route path="warehouses" element={<Warehouses />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="banners" element={<Banners />} />
        <Route path="coupons" element={<Coupons />} />
        <Route path="customers" element={<Customers />} />
        <Route path="cart-activity" element={<CartList />} />
        <Route path="returns" element={<Returns />} />
        <Route path="settings" element={<Settings />} />
        <Route path="kyc" element={<Kyc />} />
        <Route path="payment-settings" element={<PaymentSettings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <AdminAuthProvider>
            <BrowserRouter>
              <StoreApp />
            </BrowserRouter>
          </AdminAuthProvider>
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
