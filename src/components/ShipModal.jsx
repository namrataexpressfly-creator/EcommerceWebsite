import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../api/client";
import Modal from "./Modal";
import { Loading, ErrorBox } from "./Ui";
import { formatMoney } from "../utils/format";
import { useToast } from "../context/ToastContext";
import "../styles/plugins.css";

import "../styles/ship-rates.css";

const WAREHOUSES_PER_PAGE = 5;
const RATES_PER_PAGE = 5;

const rateKey = (r, i) => String(r.id ?? i);

function fmtDate(v) {
  if (!v) return "—";
  if (/^\d{2}-\d{2}-\d{4}$/.test(String(v))) return String(v);
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const two = (n) => String(n).padStart(2, "0");
  return `${two(d.getDate())}-${two(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function Pager({ page, total, perPage, onChange }) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 10 }}>
      <button type="button" className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => onChange(page - 1)}>
        ‹ Prev page
      </button>
      <span className="plug-hint">
        Page {page + 1} of {pages} · {total} total
      </span>
      <button type="button" className="btn btn-ghost btn-sm" disabled={page >= pages - 1} onClick={() => onChange(page + 1)}>
        Next page ›
      </button>
    </div>
  );
}

export default function ShipModal({ orderId, onClose, onShipped }) {
  const navigate = useNavigate();
  const toast = useToast();

  const [opts, setOpts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [step, setStep] = useState(0); 
  const [warehouseId, setWarehouseId] = useState("");
  const [warehousePage, setWarehousePage] = useState(0);
  const [pluginId, setPluginId] = useState("");
  const [rates, setRates] = useState(null);
  const [ratePage, setRatePage] = useState(0);
  const [rateNote, setRateNote] = useState("");
  const [pkg, setPkg] = useState(null);
  const [rateIdx, setRateIdx] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    client
      .get(`/seller/shipping/${orderId}/options`)
      .then(({ data }) => {
        if (data.redirect_to_plugins) {
          toast.info("Set up and activate a courier plugin before shipping.");
          onClose();
          navigate("/seller/plugins");
          return;
        }
        setOpts(data);
        const open = data.warehouses.find((w) => !data.shipments.some((s) => String(s.warehouse_id) === String(w._id)));
        setWarehouseId(open?._id || data.warehouses[0]?._id || "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  }, [orderId]);

  const shippedFrom = (wid) => opts?.shipments.find((s) => String(s.warehouse_id) === String(wid));
  const plugin = opts?.plugins.find((p) => p.store_plugin_id === pluginId);
  const warehouse = opts?.warehouses.find((w) => w._id === warehouseId);


  const resetRates = () => {
    setRates(null);
    setRateIdx(null);
    setRatePage(0);
    setPkg(null);
    setRateNote("");
  };

  const pickPlugin = (p) => {
    if (p.store_plugin_id === pluginId) return;
    setPluginId(p.store_plugin_id);
    resetRates();
    setError("");
  };

  const pickWarehouse = (id) => {
    if (id === warehouseId) return;
    setWarehouseId(id);
    resetRates();
    setError("");
  };

  const needsRate = plugin ? plugin.can_rate : true;
  const multiWarehouse = (opts?.warehouses.length || 0) > 1;
  const steps = ["courier", ...(multiWarehouse ? ["warehouse"] : []), ...(needsRate ? ["rate"] : [])];
  const current = steps[step] || "courier";
  const isLast = step >= steps.length - 1;
  const stepTitle = (key, label) => `Step ${steps.indexOf(key) + 1} of ${steps.length} · ${label}`;

  const canNext =
    current === "courier"
      ? Boolean(plugin) && (multiWarehouse || !shippedFrom(warehouseId))
      : current === "warehouse"
        ? Boolean(warehouseId) && !shippedFrom(warehouseId)
        : false;

  const canCreate =
    Boolean(plugin) &&
    !creating &&
    !ratesLoading &&
    !shippedFrom(warehouseId) &&
    (!needsRate || (rates !== null && rateIdx !== null));

  
  const loadRates = async () => {
    if (rates !== null) return true;
    setRatesLoading(true);
    setError("");
    try {
      const { data } = await client.post(`/seller/shipping/${orderId}/rates`, {
        store_plugin_id: pluginId,
        warehouse_id: warehouseId,
      });
      setRates(data.rates);
      setRateNote(data.note || "");
      setPkg(data.package);
      setRatePage(0);
      setRateIdx(data.rates.length === 1 ? 0 : null);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setRatesLoading(false);
    }
  };

  const goNext = async () => {
    if (steps[step + 1] === "rate" && !(await loadRates())) return;
    setStep(step + 1);
  };

  const create = async () => {
    setCreating(true);
    setError("");
    try {
      const rate = needsRate ? rates[rateIdx] : {};
      const { data } = await client.post(`/seller/shipping/${orderId}/ship`, {
        store_plugin_id: pluginId,
        warehouse_id: warehouseId,
        rate,
      });
      setDone(data);
      toast.success("Shipment created.");
      onShipped?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const footer = done ? (
    <button className="btn btn-primary" onClick={onClose}>
      Done
    </button>
  ) : (
    <>
      <button className="btn btn-ghost" onClick={onClose}>
        Cancel
      </button>
      {step > 0 && (
        <button className="btn btn-ghost" disabled={creating || ratesLoading} onClick={() => setStep(step - 1)}>
          ← Back
        </button>
      )}
      {opts?.can_ship && !isLast && (
        <button className="btn btn-primary" disabled={!canNext || ratesLoading} onClick={goNext}>
          {ratesLoading ? "Fetching rates…" : "Next →"}
        </button>
      )}
      {opts?.can_ship && isLast && (
        <button className="btn btn-primary" disabled={!canCreate} onClick={create}>
          {creating ? "Shipping…" : "Ship order"}
        </button>
      )}
    </>
  );

  const wStart = warehousePage * WAREHOUSES_PER_PAGE;
  const pagedWarehouses = (opts?.warehouses || []).slice(wStart, wStart + WAREHOUSES_PER_PAGE);
  const rStart = ratePage * RATES_PER_PAGE;
  const pagedRates = (rates || []).slice(rStart, rStart + RATES_PER_PAGE);

  return (
    <Modal title="Ship order" onClose={onClose} width={current === "rate" ? 860 : 560} footer={opts ? footer : null}>
      {loading && <Loading />}
      <ErrorBox message={error} />

      {opts && !opts.can_ship && !done && (
        <div className="plug-note">
          This order can't be shipped right now. It must be paid (or cash on delivery) and not cancelled or delivered.
        </div>
      )}

      {done && (
        <div className="ship-done">
          Shipment created with <strong>{done.courier_name}</strong>.
          <div>AWB: {done.awb_number}</div>
          {done.tracking_url && (
            <a href={done.tracking_url} target="_blank" rel="noreferrer">
              Track shipment ↗
            </a>
          )}
          {done.label_url && (
            <div>
              <a href={done.label_url} target="_blank" rel="noreferrer">
                Download label ↗
              </a>
            </div>
          )}
        </div>
      )}

      {opts && opts.can_ship && !done && (
        <>
          {current === "courier" && (
            <div className="ship-step">
              <h4>{stepTitle("courier", "Courier")}</h4>
              <div className="ship-options">
                {opts.plugins.map((p) => (
                  <button
                    type="button"
                    key={p.store_plugin_id}
                    className={`ship-option ${pluginId === p.store_plugin_id ? "ship-option-selected" : ""}`}
                    disabled={!p.ready}
                    onClick={() => pickPlugin(p)}
                  >
                    <div className="ship-option-main">
                      <div className="ship-option-title">{p.app_name}</div>
                      <div className="ship-option-sub">
                        {p.ready ? (p.environment === "sandbox" ? "Sandbox mode" : "Ready") : `Setup incomplete: ${p.missing.join(", ")}`}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <p className="plug-hint" style={{ marginTop: 8 }}>
                Need another courier? <Link to="/seller/plugins" onClick={onClose}>Manage plugins</Link>
              </p>
              {plugin && !plugin.can_rate && (
                <p className="plug-hint">This courier doesn't quote rates in advance. The shipment is created after you choose a warehouse.</p>
              )}
            </div>
          )}

          {current === "warehouse" && (
            <div className="ship-step">
              <h4>{stepTitle("warehouse", "Pickup warehouse")}</h4>
              <div className="ship-options">
                {pagedWarehouses.map((w) => {
                  const s = shippedFrom(w._id);
                  return (
                    <button
                      type="button"
                      key={w._id}
                      className={`ship-option ${warehouseId === w._id ? "ship-option-selected" : ""}`}
                      disabled={Boolean(s)}
                      onClick={() => pickWarehouse(w._id)}
                    >
                      <div className="ship-option-main">
                        <div className="ship-option-title">{w.name}</div>
                        <div className="ship-option-sub">
                          {s ? `Already shipped · AWB ${s.awb_number}` : [w.address?.city, w.address?.pincode].filter(Boolean).join(" - ")}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <Pager page={warehousePage} total={opts.warehouses.length} perPage={WAREHOUSES_PER_PAGE} onChange={setWarehousePage} />
            </div>
          )}

          {current === "rate" && rates !== null && (
            <div className="ship-step">
              <h4>{stepTitle("rate", "Choose a rate")}</h4>
              <div className="ship-pkg">
                {warehouse && (
                  <span>
                    Pickup: {warehouse.name}
                    {warehouse.address?.pincode ? ` - ${warehouse.address.pincode}` : ""}
                  </span>
                )}
                {pkg && <span>Chargeable weight: {pkg.chargeable_weight_kg} kg</span>}
                {pkg?.length_cm > 0 && (
                  <span>
                    Box: {pkg.length_cm} × {pkg.width_cm} × {pkg.height_cm} cm
                  </span>
                )}
              </div>
              {rates.length === 0 ? (
                <div className="plug-note">{rateNote || "No service is available for this pickup and delivery pincode."}</div>
              ) : (
                <>
                  <div className="ship-rate-table" role="table">
                    <div className="ship-rate-head" role="row">
                      <span>Courier partner</span>
                      <span>Expected pickup</span>
                      <span>Estimated delivery</span>
                      <span>TAT (days)</span>
                      <span>Total charges</span>
                      <span />
                    </div>
                    {pagedRates.map((r, j) => {
                      const i = rStart + j;
                      return (
                        <div
                          key={rateKey(r, i)}
                          role="row"
                          className={`ship-rate-row ${rateIdx === i ? "is-selected" : ""}`}
                          onClick={() => setRateIdx(i)}
                        >
                          <div className="ship-rate-partner" data-label="Courier partner">
                            {r.logo && <img src={r.logo} alt="" loading="lazy" />}
                            <span className="ship-rate-name">
                              <strong>{r.name || "Standard"}</strong>
                              {r.service && r.service !== r.name && <small>{r.service}</small>}
                            </span>
                          </div>
                          <div data-label="Expected pickup"><span className="ship-rate-chip">{fmtDate(r.expected_pickup)}</span></div>
                          <div data-label="Estimated delivery"><span className="ship-rate-chip">{fmtDate(r.estimated_delivery || r.eta)}</span></div>
                          <div className="ship-rate-tat" data-label="TAT (days)">{r.tat ?? "—"}</div>
                          <div className="ship-rate-total" data-label="Total charges">
                            <strong>{formatMoney(r.charge)}</strong>
                            {(r.freight != null || r.gst != null) && (
                              <small>
                                Freight: {formatMoney(r.freight ?? 0)}
                                {r.cod > 0 && <> • COD: {formatMoney(r.cod)}</>} • GST: {formatMoney(r.gst ?? 0)}
                              </small>
                            )}
                          </div>
                          <div className="ship-rate-action">
                            <button
                              type="button"
                              className={`btn btn-sm ${rateIdx === i ? "btn-primary" : "btn-ghost"}`}
                              disabled={creating}
                              onClick={(e) => {
                                e.stopPropagation();
                                setRateIdx(i);
                              }}
                            >
                              {rateIdx === i ? "Selected ✓" : "Select"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Pager page={ratePage} total={rates.length} perPage={RATES_PER_PAGE} onChange={setRatePage} />
                </>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
