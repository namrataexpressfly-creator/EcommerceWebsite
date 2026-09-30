import { useEffect, useState } from "react";
import client from "../../api/client";
import { Loading, ErrorBox, EmptyState } from "../../components/Ui";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";
import useTableSearch from "../../hooks/useTableSearch";
import TableSearch from "../../components/TableSearch";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";

const emptyForm = {
  _id: null,
  name: "",
  code: "",
  contact_phone: "",
  address: { line1: "", line2: "", city: "", state: "", pincode: "" },
  location: { lat: "", lng: "" },
  priority: 0,
};

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();
  const confirmAction = useConfirm();
  const { query, setQuery, filtered } = useTableSearch(warehouses);
  const { pageItems, pagerProps } = usePagination(filtered, { resetKey: query });

  const load = () => {
    setLoading(true);
    client
      .get("/seller/warehouses")
      .then(({ data }) => setWarehouses(data))
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const updateLocation = (key) => (e) => {
    setForm((f) => ({ ...f, location: { ...f.location, [key]: e.target.value } }));
  };

  const updateAddress = (key) => (e) => {
    setForm((f) => ({ ...f, address: { ...f.address, [key]: e.target.value } }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const payload = {
      name: form.name,
      code: form.code,
      contact_phone: form.contact_phone,
      address: form.address,
      location: { lat: form.location?.lat ?? "", lng: form.location?.lng ?? "" },
      priority: Number(form.priority) || 0,
    };
    try {
      if (form._id) await client.put(`/seller/warehouses/${form._id}`, payload);
      else await client.post("/seller/warehouses", payload);
      toast.success(form._id ? "Warehouse updated." : "Warehouse added.");
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setError(msg);
      toast.error(msg || "Could not save warehouse.");
    }
  };

  const toggleStatus = async (warehouse) => {
    const activating = !warehouse.is_active;
    if (!activating) {
      const ok = await confirmAction({
        title: "Deactivate this warehouse?",
        message:
          "It will no longer appear when adding stock to products, but existing product stock records and orders keep working as-is. You can reactivate it any time.",
        confirmText: "Deactivate",
        danger: true,
      });
      if (!ok) return;
    }
    try {
      await client.patch(`/seller/warehouses/${warehouse._id}/status`, { is_active: activating });
      toast.success(activating ? "Warehouse reactivated." : "Warehouse deactivated.");
      load();
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setError(msg);
      toast.error(msg || "Could not update warehouse.");
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Warehouses</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            setForm(emptyForm);
            setShowForm(true);
          }}
        >
          + Add warehouse
        </button>
      </div>

      <p className="muted small">
        Manage the locations you ship from. Warehouses can be deactivated but never deleted — this keeps historical
        stock and order data intact.
      </p>

      <ErrorBox message={error} />

      {showForm && (
        <form className="panel form-panel" onSubmit={submit}>
          <h2>{form._id ? "Edit warehouse" : "New warehouse"}</h2>
          <div className="form-row">
            <input className="input" placeholder="Warehouse name" value={form.name} onChange={update("name")} required />
            <input className="input" placeholder="Code (optional, e.g. BLR-1)" value={form.code} onChange={update("code")} />
          </div>
          <input
            className="input"
            type="tel"
            placeholder="Contact phone"
            value={form.contact_phone}
            onChange={update("contact_phone")}
            required
          />
          <div className="form-row">
            <input className="input" placeholder="Address line 1" value={form.address.line1} onChange={updateAddress("line1")} />
            <input className="input" placeholder="Address line 2" value={form.address.line2} onChange={updateAddress("line2")} />
          </div>
          <div className="form-row">
            <input className="input" placeholder="City" value={form.address.city} onChange={updateAddress("city")} />
            <input className="input" placeholder="State" value={form.address.state} onChange={updateAddress("state")} />
            <input className="input" placeholder="Pincode" value={form.address.pincode} onChange={updateAddress("pincode")} />
          </div>
          <div className="form-row">
            <input className="input" type="number" step="any" placeholder="Latitude (e.g. 19.4559)" value={form.location?.lat ?? ""} onChange={updateLocation("lat")} />
            <input className="input" type="number" step="any" placeholder="Longitude (e.g. 72.7920)" value={form.location?.lng ?? ""} onChange={updateLocation("lng")} />
            <input className="input" type="number" placeholder="Priority (0 = first)" value={form.priority ?? 0} onChange={update("priority")} />
          </div>
          <p className="muted small">
            Latitude/longitude are used to find the warehouse nearest to the customer. Right-click a spot in Google Maps to copy them.
            Priority only breaks ties between equally close warehouses.
          </p>
          <div className="form-row">
            <button className="btn btn-primary" type="submit">
              {form._id ? "Save changes" : "Add warehouse"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <Loading />
      ) : warehouses.length === 0 ? (
        <EmptyState>No warehouses yet. Add one to start tracking stock by location.</EmptyState>
      ) : (
        <>
          <TableSearch query={query} onChange={setQuery} shown={filtered.length} total={warehouses.length} placeholder="Search warehouses…" />
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>City</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((w) => (
                <tr key={w._id} style={!w.is_active ? { opacity: 0.55 } : undefined}>
                  <td>{w.name}</td>
                  <td className="muted small">{w.code || "—"}</td>
                  <td className="muted small">{w.address?.city || "—"}</td>
                  <td>
                    <span className={`badge ${w.is_active ? "badge-success" : "badge-muted"}`}>
                      {w.is_active ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="table-actions">

                    <button className="btn-icon" onClick={() => {
                      setForm({ ...emptyForm, ...w, address: { ...emptyForm.address, ...w.address } });
                      setShowForm(true);
                    }} title="Edit">
                      <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
                        <path d="M12.9 3.5 16.5 7 7.4 16.1l-4 .9.9-4L12.9 3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => toggleStatus(w)}
                      title={w.is_active ? "Deactivate" : "Reactivate"}
                    >
                      {w.is_active ? (

                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                          <path
                            d="M12 2v10"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <path
                            d="M6.34 5.64a8 8 0 1 0 11.32 0"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      ) : (

                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                          <path
                            d="M12 2v10"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <path
                            d="M6.34 5.64a8 8 0 1 0 11.32 0"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                    </button>

                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination {...pagerProps} />
        </>
      )}
    </div>
  );
}
