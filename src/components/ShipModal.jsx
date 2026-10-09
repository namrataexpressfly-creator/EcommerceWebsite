import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../api/client";
import Modal from "./Modal";
import { Loading, ErrorBox } from "./Ui";
import { formatMoney } from "../utils/format";
import { useToast } from "../context/ToastContext";
import "../styles/plugins.css";

const rateKey = (r, i) => String(r.id ?? i);

export default function ShipModal({ orderId, onClose, onShipped }) {
  const navigate = useNavigate();
  const toast = useToast();

  const [opts, setOpts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [warehouseId, setWarehouseId] = useState("");
  const [pluginId, setPluginId] = useState("");
  const [rates, setRates] = useState(null); 
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

  const pickPlugin = async (p) => {
    setPluginId(p.store_plugin_id);
    setRates(null);
    setRateIdx(null);
    setError("");
    if (!p.can_rate) {
      setRates([]); 
      return;
    }
    setRatesLoading(true);
    try {
      const { data } = await client.post(`/seller/shipping/${orderId}/rates`, {
        store_plugin_id: p.store_plugin_id,
        warehouse_id: warehouseId,
      });
      setRates(data.rates);
      setPkg(data.package);
      if (data.rates.length === 1) setRateIdx(0);
    } catch (err) {
      setError(err.message);
      setPluginId("");
    } finally {
      setRatesLoading(false);
    }
  };

  const changeWarehouse = (id) => {
    setWarehouseId(id);
    setPluginId("");
    setRates(null);
    setRateIdx(null);
  };

  const needsRate = plugin?.can_rate;
  const canCreate =
    plugin && rates !== null && !creating && !shippedFrom(warehouseId) && (!needsRate || rateIdx !== null);

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
      <button className="btn btn-primary" disabled={!canCreate} onClick={create}>
        {creating ? "Creating…" : "Create shipment"}
      </button>
    </>
  );

  return (
    <Modal title="Ship order" onClose={onClose} width={560} footer={opts ? footer : null}>
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
          {opts.warehouses.length > 1 && (
            <div className="ship-step">
              <h4>1. Pickup warehouse</h4>
              <div className="ship-options">
                {opts.warehouses.map((w) => {
                  const s = shippedFrom(w._id);
                  return (
                    <button
                      type="button"
                      key={w._id}
                      className={`ship-option ${warehouseId === w._id ? "ship-option-selected" : ""}`}
                      disabled={Boolean(s)}
                      onClick={() => changeWarehouse(w._id)}
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
            </div>
          )}

          <div className="ship-step">
            <h4>{opts.warehouses.length > 1 ? "2. Courier" : "1. Courier"}</h4>
            <div className="ship-options">
              {opts.plugins.map((p) => (
                <button
                  type="button"
                  key={p.store_plugin_id}
                  className={`ship-option ${pluginId === p.store_plugin_id ? "ship-option-selected" : ""}`}
                  disabled={!p.ready || ratesLoading || Boolean(shippedFrom(warehouseId))}
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
          </div>

          {ratesLoading && <Loading label="Fetching rates…" />}

          {rates !== null && !ratesLoading && needsRate && (
            <div className="ship-step">
              <h4>{opts.warehouses.length > 1 ? "3. Choose a rate" : "2. Choose a rate"}</h4>
              {pkg && (
                <div className="ship-pkg">
                  <span>Chargeable weight: {pkg.chargeable_weight_kg} kg</span>
                  {pkg.length_cm > 0 && (
                    <span>
                      Box: {pkg.length_cm} × {pkg.width_cm} × {pkg.height_cm} cm
                    </span>
                  )}
                </div>
              )}
              {rates.length === 0 ? (
                <div className="plug-note">No service is available for this pickup and delivery pincode.</div>
              ) : (
                <div className="ship-options">
                  {rates.map((r, i) => (
                    <button
                      type="button"
                      key={rateKey(r, i)}
                      className={`ship-option ${rateIdx === i ? "ship-option-selected" : ""}`}
                      onClick={() => setRateIdx(i)}
                    >
                      <div className="ship-option-main">
                        <div className="ship-option-title">{r.name || "Standard"}</div>
                        {r.eta && <div className="ship-option-sub">Delivery: {r.eta}</div>}
                      </div>
                      <div className="ship-price">{formatMoney(r.charge)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {rates !== null && !ratesLoading && !needsRate && (
            <p className="plug-hint">This courier doesn't quote rates in advance. Create the shipment to continue.</p>
          )}
        </>
      )}
    </Modal>
  );
}
