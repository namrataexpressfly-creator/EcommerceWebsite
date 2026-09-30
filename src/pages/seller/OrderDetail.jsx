import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import client, { resolveMediaUrl } from "../../api/client";
import { Loading, ErrorBox, StatusBadge } from "../../components/Ui";
import { formatMoney, formatDate } from "../../utils/format";
import "../../styles/order-detail.css";

const COURIER_LABELS = {
  delhivery: "Delhivery",
  shiprocket: "Shiprocket",
  bluedart: "Bluedart",
  self_ship: "Self ship",
  other: "Other",
};
const SHIPMENT_TYPE_LABELS = { standard: "Standard", express: "Express", self_pickup: "Self pickup" };
const PAYMENT_BADGE = {
  paid: "badge-success",
  pending: "badge-pending",
  failed: "badge-cancelled",
  refunded: "badge-refunded",
  cod_pending: "badge-cod_pending",
};
const TRANSFER_LABELS = {
  not_applicable: "Not applicable",
  pending: "Pending",
  processed: "Processed",
  failed: "Failed",
};

const dash = (v) => (v === null || v === undefined || v === "" ? "—" : v);
const kg = (v) => (v === null || v === undefined ? "—" : `${v} kg`);

function Tile({ label, children }) {
  return (
    <div className="od-tile">
      <div className="od-tile-label">{label}</div>
      <div className="od-tile-value">{children}</div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="od-row">
      <span className="od-row-label">{label}</span>
      <span className="od-row-value">{children}</span>
    </div>
  );
}

function AddressBox({ title, children }) {
  return (
    <div className="od-addr-col">
      <div className="od-addr-title">{title}</div>
      {children}
    </div>
  );
}

function cityLine(a) {
  const place = [a?.city, a?.state].filter(Boolean).join(", ");
  return [place, a?.pincode].filter(Boolean).join(" - ");
}

export default function OrderDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [changing, setChanging] = useState(false);
  const [allWarehouses, setAllWarehouses] = useState([]);
  const [newWarehouse, setNewWarehouse] = useState("");
  const [moveError, setMoveError] = useState("");

  const openChange = async () => {
    setChanging(true);
    setMoveError("");
    if (allWarehouses.length === 0) {
      const { data: list } = await client.get("/seller/warehouses");
      setAllWarehouses(list.filter((w) => w.is_active));
    }
  };

  const savePickup = async () => {
    if (!newWarehouse) return;
    try {
      await client.put(`/seller/orders/${id}/pickup-warehouse`, { warehouse_id: newWarehouse });
      const { data: fresh } = await client.get(`/seller/orders/${id}`);
      setData(fresh);
      setChanging(false);
      setNewWarehouse("");
    } catch (err) {
      setMoveError(err.response?.data?.error || "Could not change the pickup warehouse.");
    }
  };

  useEffect(() => {
    setLoading(true);
    setError("");
    client
      .get(`/seller/orders/${id}`)
      .then(({ data }) => setData(data))
      .catch((err) => setError(err.response?.data?.error || err.message || "Could not load this order."))
      .finally(() => setLoading(false));
  }, [id]);

  const crumbs = (label) => (
    <nav className="od-crumbs">
      <Link to="/seller/orders">Orders</Link>
      <span>›</span>
      <span>{label}</span>
    </nav>
  );

  if (loading) return <Loading label="Loading order…" />;

  if (error || !data) {
    return (
      <div className="od-page">
        {crumbs("Detail order")}
        <ErrorBox message={error || "Order not found."} />
        <Link className="btn btn-ghost" to="/seller/orders">
          ← Back to orders
        </Link>
      </div>
    );
  }

  const { order, customer, store, line_items: items, package: pack, pickup_warehouses: pickups } = data;
  const ship = order.shipment || {};
  const addr = order.shipping_address || {};
  const online = order.payment_method === "online";
  const events = [...(order.status_history || [])].reverse();
  const withDims = items.filter((i) => i.dimensions_cm);

  return (
    <div className="od-page">
      {crumbs("Detail order")}

      <div className="od-grid">
        <div className="od-main">
          <section className="od-card">
            <h2>Order Summary</h2>
            <div className="od-tiles">
              <Tile label="Order No">#{order.tracking_token}</Tile>
              <Tile label="AWB Detail">
                {ship.awb_number ? (
                  ship.tracking_url ? (
                    <a href={ship.tracking_url} target="_blank" rel="noreferrer">
                      {ship.awb_number}
                    </a>
                  ) : (
                    ship.awb_number
                  )
                ) : (
                  "—"
                )}
              </Tile>
              <Tile label="Created At">{formatDate(order.created_at)}</Tile>
              <Tile label="Order Status">
                <StatusBadge status={order.status} />
              </Tile>
              <Tile label="Payment Mode">{online ? "Prepaid" : "Cash on delivery"}</Tile>
              <Tile label="Logistic">{COURIER_LABELS[ship.courier_partner] || "—"}</Tile>
              <Tile label="Shipping Method">{SHIPMENT_TYPE_LABELS[ship.type] || "—"}</Tile>
              <Tile label="Store">
                {dash(store.name)}
                {store.slug && <div className="od-tile-sub">{store.slug}</div>}
              </Tile>
              <Tile label="Est. Delivery">{ship.estimated_delivery ? formatDate(ship.estimated_delivery) : "—"}</Tile>
            </div>
          </section>

          <section className="od-card">
            <h2>Addresses</h2>
            <div className="od-two">
              <AddressBox title="Pickup Address">
                {pickups.length === 0 ? (
                  <p className="muted small">No warehouse found. Add one under Warehouses.</p>
                ) : (
                  pickups.map((w) => (
                    <div className="od-addr" key={w._id}>
                      <strong>
                        {w.name}
                        {w.code ? ` (${w.code})` : ""}
                      </strong>
                      {w.address?.line1 && <div>{w.address.line1}</div>}
                      {w.address?.line2 && <div>{w.address.line2}</div>}
                      {cityLine(w.address) && <div>{cityLine(w.address)}</div>}
                      {w.contact_phone && <div>Contact No: {w.contact_phone}</div>}
                    </div>
                  ))
                )}
                {["pending", "confirmed", "packed"].includes(order.status) &&
                  (changing ? (
                    <div className="od-addr" style={{ marginTop: 8 }}>
                      <select className="input" value={newWarehouse} onChange={(e) => setNewWarehouse(e.target.value)}>
                        <option value="">Select warehouse…</option>
                        {allWarehouses.map((w) => (
                          <option key={w._id} value={w._id}>
                            {w.name} {w.address?.city ? `— ${w.address.city}` : ""}
                          </option>
                        ))}
                      </select>
                      <button type="button" className="btn btn-primary" onClick={savePickup} disabled={!newWarehouse}>
                        Save
                      </button>{" "}
                      <button type="button" className="btn btn-ghost" onClick={() => setChanging(false)}>
                        Cancel
                      </button>
                      {moveError && <p className="small" style={{ color: "#c0392b" }}>{moveError}</p>}
                    </div>
                  ) : (
                    <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={openChange}>
                      Change pickup warehouse
                    </button>
                  ))}
              </AddressBox>

              <AddressBox title="Delivery Address">
                <div className="od-addr">
                  <strong>{dash(addr.name)}</strong>
                  {addr.line1 && <div>{addr.line1}</div>}
                  {addr.line2 && <div>{addr.line2}</div>}
                  {cityLine(addr) && <div>{cityLine(addr)}</div>}
                  <div>Mobile: {dash(addr.phone)}</div>
                  {customer?.email && <div>Email: {customer.email}</div>}
                </div>
                <p className="muted small od-note">Billing address is the same as the delivery address.</p>
              </AddressBox>
            </div>
          </section>

          <section className="od-card">
            <h2>Package &amp; Weights</h2>
            <div className="od-tiles">
              <Tile label="Physical Weight">{kg(pack.physical_weight_kg)}</Tile>
              <Tile label="Volumetric Weight">{kg(pack.volumetric_weight_kg)}</Tile>
              <Tile label="Chargeable Weight">{kg(pack.chargeable_weight_kg)}</Tile>
              <Tile label="Dimensions (L × W × H cm)">
                {withDims.length === 0
                  ? "—"
                  : withDims.map((i, idx) => (
                      <div key={idx}>
                        {withDims.length > 1 && <span className="od-tile-sub">{i.name}: </span>}
                        {i.dimensions_cm.l} × {i.dimensions_cm.w} × {i.dimensions_cm.h}
                      </div>
                    ))}
              </Tile>
            </div>
          </section>

          <section className="od-card">
            <h2>Product Details</h2>
            <div className="od-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>Qty</th>
                    <th>Unit price</th>
                    <th>Tax</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i, idx) => (
                    <tr key={`${i.product_id}-${idx}`}>
                      <td>
                        <div className="od-product">
                          {i.image && <img src={resolveMediaUrl(i.image)} alt="" />}
                          <div>
                            {i.name}
                            {i.variant_label && <div className="muted small">{i.variant_label}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="muted small">{dash(i.sku)}</td>
                      <td>{i.quantity}</td>
                      <td>{formatMoney(i.unit_price)}</td>
                      <td>{i.tax_amount > 0 ? formatMoney(i.tax_amount) : "—"}</td>
                      <td>{formatMoney(i.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="od-totals">
              <div>
                <span>Subtotal</span>
                <span>{formatMoney(order.subtotal)}</span>
              </div>
              {order.item_discount > 0 && (
                <div>
                  <span>Product discount</span>
                  <span>− {formatMoney(order.item_discount)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div>
                  <span>Coupon discount{order.coupon_code ? ` (${order.coupon_code})` : ""}</span>
                  <span>− {formatMoney(order.discount)}</span>
                </div>
              )}
              {order.tax_amount > 0 && (
                <div>
                  <span>Tax</span>
                  <span>{formatMoney(order.tax_amount)}</span>
                </div>
              )}
              <div>
                <span>Shipping</span>
                <span>{formatMoney(order.shipping)}</span>
              </div>
              {order.cod_charge > 0 && (
                <div>
                  <span>COD charge</span>
                  <span>{formatMoney(order.cod_charge)}</span>
                </div>
              )}
              <div className="od-totals-grand">
                <span>Total</span>
                <span>{formatMoney(order.total_amount)}</span>
              </div>
            </div>
          </section>

          <section className="od-card">
            <h2>Payment</h2>
            <div className="od-rows">
              <Row label="Method">{online ? "Online (Razorpay)" : "Cash on delivery"}</Row>
              <Row label="Status">
                <span className={`badge ${PAYMENT_BADGE[order.payment_status] || ""}`}>
                  {(order.payment_status || "").replace(/_/g, " ")}
                </span>
              </Row>
              {online && (
                <>
                  <Row label="Razorpay order ID">
                    <code>{dash(order.razorpay_order_id)}</code>
                  </Row>
                  <Row label="Razorpay payment ID">
                    <code>{dash(order.razorpay_payment_id)}</code>
                  </Row>
                  <Row label="Paid at">{order.paid_at ? formatDate(order.paid_at) : "—"}</Row>
                  <Row label="Platform fee">{formatMoney(order.platform_fee)}</Row>
                  <Row label="Your payout">{formatMoney(order.seller_payout_amount)}</Row>
                  <Row label="Payout transfer">{TRANSFER_LABELS[order.transfer_status] || "—"}</Row>
                </>
              )}
            </div>
          </section>
        </div>

        <aside className="od-aside">
          <section className="od-card">
            <h2 className="od-tab">Tracking Info</h2>

            {(ship.awb_number || ship.courier_partner) && (
              <div className="od-track-meta">
                {ship.courier_partner && <div>Courier: {COURIER_LABELS[ship.courier_partner] || ship.courier_partner}</div>}
                {ship.awb_number && <div>AWB: {ship.awb_number}</div>}
                {ship.tracking_url && (
                  <a href={ship.tracking_url} target="_blank" rel="noreferrer">
                    Track shipment ↗
                  </a>
                )}
              </div>
            )}

            {events.length === 0 ? (
              <div className="od-empty">No events</div>
            ) : (
              <ol className="od-timeline">
                {events.map((e, idx) => (
                  <li key={idx}>
                    <div className="od-tl-status">{String(e.status).replace(/_/g, " ")}</div>
                    {e.note && <div className="od-tl-note">{e.note}</div>}
                    <div className="od-tl-time">{formatDate(e.at)}</div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
