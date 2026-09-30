import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";
import { Loading, ErrorBox, EmptyState, StatusBadge } from "../../components/Ui";
import { formatMoney, formatDate, ORDER_STATUSES } from "../../utils/format";
import Pagination from "../../components/Pagination";
import HoverText from "../../components/HoverText";
import "../../styles/order-detail.css";
import { DEFAULT_PAGE_SIZE } from "../../hooks/usePagination";

const fullAddress = (a) =>
  a ? [a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(", ") : "";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchText.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchText]);

  const load = () => {
    setLoading(true);
    const params = { page, limit };
    if (status) params.status = status;
    if (search) params.q = search;
    client
      .get("/seller/orders", { params })
      .then(({ data }) => {
        setOrders(data.orders);
        setTotal(data.total);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status, page, limit, search]);

  const updateStatus = async (id, newStatus) => {
    try {
      await client.put(`/seller/orders/${id}/status`, { status: newStatus });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const updateShipment = async (id, patch) => {
    try {
      await client.put(`/seller/orders/${id}/shipment`, patch);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Orders</h1>
        <input
          className="input"
          type="search"
          style={{ maxWidth: 300 }}
          placeholder="Search by order no., customer, phone or product…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          aria-label="Search orders"
        />
        <select
          className="input"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <ErrorBox message={error} />
      {loading ? (
        <Loading />
      ) : orders.length === 0 ? (
        <EmptyState>{search ? "No orders match your search." : "No orders yet."}</EmptyState>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                {/* <th>Update</th>
                <th>Shipment</th> */}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o._id}>
                  <td>
                    <Link className="order-no-link" to={`/seller/orders/${o._id}`}>
                      #{o.tracking_token}
                    </Link>
                    <div className="muted small">{formatDate(o.created_at)}</div>
                  </td>
                  <td>
                    <HoverText lines={1}>{o.shipping_address?.name}</HoverText>
                    <div className="muted small">{o.shipping_address?.phone}</div>
                    {fullAddress(o.shipping_address) && (
                      <div className="muted small">
                        <HoverText tip={fullAddress(o.shipping_address)}>{fullAddress(o.shipping_address)}</HoverText>
                      </div>
                    )}
                  </td>
                  <td>
                    <HoverText tip={o.items.map((i) => `${i.name} × ${i.quantity}`).join("\n")}>
                      {o.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                    </HoverText>
                  </td>
                  <td>{formatMoney(o.total_amount)}</td>
                  <td className="muted small">
                    {o.payment_method} · {o.payment_status}
                  </td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                  {/* <td>
                    <select
                      className="input"
                      value={o.status}
                      onChange={(e) => updateStatus(o._id, e.target.value)}
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </td> */}
                  {/* <td>
                    <select
                      className="input"
                      value={o.shipment?.type || "standard"}
                      onChange={(e) => updateShipment(o._id, { type: e.target.value })}
                    >
                      <option value="standard">Standard</option>
                      <option value="express">Express</option>
                      <option value="self_pickup">Self pickup</option>
                    </select>
                    <select
                      className="input"
                      style={{ marginTop: 4 }}
                      value={o.shipment?.courier_partner || ""}
                      onChange={(e) => updateShipment(o._id, { courier_partner: e.target.value || null })}
                    >
                      <option value="">No courier set</option>
                      <option value="delhivery">Delhivery</option>
                      <option value="shiprocket">Shiprocket</option>
                      <option value="bluedart">Bluedart</option>
                      <option value="self_ship">Self ship</option>
                      <option value="other">Other</option>
                    </select>
                    {o.shipment?.awb_number && (
                      <div className="muted small">AWB: {o.shipment.awb_number}</div>
                    )}
                  </td> */}
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={page}
            pageSize={limit}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setLimit(size);
              setPage(1);
            }}
          />
        </>
      )}
    </div>
  );
}
