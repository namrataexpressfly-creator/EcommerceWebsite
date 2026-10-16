import { useEffect, useState } from "react";
import client, { resolveMediaUrl } from "../../api/client";
import { Loading, ErrorBox, EmptyState } from "../../components/Ui";
import Modal from "../../components/Modal";
import Switch from "../../components/Switch";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import "../../styles/plugins.css";

function PluginLogo({ plugin }) {
  if (plugin.logo) {
    return <img className="plug-logo" src={resolveMediaUrl(plugin.logo)} alt="" />;
  }
  return <div className="plug-logo plug-logo-fallback">{plugin.app_name?.[0]?.toUpperCase()}</div>;
}


function defaultSteps(plugin) {
  const need = plugin.attributes.filter((a) => a.is_required).map((a) => a.label || a.name);
  const steps = [
    { title: `Log in to your ${plugin.app_name} account`, description: "Open the courier's dashboard, then go to its API or developer settings." },
    {
      title: "Copy your credentials",
      description: need.length ? `You will need: ${need.join(", ")}.` : "Copy the details the courier asks you to share.",
    },
    {
      title: "Paste them below",
      description: plugin.environments.length > 1 ? "Choose Sandbox first if you want to test safely, then Live when you are ready." : "Enter each value in the matching box.",
    },
    plugin.integration === "standard"
      ? { title: "Click \"Install\"", description: "You should see \"Installed successfully\". If not, re-check the values you pasted." }
      : { title: "Click \"Save & test connection\"", description: "You should see \"Connected successfully\". If not, re-check the values you pasted." },
    plugin.integration === "standard"
      ? { title: "Tracking switches on by itself", description: `Install also tells ${plugin.app_name} where to send delivery updates. There is nothing to paste.` }
      : { title: "Add the webhook URL", description: `Copy the Webhook URL at the bottom of this window and paste it in ${plugin.app_name}'s dashboard so delivery updates reach your orders.` },
    { title: "Turn the plugin On", description: "Close this window and switch the plugin to Active. It will then appear when you click Ship on an order." },
  ];
  return steps;
}

function SetupGuide({ plugin, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const custom = plugin.setup_steps || [];
  const steps = custom.length ? custom : defaultSteps(plugin);

  return (
    <details className="plug-guide" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>How to set up {plugin.app_name}</summary>
      <ol className="plug-steps">
        {steps.map((st, i) => (
          <li key={i}>
            <strong>{st.title}</strong>
            {st.description && <span>{st.description}</span>}
          </li>
        ))}
      </ol>
      {plugin.docs_url && (
        <a className="plug-doc-link" href={plugin.docs_url} target="_blank" rel="noopener noreferrer">
          Open {plugin.app_name} documentation ↗
        </a>
      )}
    </details>
  );
}

function ConfigureModal({ plugin, onClose, onChanged }) {
  const sp = plugin.store_plugin;
  const toast = useToast();
  const [values, setValues] = useState({});
  const [environment, setEnvironment] = useState(sp.environment);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const isStandard = plugin.integration === "standard";

  const saved = Object.fromEntries(sp.attributes.map((a) => [a.name, a]));

  const save = async (extra = {}) => {
    setSaving(true);
    setError("");
    try {
      const { data } = await client.put(`/seller/plugins/store/${sp.id}`, {
        attributes: values,
        environment,
        ...extra,
      });
      setValues({});
      onChanged(plugin.id, data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const onSave = async () => {
    const data = await save();
    if (data) toast.success("Plugin settings saved.");
  };

  const onTest = async () => {
    const data = await save();
    if (!data) return;
    setTesting(true);
    try {
      const { data: res } = await client.post(`/seller/plugins/store/${sp.id}/${isStandard ? "install" : "test"}`);
      if (res.store_plugin) onChanged(plugin.id, res.store_plugin);
     
      (res.warning ? toast.error : toast.success)(res.message || "Connected.");
    } catch (err) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sp.webhook_url);
      toast.success("Webhook URL copied.");
    } catch {
      toast.error("Could not copy. Select the text and copy it manually.");
    }
  };

  return (
    <Modal
      title={`Set up ${plugin.app_name}`}
      onClose={onClose}
      width={560}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn btn-ghost" onClick={onTest} disabled={saving || testing}>
            {isStandard ? (testing ? "Installing…" : sp.webhook_registered ? "Reinstall" : "Install") : testing ? "Testing…" : "Save & test connection"}
          </button>
          <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <SetupGuide plugin={plugin} defaultOpen={sp.missing.length > 0} />

      <ErrorBox message={error} />

      {plugin.environments.length > 1 && (
        <div className="plug-field">
          <label>Environment</label>
          <select className="input" value={environment} onChange={(e) => setEnvironment(e.target.value)}>
            {plugin.environments.map((env) => (
              <option key={env} value={env}>
                {env === "live" ? "Live" : "Sandbox (testing)"}
              </option>
            ))}
          </select>
        </div>
      )}

      {plugin.attributes.map((def) => {
        const current = saved[def.name];
        return (
          <div className="plug-field" key={def.name}>
            <label htmlFor={`plug-${def.name}`}>
              {def.label || def.name}
              {def.is_required && " *"}
              {current?.has_value && <span className="plug-saved">✓ saved</span>}
            </label>
            <input
              id={`plug-${def.name}`}
              className="input"
              type={def.is_secret ? "password" : "text"}
              autoComplete="off"
              placeholder={
                current?.has_value
                  ? def.is_secret
                    ? `${current.value} (leave blank to keep)`
                    : "Leave blank to keep"
                  : def.placeholder || ""
              }
              value={values[def.name] ?? (def.is_secret ? "" : current?.value ?? "")}
              onChange={(e) => setValues((v) => ({ ...v, [def.name]: e.target.value }))}
            />
            {def.help && <span className="plug-hint">{def.help}</span>}
          </div>
        );
      })}

      {isStandard && sp.webhook_registered && (
        <div className="plug-field">
          <span className="plug-saved">✓ Installed. Tracking updates are switched on.</span>
        </div>
      )}

      {!isStandard && (
      <div className="plug-field">
        <label>Webhook URL</label>
        <div className="plug-copy">
          <code>{sp.webhook_url}</code>
          <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>
            Copy
          </button>
        </div>
        <span className="plug-hint">
          {plugin.integration === "standard"
            ? `Sent to ${plugin.app_name} automatically when you click "Save & test connection". You only need this if their support asks for it.`
            : `Paste this in ${plugin.app_name}'s dashboard so delivery updates reach your orders.`}
        </span>
      </div>
      )}
    </Modal>
  );
}

export default function Plugins() {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [configuring, setConfiguring] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | installed | available
  const toast = useToast();
  const confirmAction = useConfirm();

  const load = () => {
    setLoading(true);
    client
      .get("/seller/plugins")
      .then(({ data }) => setPlugins(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const applyStorePlugin = (pluginId, sp) =>
    setPlugins((list) => list.map((p) => (p.id === pluginId ? { ...p, installed: true, store_plugin: sp } : p)));

  const install = async (plugin) => {
    setBusyId(plugin.id);
    try {
      const { data } = await client.post(`/seller/plugins/${plugin.id}/install`);
      applyStorePlugin(plugin.id, data);
      setConfiguring(plugin.id);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const toggle = async (plugin, next) => {
    setBusyId(plugin.id);
    try {
      const { data } = await client.put(`/seller/plugins/store/${plugin.store_plugin.id}`, {
        status: next ? "active" : "inactive",
      });
      applyStorePlugin(plugin.id, data);
      toast.success(next ? `${plugin.app_name} is active.` : `${plugin.app_name} turned off.`);
    } catch (err) {
      toast.error(err.message);
      if (next) setConfiguring(plugin.id); // missing fields -> open the form
    } finally {
      setBusyId(null);
    }
  };

  const uninstall = async (plugin) => {
    const ok = await confirmAction({
      title: `Remove ${plugin.app_name}?`,
      message: "Your saved credentials will be deleted. Shipments already created keep working in your order history.",
      confirmText: "Remove",
      danger: true,
    });
    if (!ok) return;
    setBusyId(plugin.id);
    try {
      await client.delete(`/seller/plugins/store/${plugin.store_plugin.id}`);
      setPlugins((list) =>
        list.map((p) => (p.id === plugin.id ? { ...p, installed: false, store_plugin: null } : p))
      );
      toast.success(`${plugin.app_name} removed.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const active = plugins.find((p) => p.id === configuring);

  const q = query.trim().toLowerCase();
  const visible = plugins.filter((p) => {
    const matches = !q || p.app_name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);
    const fits = filter === "all" || (filter === "installed" ? p.installed : !p.installed);
    return matches && fits;
  });
  const installedCount = plugins.filter((p) => p.installed).length;
  const FILTERS = [
    ["all", `All (${plugins.length})`],
    ["installed", `Installed (${installedCount})`],
    ["available", `Available (${plugins.length - installedCount})`],
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Plugins</h1>
        <input
          className="input"
          type="search"
          style={{ maxWidth: 300 }}
          placeholder="Search plugins…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search plugins"
        />
      </div>
      <p className="muted small">
        Connect the couriers you ship with. Active plugins appear when you click Ship on an order.
      </p>

      <ErrorBox message={error} />

      {!loading && plugins.length > 0 && (
        <div className="plug-filters" role="tablist" aria-label="Filter plugins">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              className={`plug-pill${filter === key ? " is-on" : ""}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Loading />
      ) : plugins.length === 0 ? (
        <EmptyState>No plugins are available yet.</EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState>
          No plugins match your search.{" "}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
          >
            Clear search
          </button>
        </EmptyState>
      ) : (
        <div className="plug-grid">
          {visible.map((p) => {
            const sp = p.store_plugin;
            return (
              <div className="plug-card" key={p.id}>
                <div className="plug-card-head">
                  <PluginLogo plugin={p} />
                  <h3>{p.app_name}</h3>
                </div>
                <p className="plug-desc">{p.description || "No description."}</p>

                {sp && sp.missing.length > 0 && (
                  <div className="plug-note">Missing: {sp.missing.join(", ")}</div>
                )}

                <div className="plug-actions">
                  {!p.installed ? (
                    <button className="btn btn-primary btn-sm" disabled={busyId === p.id} onClick={() => install(p)}>
                      Add to my store
                    </button>
                  ) : (
                    <>
                      <Switch
                        checked={sp.status === "active"}
                        disabled={busyId === p.id}
                        onChange={(next) => toggle(p, next)}
                        label={sp.status === "active" ? "Active" : "Off"}
                      />
                      <div className="order-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => setConfiguring(p.id)}>
                          Configure
                        </button>
                        <button className="btn btn-ghost btn-sm" disabled={busyId === p.id} onClick={() => uninstall(p)}>
                          Remove
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {active?.store_plugin && (
        <ConfigureModal
          key={active.id}
          plugin={active}
          onClose={() => setConfiguring(null)}
          onChanged={applyStorePlugin}
        />
      )}
    </div>
  );
}
