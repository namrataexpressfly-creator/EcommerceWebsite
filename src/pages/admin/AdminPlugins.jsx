import { useEffect, useState } from "react";
import client from "../../api/client";
import { useAdminAuth } from "../../context/AdminAuthContext";
import AdminLayout from "./AdminLayout";
import { Loading, ErrorBox, SuccessBox, EmptyState } from "../../components/Ui";
import Modal from "../../components/Modal";
import PluginApiDocs from "../../components/PluginApiDocs";
import "../../styles/plugins.css";

const API_TYPES = ["token_generation", "get_rating", "order_rate", "order_create", "tracking", "create_warehouse", "set_webhook"];
const JSON_FIELDS = ["headers", "parameter", "response_mapping", "webhook_mapping"];

const emptyApi = (api_type) => ({
  api_type,
  path: "",
  method: "POST",
  response_type: "json",
  webhook_url: "",
  headers: "{}",
  parameter: "{}",
  response_mapping: "{}",
  webhook_mapping: "{}",
});

const defaultStdFields = () => [
  { name: "username", label: "Username", help: "", placeholder: "" },
  { name: "password", label: "Password", help: "", placeholder: "" },
];

const emptyForm = {
  _id: null,
  integration: "standard", 
  standard_paths: {},
  std_fields: defaultStdFields(),
  app_name: "",
  logo: "",
  description: "",
  status: "active",
  adapter_key: "",
  docs_url: "",
  setup_steps: [],
  attributes: [],
  api_domains: [{ environment: "live", url: "" }],
  apis: [],
};

const REVIEW_LABEL = { draft: "Draft", pending: "Pending review", approved: "Approved", rejected: "Rejected" };
const REVIEW_BADGE = { draft: "badge-muted", pending: "badge-pending", approved: "badge-approved", rejected: "badge-rejected" };
const reviewOf = (p) => p.review_status || "approved"; // plugins from before the review gate count as approved

const emptyAttribute = { name: "", label: "", help: "", placeholder: "", is_required: true, is_secret: false };


const SAMPLE_STEPS = [
  { title: "Log in to your courier account", description: "Open the courier's dashboard. If you don't have an account yet, register and finish their verification." },
  { title: "Find your API credentials", description: "Go to Settings > API (or Developer) in the courier dashboard and copy your API key." },
  { title: "Paste them below", description: "Enter the values in the boxes below. Choose Sandbox first if you want to test safely." },
  { title: "Click Save & test connection", description: "You should see \"Connected successfully\"." },
  { title: "Add the webhook URL", description: "Copy the Webhook URL shown below and paste it in the courier dashboard so tracking updates reach your orders." },
  { title: "Turn the plugin On", description: "Close this window and switch the plugin to Active. It will then appear when you click Ship on an order." },
];

const pretty = (v) => (typeof v === "string" ? v : JSON.stringify(v ?? {}, null, 2));

function toForm(p) {
  const standard = p.integration === "standard";
  return {
    _id: p._id,
    integration: standard ? "standard" : "custom",
    standard_paths: standard ? Object.fromEntries(p.apis.map((a) => [a.api_type, a.path])) : {},
    std_fields: defaultStdFields().map((base) => ({ ...base, ...(standard ? (p.attributes.find((a) => a.name === base.name) || {}) : {}), name: base.name })),
    app_name: p.app_name,
    logo: p.logo || "",
    description: p.description || "",
    status: p.status,
    adapter_key: p.adapter_key || "",
    docs_url: p.docs_url || "",
    setup_steps: (p.setup_steps || []).map((st) => ({ title: st.title || "", description: st.description || "" })),
    attributes: p.attributes.map((a) => ({ ...emptyAttribute, ...a })),
    api_domains: p.api_domains.length ? p.api_domains.map((d) => ({ ...d })) : [{ environment: "live", url: "" }],
    apis: p.apis.map((a) => ({
      ...emptyApi(a.api_type),
      ...a,
      headers: pretty(a.headers),
      parameter: pretty(a.parameter),
      response_mapping: pretty(a.response_mapping),
      webhook_mapping: pretty(a.webhook_mapping),
    })),
  };
}

function toPayload(form) {
  if (form.integration === "standard") return toStandardPayload(form);
  const apis = form.apis.map((a) => {
    const out = { ...a };
    for (const f of JSON_FIELDS) {
      try {
        out[f] = a[f].trim() ? JSON.parse(a[f]) : {};
      } catch {
        throw new Error(`"${f}" in ${a.api_type} is not valid JSON.`);
      }
    }
    return out;
  });
  const setup_steps = [];
  form.setup_steps.forEach((st, i) => {
    const title = st.title.trim();
    const description = st.description.trim();
    if (!title && !description) return; 
    if (!title) throw new Error(`Setup step ${i + 1} needs a title.`);
    setup_steps.push({ title, description });
  });
  const docs_url = form.docs_url.trim();
  if (docs_url && !/^https?:\/\//i.test(docs_url)) throw new Error("The documentation link must start with http:// or https://");

  return {
    app_name: form.app_name.trim(),
    logo: form.logo.trim(),
    description: form.description,
    status: form.status,
    adapter_key: form.adapter_key.trim() || null,
    docs_url,
    setup_steps,
    attributes: form.attributes.filter((a) => a.name.trim()).map((a) => ({ ...a, name: a.name.trim() })),
    api_domains: form.api_domains.filter((d) => d.url.trim()).map((d) => ({ ...d, url: d.url.trim() })),
    apis,
  };
}

function commonPayload(form) {
  const setup_steps = [];
  form.setup_steps.forEach((st, i) => {
    const title = st.title.trim();
    const description = st.description.trim();
    if (!title && !description) return;
    if (!title) throw new Error(`Setup step ${i + 1} needs a title.`);
    setup_steps.push({ title, description });
  });
  const docs_url = form.docs_url.trim();
  if (docs_url && !/^https?:\/\//i.test(docs_url)) throw new Error("The documentation link must start with http:// or https://");
  return {
    app_name: form.app_name.trim(),
    logo: form.logo.trim(),
    description: form.description,
    status: form.status,
    docs_url,
    setup_steps,
    api_domains: form.api_domains.filter((d) => d.url.trim()).map((d) => ({ ...d, url: d.url.trim() })),
  };
}


function toStandardPayload(form) {
  const base = commonPayload(form);
  if (!base.api_domains.length) throw new Error("Enter the courier's main domain, for example https://api.courier.com");
  if (base.api_domains.some((d) => !/^https?:\/\/[^\s/]+/i.test(d.url))) throw new Error("The main domain must start with http:// or https://");
  return { ...base, integration: "standard", standard_paths: form.standard_paths, attributes: form.std_fields };
}


export function PluginManager({ Layout = AdminLayout, authHeader, apiBase = "/admin/plugins", role = "admin" }) {
  const isAdmin = role === "admin";
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [contract, setContract] = useState(null); 
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null); 
  const [rejectNote, setRejectNote] = useState("");
  const [docPlugin, setDocPlugin] = useState(null); 

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await client.get(apiBase, { headers: authHeader() });
      setPlugins(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    client
      .get(`${apiBase}/standard-contract`, { headers: authHeader() })
      .then(({ data }) => setContract(data))
      .catch(() => {}); 

  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setRow = (list, i, key, value) =>
    setForm((f) => ({ ...f, [list]: f[list].map((row, idx) => (idx === i ? { ...row, [key]: value } : row)) }));
  const removeRow = (list, i) => setForm((f) => ({ ...f, [list]: f[list].filter((_, idx) => idx !== i) }));

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const payload = toPayload(form);
      let message;
      if (form._id) {
        const before = plugins.find((x) => x._id === form._id);
        const { data } = await client.put(`${apiBase}/${form._id}`, payload, { headers: authHeader() });
        message = "Plugin updated.";
        if (!isAdmin && before && reviewOf(before) !== "draft" && data.review_status === "draft") {
          message = "Saved. Because API or seller-field settings changed, this plugin needs admin approval again. Click Submit for review when you are ready.";
        }
      } else {
        await client.post(apiBase, payload, { headers: authHeader() });
        message = isAdmin ? "Plugin created and approved." : "Plugin created as a draft. Click Submit for review when it is ready.";
      }
      setNotice(message);
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete ${p.app_name}? This only works if no store uses it.`)) return;
    setError("");
    try {
      await client.delete(`${apiBase}/${p._id}`, { headers: authHeader() });
      setNotice("Plugin deleted.");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitForReview = async (p) => {
    setError("");
    setNotice("");
    setBusyId(p._id);
    try {
      await client.post(`${apiBase}/${p._id}/submit`, {}, { headers: authHeader() });
      setNotice(`${p.app_name} was submitted. Sellers can use it once an admin approves it.`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const decide = async (p, decision, note = "") => {
    setError("");
    setNotice("");
    setBusyId(p._id);
    try {
      await client.post(`${apiBase}/${p._id}/review`, { decision, note }, { headers: authHeader() });
      setNotice(decision === "approved" ? `${p.app_name} approved. Sellers can now see it.` : `${p.app_name} rejected. The developer will see your note.`);
      setRejecting(null);
      setRejectNote("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const setPath = (key, value) => setForm((f) => ({ ...f, standard_paths: { ...f.standard_paths, [key]: value } }));

  const fetchDocs = async () => {
    const { data } = await client.get(`${apiBase}/standard-contract.md`, {
      headers: authHeader(),
      responseType: "text",
      transformResponse: [(d) => d],
    });
    return data;
  };
  const copyDocs = async () => {
    setError("");
    try {
      await navigator.clipboard.writeText(await fetchDocs());
      setNotice("Courier API documentation copied. Paste it into an email or doc for the courier partner.");
    } catch (err) {
      setError(err.message || "Could not copy the documentation.");
    }
  };
  const downloadDocs = async () => {
    setError("");
    try {
      const url = URL.createObjectURL(new Blob([await fetchDocs()], { type: "text/markdown" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "expressfly-courier-api.md";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Could not download the documentation.");
    }
  };

  const newPlugin = () => {
    setNotice("");
    setError("");
    setForm({ ...emptyForm, std_fields: defaultStdFields(), standard_paths: { ...(contract?.default_paths || {}) } });
  };

  const moveStep = (i, dir) =>
    setForm((f) => {
      const list = [...f.setup_steps];
      const j = i + dir;
      if (j < 0 || j >= list.length) return f;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...f, setup_steps: list };
    });

  const usedTypes = form ? form.apis.map((a) => a.api_type) : [];
  const q = query.trim().toLowerCase();
  const shown = plugins.filter(
    (p) =>
      (reviewFilter === "all" || reviewOf(p) === reviewFilter) &&
      (!q || p.app_name.toLowerCase().includes(q) || (p.slug || "").includes(q) || (p.description || "").toLowerCase().includes(q))
  );
  const countBy = (st) => plugins.filter((p) => reviewOf(p) === st).length;
  const pendingCount = countBy("pending");
  const editing = form?._id ? plugins.find((x) => x._id === form._id) : null;
  const isStd = form?.integration === "standard";


  const renderDomains = (title, hint) => (
    <>
      <h3 style={{ marginTop: 20 }}>{title}</h3>
      {hint && <p className="muted small">{hint}</p>}
          {form.api_domains.map((d, i) => (
            <div className="adm-plug-grid" key={i}>
              <select className="input" value={d.environment} onChange={(e) => setRow("api_domains", i, "environment", e.target.value)}>
                <option value="live">Live</option>
                <option value="sandbox">Sandbox</option>
              </select>
              <input className="input" placeholder="https://api.courier.com" value={d.url} onChange={(e) => setRow("api_domains", i, "url", e.target.value)} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeRow("api_domains", i)}>
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setForm((f) => ({ ...f, api_domains: [...f.api_domains, { environment: "sandbox", url: "" }] }))}
          >
            + Add domain
          </button>
    </>
  );

  if (docPlugin) {
    return (
      <Layout onRefresh={load}>
        <PluginApiDocs plugin={docPlugin} contract={contract} onBack={() => setDocPlugin(null)} />
      </Layout>
    );
  }

  return (
    <Layout onRefresh={load}>
      <div className="page-header">
        <h1>Shipping plugins</h1>
        <input
          className="input"
          type="search"
          style={{ maxWidth: 280 }}
          placeholder="Search plugins…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search plugins"
        />
        <button className="btn btn-primary" onClick={newPlugin}>
          + New plugin
        </button>
      </div>

      <ErrorBox message={error} />
      <SuccessBox message={notice} />

      {form && (
        <form className="panel form-panel" onSubmit={save}>
          <h2>{form._id ? `Edit ${form.app_name}` : "New plugin"}</h2>

          {!isAdmin && (
            <p className="muted small" style={{ marginTop: 0 }}>
              {editing ? (
                <>
                  Review status: <strong>{REVIEW_LABEL[reviewOf(editing)]}</strong>.{" "}
                </>
              ) : (
                "New plugins start as a draft. "
              )}
              Sellers only see a plugin after an admin approves it. Changing the API domains, APIs, seller fields, adapter key or
              documentation link of a submitted or approved plugin sends it back to draft.
            </p>
          )}
          {editing && reviewOf(editing) === "rejected" && editing.review_note && (
            <ErrorBox message={`Rejected by admin: ${editing.review_note}`} />
          )}

          <div style={{ marginBottom: 14 }}>
            <span className="adm-plug-label">Integration type</span>
            <select className="input" value={form.integration} onChange={set("integration")} aria-label="Integration type">
              <option value="standard">Standard Expressfly API (recommended)</option>
              <option value="custom">Custom (advanced)</option>
            </select>
            <p className="muted small" style={{ marginBottom: 0 }}>
              {isStd
                ? "The courier implements the fixed Expressfly Courier API. You only enter its main domain: paths, headers and responses are preloaded."
                : "Hand-write each API call and response mapping. Switching an existing plugin to Standard replaces its API setup with the preloaded one."}
            </p>
          </div>

          <div className="adm-plug-grid">
            <div>
              <span className="adm-plug-label">App name *</span>
              <input className="input" value={form.app_name} onChange={set("app_name")} required />
            </div>
            <div>
              <span className="adm-plug-label">Logo URL</span>
              <input className="input" value={form.logo} onChange={set("logo")} placeholder="https://… or /uploads/…" />
            </div>
            <div>
              <span className="adm-plug-label">Status</span>
              <select className="input" value={form.status} onChange={set("status")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            {!isStd && (
              <div>
                <span className="adm-plug-label">Adapter key (optional)</span>
                <input className="input" value={form.adapter_key} onChange={set("adapter_key")} placeholder="e.g. delhivery" />
              </div>
            )}
          </div>
          <textarea
            className="input"
            rows={2}
            placeholder="Description shown to sellers"
            value={form.description}
            onChange={set("description")}
          />

          {isStd && (
            <>
              {renderDomains(
                "Main domain",
                "The courier's base URL, for example https://api.courier.com. Add a Sandbox row if the courier has a test server. The endpoint paths below are added to it."
              )}

              <h3 style={{ marginTop: 20 }}>Seller login fields</h3>
              <p className="muted small">
                Sellers type these when they connect the courier. The password is always hidden. You can only change the wording.
              </p>
              {form.std_fields.map((f, i) => (
                <div className="adm-plug-block" key={f.name}>
                  <span className="adm-plug-label">{f.name === "username" ? "Username field" : "Password field"}</span>
                  <div className="adm-plug-grid">
                    <input className="input" placeholder="Label shown to seller" value={f.label} onChange={(e) => setRow("std_fields", i, "label", e.target.value)} />
                    <input className="input" placeholder="Help text (optional)" value={f.help} onChange={(e) => setRow("std_fields", i, "help", e.target.value)} />
                    <input className="input" placeholder="Example value (optional)" value={f.placeholder} onChange={(e) => setRow("std_fields", i, "placeholder", e.target.value)} />
                  </div>
                </div>
              ))}

              <h3 style={{ marginTop: 20 }}>Preloaded endpoints</h3>
              <p className="muted small">
                The courier partner implements these. Headers, request fields and responses are fixed by the Expressfly Courier API, so there is
                nothing else to set up. Only change a path if the partner uses a different one.
              </p>
              <table className="data-table" aria-label="Preloaded endpoints">
                <thead>
                  <tr>
                    <th>Endpoint</th>
                    <th>Path</th>
                    <th>When it is called</th>
                  </tr>
                </thead>
                <tbody>
                  {(contract?.contract.endpoints || []).map((ep) => (
                    <tr key={ep.key}>
                      <td>
                        <span className="plug-doc-title">{ep.title}</span>
                        <div className="muted small">{ep.method}</div>
                      </td>
                      <td>
                        <input className="input" aria-label={`${ep.title} path`} value={form.standard_paths[ep.key] ?? ep.path} onChange={(e) => setPath(ep.key, e.target.value)} />
                      </td>
                      <td className="small">{ep.when}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!contract && <p className="muted small">Loading the endpoint list…</p>}

              <details className="plug-guide" style={{ marginTop: 14 }}>
                <summary>Courier API documentation (share this with the courier partner)</summary>
                <div className="order-actions" style={{ marginBottom: 12 }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={copyDocs}>
                    Copy as Markdown
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={downloadDocs}>
                    Download .md
                  </button>
                </div>
                {(contract?.contract.endpoints || []).map((ep) => (
                  <div key={ep.key} style={{ marginBottom: 14 }}>
                    <span className="plug-doc-title plug-mono">
                      {ep.method} {form.standard_paths[ep.key] || ep.path}
                    </span>
                    <div className="muted small">{ep.title}</div>
                    <span className="adm-plug-label">Request</span>
                    <pre className="plug-code">{JSON.stringify(ep.request, null, 2)}</pre>
                    <span className="adm-plug-label">Response</span>
                    <pre className="plug-code">{JSON.stringify(ep.response, null, 2)}</pre>
                  </div>
                ))}
                {contract && (
                  <div>
                    <span className="plug-doc-title">Tracking webhook (the courier calls Expressfly)</span>
                    <div className="muted small">{contract.contract.tracking_webhook.intro}</div>
                    <span className="adm-plug-label">Payload the courier sends</span>
                    <pre className="plug-code">{JSON.stringify(contract.contract.tracking_webhook.request, null, 2)}</pre>
                    <span className="adm-plug-label">Status values</span>
                    <pre className="plug-code">{contract.contract.tracking_webhook.statuses.map(([k, v]) => `${k.padEnd(18)}${v}`).join("\n")}</pre>
                    <span className="adm-plug-label">What Expressfly answers</span>
                    <pre className="plug-code">{JSON.stringify(contract.contract.tracking_webhook.responses[0].body, null, 2)}</pre>
                  </div>
                )}
              </details>
            </>
          )}

          {!isStd && (
            <>
          <h3 style={{ marginTop: 20 }}>Seller fields</h3>
          <p className="muted small">What each seller must enter (API key, account number…). Use the name in templates as {"{{name}}"}.</p>
          {form.attributes.map((a, i) => (
            <div className="adm-plug-block" key={i}>
              <div className="adm-plug-grid">
                <input className="input" placeholder="name (api_key)" value={a.name} onChange={(e) => setRow("attributes", i, "name", e.target.value)} />
                <input className="input" placeholder="Label shown to seller" value={a.label} onChange={(e) => setRow("attributes", i, "label", e.target.value)} />
                <label className="small">
                  <input type="checkbox" checked={a.is_required} onChange={(e) => setRow("attributes", i, "is_required", e.target.checked)} /> Required
                </label>
                <label className="small">
                  <input type="checkbox" checked={a.is_secret} onChange={(e) => setRow("attributes", i, "is_secret", e.target.checked)} /> Secret
                </label>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeRow("attributes", i)}>
                  Remove
                </button>
              </div>
              <div className="adm-plug-grid" style={{ marginTop: 8 }}>
                <input className="input" placeholder="Help text (e.g. Dashboard > Settings > API)" value={a.help || ""} onChange={(e) => setRow("attributes", i, "help", e.target.value)} />
                <input className="input" placeholder="Example value (placeholder)" value={a.placeholder || ""} onChange={(e) => setRow("attributes", i, "placeholder", e.target.value)} />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setForm((f) => ({ ...f, attributes: [...f.attributes, { ...emptyAttribute }] }))}
          >
            + Add field
          </button>

            </>
          )}

          <h3 style={{ marginTop: 20 }}>Setup guide for sellers</h3>
          <p className="muted small">
            Shown to the seller as numbered steps when they click Configure. Leave empty to show an automatic guide.
          </p>
          <div style={{ marginBottom: 10 }}>
            <span className="adm-plug-label">Documentation link (optional)</span>
            <input className="input" placeholder="https://courier.com/docs/api" value={form.docs_url} onChange={set("docs_url")} />
          </div>
          {form.setup_steps.map((st, i) => (
            <div className="adm-plug-block" key={i}>
              <span className="adm-plug-label">Step {i + 1}</span>
              <input
                className="input"
                placeholder="Step title (e.g. Copy your API key)"
                value={st.title}
                onChange={(e) => setRow("setup_steps", i, "title", e.target.value)}
              />
              <textarea
                className="input"
                rows={2}
                style={{ marginTop: 8 }}
                placeholder="Explain what the seller should do"
                value={st.description}
                onChange={(e) => setRow("setup_steps", i, "description", e.target.value)}
              />
              <div className="order-actions" style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-ghost btn-sm" disabled={i === 0} onClick={() => moveStep(i, -1)}>
                  Move up
                </button>
                <button type="button" className="btn btn-ghost btn-sm" disabled={i === form.setup_steps.length - 1} onClick={() => moveStep(i, 1)}>
                  Move down
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeRow("setup_steps", i)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
          <div className="order-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm((f) => ({ ...f, setup_steps: [...f.setup_steps, { title: "", description: "" }] }))}>
              + Add step
            </button>
            {form.setup_steps.length === 0 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm((f) => ({ ...f, setup_steps: SAMPLE_STEPS.map((x) => ({ ...x })) }))}>
                Start from a template
              </button>
            )}
          </div>

          {!isStd && (
            <>
              {renderDomains("API domains")}

          <h3 style={{ marginTop: 20 }}>APIs</h3>
          <p className="muted small">
            Placeholders: seller fields, {"{{token}}"}, {"{{pickup.pincode}}"}, {"{{delivery.pincode}}"},{" "}
            {"{{package.chargeable_weight_kg}}"}, {"{{payment.is_cod}}"}, {"{{order.id}}"}, {"{{rate.id}}"}, {"{{awb}}"}, {"{{webhook_url}}"}.
          </p>
          {form.apis.map((a, i) => (
            <div className="adm-plug-block" key={a.api_type}>
              <div className="adm-plug-grid">
                <div>
                  <span className="adm-plug-label">Type</span>
                  <strong>{a.api_type}</strong>
                </div>
                <div>
                  <span className="adm-plug-label">Method</span>
                  <select className="input" value={a.method} onChange={(e) => setRow("apis", i, "method", e.target.value)}>
                    {["GET", "POST", "PUT", "DELETE"].map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="adm-plug-label">Response type</span>
                  <select className="input" value={a.response_type} onChange={(e) => setRow("apis", i, "response_type", e.target.value)}>
                    <option value="json">json</option>
                    <option value="xml">xml</option>
                  </select>
                </div>
                <div>
                  <span className="adm-plug-label">Path</span>
                  <input className="input" placeholder="/v1/rates" value={a.path} onChange={(e) => setRow("apis", i, "path", e.target.value)} />
                </div>
              </div>
              {a.api_type === "tracking" && (
                <div style={{ marginBottom: 10 }}>
                  <span className="adm-plug-label">Webhook URL (courier docs reference)</span>
                  <input className="input" value={a.webhook_url} onChange={(e) => setRow("apis", i, "webhook_url", e.target.value)} />
                </div>
              )}
              {JSON_FIELDS.filter((f) => f !== "webhook_mapping" || a.api_type === "tracking").map((f) => (
                <div key={f} style={{ marginBottom: 10 }}>
                  <span className="adm-plug-label">{f.replace(/_/g, " ")} (JSON)</span>
                  <textarea className="input adm-plug-json" value={a[f]} onChange={(e) => setRow("apis", i, f, e.target.value)} spellCheck={false} />
                </div>
              ))}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeRow("apis", i)}>
                Remove {a.api_type}
              </button>
            </div>
          ))}
          <div className="order-actions" style={{ marginBottom: 18 }}>
            {API_TYPES.filter((t) => !usedTypes.includes(t)).map((t) => (
              <button type="button" key={t} className="btn btn-ghost btn-sm" onClick={() => setForm((f) => ({ ...f, apis: [...f.apis, emptyApi(t)] }))}>
                + {t}
              </button>
            ))}
          </div>

            </>
          )}

          <div className="order-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save plugin"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {!loading && plugins.length > 0 && (
        <div className="plug-filters" role="tablist" aria-label="Filter by review status">
          {[
            ["all", `All (${plugins.length})`],
            ["pending", `${isAdmin ? "Needs review" : "Pending review"} (${pendingCount})`],
            ["approved", `Approved (${countBy("approved")})`],
            ["draft", `Draft (${countBy("draft")})`],
            ["rejected", `Rejected (${countBy("rejected")})`],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={reviewFilter === key}
              className={`plug-pill${reviewFilter === key ? " is-on" : ""}`}
              onClick={() => setReviewFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Loading />
      ) : plugins.length === 0 ? (
        <EmptyState>No plugins yet. Click "New plugin" to add your first courier.</EmptyState>
      ) : shown.length === 0 ? (
        <EmptyState>No plugins match your search.</EmptyState>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Plugin</th>
              <th>Review</th>
              <th>Status</th>
              <th>APIs</th>
              <th>Seller fields</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p._id}>
                <td>
                  <strong>{p.app_name}</strong>
                  <div className="muted small">
                    {p.slug} · by {p.created_by_model === "Developer" ? "developer" : "admin"}
                  </div>
                </td>
                <td>
                  <span className={`badge ${REVIEW_BADGE[reviewOf(p)]}`}>{REVIEW_LABEL[reviewOf(p)]}</span>
                  {reviewOf(p) === "rejected" && p.review_note && <div className="muted small" style={{ maxWidth: 220 }}>{p.review_note}</div>}
                </td>
                <td>
                  <span className={`badge ${p.status === "active" ? "badge-active" : "badge-muted"}`}>{p.status}</span>
                </td>
                <td className="small">
                  {p.integration === "standard" ? "Standard API" : p.adapter_key ? `adapter: ${p.adapter_key}` : p.apis.map((a) => a.api_type).join(", ") || "—"}
                </td>
                <td className="small">{p.attributes.length}</td>
                <td>
                  <div className="order-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setDocPlugin(p)}>
                      API docs
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setForm(toForm(p))}>
                      Edit
                    </button>
                    {!isAdmin && ["draft", "rejected"].includes(reviewOf(p)) && (
                      <button className="btn btn-primary btn-sm" disabled={busyId === p._id} onClick={() => submitForReview(p)}>
                        Submit for review
                      </button>
                    )}
                    {isAdmin && reviewOf(p) !== "approved" && (
                      <button className="btn btn-primary btn-sm" disabled={busyId === p._id} onClick={() => decide(p, "approved")}>
                        Approve
                      </button>
                    )}
                    {isAdmin && ["pending", "approved"].includes(reviewOf(p)) && (
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={busyId === p._id}
                        onClick={() => {
                          setRejectNote("");
                          setRejecting(p);
                        }}
                      >
                        {reviewOf(p) === "approved" ? "Revoke" : "Reject"}
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => remove(p)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {rejecting && (
        <Modal
          title={reviewOf(rejecting) === "approved" ? `Revoke ${rejecting.app_name}` : `Reject ${rejecting.app_name}`}
          onClose={() => setRejecting(null)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setRejecting(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={rejectNote.trim().length < 3 || busyId === rejecting._id}
                onClick={() => decide(rejecting, "rejected", rejectNote)}
              >
                {reviewOf(rejecting) === "approved" ? "Revoke approval" : "Reject plugin"}
              </button>
            </>
          }
        >
          <p className="muted small" style={{ marginTop: 0 }}>
            Tell the developer what to fix. They will see this note. {reviewOf(rejecting) === "approved" && "Sellers will stop seeing this plugin right away."}
          </p>
          <textarea
            className="input"
            rows={4}
            autoFocus
            placeholder="e.g. The API domain must use https."
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
          />
        </Modal>
      )}
    </Layout>
  );
}

export default function AdminPlugins() {
  const { authHeader } = useAdminAuth();
  return <PluginManager Layout={AdminLayout} authHeader={authHeader} apiBase="/admin/plugins" />;
}
