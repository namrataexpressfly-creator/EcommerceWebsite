import { useMemo, useState } from "react";
import "../styles/plugin-api-docs.css";

const API_TITLES = {
  token_generation: "Login (get token)",
  create_warehouse: "Create warehouse",
  get_rating: "Get rates",
  order_rate: "Order rate",
  order_create: "Create shipment",
  tracking: "Tracking",
  set_webhook: "Set tracking webhook URL",
};

const API_WHEN = {
  token_generation: "When a seller connects the courier, and again automatically shortly before the token expires.",
  create_warehouse: "Before the first rate check or shipment from a pickup warehouse, and again if the seller edits that warehouse.",
  get_rating: "When a seller clicks Ship on an order and picks this courier.",
  order_rate: "When a rate has to be calculated for an order.",
  order_create: "When the seller confirms a rate and the shipment is created.",
  tracking: "When Expressfly asks the courier for the latest status of a shipment.",
  set_webhook: "When the seller connects the courier (and whenever they save their credentials again).",
};

const SAMPLE_VALUES = {
  username: "urbanstyle_store",
  password: "s3cret-pass",
  api_key: "sk_live_xxxxxxxxxxxx",
  token: "eyJhbGciOiJIUzI1NiJ9...",
  "pickup.pincode": "400093",
  "delivery.pincode": "110001",
  "package.chargeable_weight_kg": 0.75,
  "payment.is_cod": true,
  "order.id": "TRK-9X2KQ7",
  "rate.id": "RATE-7f3a91",
  awb: "77052358062",
  webhook_url: "https://api.yourstore.com/api/webhook/plugin/<id>/<secret>",
  tracking_url: "https://api.yourstore.com/api/webhook/plugin/<id>/<secret>",
};

const pretty = (v) => (typeof v === "string" ? v : JSON.stringify(v ?? {}, null, 2));
const asObject = (v) => {
  if (v && typeof v === "object") return v;
  try {
    return v ? JSON.parse(v) : {};
  } catch {
    return {};
  }
};
const trimSlash = (s) => String(s || "").replace(/\/+$/, "");
const isEmpty = (o) => !o || (typeof o === "object" && Object.keys(o).length === 0);


function fillSamples(value, attrNames = []) {
  if (typeof value === "string") {
    const whole = value.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
    if (whole) {
      const key = whole[1];
      if (key in SAMPLE_VALUES) return SAMPLE_VALUES[key];
      if (attrNames.includes(key)) return SAMPLE_VALUES[key] || `<${key}>`;
      return `<${key}>`;
    }
    return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key) => (key in SAMPLE_VALUES ? String(SAMPLE_VALUES[key]) : `<${key}>`));
  }
  if (Array.isArray(value)) return value.map((v) => fillSamples(v, attrNames));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fillSamples(v, attrNames)]));
  return value;
}

function collectPlaceholders(value, out = new Set()) {
  if (typeof value === "string") {
    for (const m of value.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) out.add(m[1]);
  } else if (Array.isArray(value)) value.forEach((v) => collectPlaceholders(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => collectPlaceholders(v, out));
  return out;
}

export function buildCurl({ method, url, headers, body }) {
  const lines = [`curl -X ${method} "${url}"`];
  Object.entries(headers).forEach(([k, v]) => lines.push(`  -H "${k}: ${v}"`));
  if (body && method !== "GET") lines.push(`  -d '${JSON.stringify(body, null, 2).replace(/\n/g, "\n  ")}'`);
  return lines.join(" \\\n");
}

export function buildNode({ method, url, headers, body }) {
  const hasBody = body && method !== "GET";
  return `const res = await fetch("${url}", {
  method: "${method}",
  headers: ${JSON.stringify(headers, null, 4).replace(/\n}/, "\n  }")},${
    hasBody ? `\n  body: JSON.stringify(${JSON.stringify(body, null, 2).replace(/\n/g, "\n  ")}),` : ""
  }
});
const data = await res.json();
console.log(data);`;
}

function buildEndpoints(plugin, contract) {
  const domains = plugin.api_domains || [];
  const live = domains.find((d) => d.environment === "live") || domains[0];
  const base = trimSlash(live?.url) || "https://api.courier.com";
  const attrNames = (plugin.attributes || []).map((a) => a.name);
  const isStd = plugin.integration === "standard";
  const byKey = Object.fromEntries((contract?.contract?.endpoints || []).map((e) => [e.key, e]));

  return (plugin.apis || []).map((api) => {
    const std = isStd ? byKey[api.api_type] : null;
    const method = api.method || "POST";
    const path = api.path || std?.path || "/";
    const url = `${base}${path}`;

    const headerTemplate = asObject(api.headers);
    const headers = fillSamples(headerTemplate, attrNames);
    if (isEmpty(headers)) Object.assign(headers, { "Content-Type": "application/json" });

    const bodyTemplate = asObject(api.parameter);
    const body = std ? std.request : isEmpty(bodyTemplate) ? null : fillSamples(bodyTemplate, attrNames);

    const mapping = asObject(api.response_mapping);
    const response = std
      ? std.response
      : isEmpty(mapping)
        ? { success: true }
        : fillResponseFromMapping(mapping);

    const fields = [...collectPlaceholders(bodyTemplate)].map((p) => ({
      name: p,
      source: attrNames.includes(p) ? "Seller field" : p === "token" ? "From Login response" : "Filled by Expressfly",
    }));

    return {
      key: api.api_type,
      title: std?.title || API_TITLES[api.api_type] || api.api_type,
      method,
      path,
      url,
      when: std?.when || API_WHEN[api.api_type] || "",
      headers,
      body,
      response,
      responseType: api.response_type || "json",
      notes: std?.notes || [],
      fields,
      mapping,
      webhookMapping: asObject(api.webhook_mapping),
      sandbox: domains.find((d) => d.environment === "sandbox")?.url || "",
    };
  });
}

function fillResponseFromMapping(mapping) {
  const out = {};
  const put = (path, val) => {
    const keys = String(path).split(".");
    let cur = out;
    keys.forEach((k, i) => {
      if (i === keys.length - 1) cur[k] = val;
      else cur = cur[k] ??= {};
    });
  };
  for (const [name, path] of Object.entries(mapping)) {
    if (typeof path === "string") put(path, SAMPLE_VALUES[name] ?? `<${name}>`);
    else if (path && typeof path === "object") {
      const item = {};
      for (const [k, p] of Object.entries(path)) item[String(p)] = `<${k}>`;
      const listPath = typeof mapping.rates === "string" ? mapping.rates : name;
      put(listPath, [item]);
    }
  }
  return out;
}

export function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      
    }
  };
  return (
    <div className="pad-code">
      <button type="button" className="pad-copy" onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </button>
      <pre>{code}</pre>
    </div>
  );
}

function Endpoint({ ep, plugin }) {
  const [tab, setTab] = useState("curl");
  const code = tab === "curl" ? buildCurl(ep) : buildNode(ep);
  return (
    <section className="pad-endpoint" id={`api-${ep.key}`}>
      <div className="pad-left">
        <h2>{ep.title}</h2>
        <div className="pad-route">
          <span className={`pad-method pad-${ep.method.toLowerCase()}`}>{ep.method}</span>
          <code>{ep.url}</code>
        </div>
        {ep.when && (
          <p className="pad-when">
            <strong>When it is called:</strong> {ep.when}
          </p>
        )}

        <h4>Headers</h4>
        <table className="pad-table">
          <tbody>
            {Object.entries(ep.headers).map(([k, v]) => (
              <tr key={k}>
                <td className="pad-key">{k}</td>
                <td>
                  <code>{String(v)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {ep.body && (
          <>
            <h4>Request body</h4>
            {ep.fields.length > 0 && plugin.integration !== "standard" && (
              <table className="pad-table">
                <thead>
                  <tr>
                    <th>Placeholder</th>
                    <th>Where the value comes from</th>
                  </tr>
                </thead>
                <tbody>
                  {ep.fields.map((f) => (
                    <tr key={f.name}>
                      <td className="pad-key">{`{{${f.name}}}`}</td>
                      <td>{f.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="muted small">The JSON sent to the courier is shown in the example on the right.</p>
          </>
        )}

        {!isEmpty(ep.mapping) && plugin.integration !== "standard" && (
          <>
            <h4>Response mapping</h4>
            <p className="muted small">Where Expressfly reads each value from the courier's response.</p>
            <table className="pad-table">
              <tbody>
                {Object.entries(ep.mapping).map(([k, v]) => (
                  <tr key={k}>
                    <td className="pad-key">{k}</td>
                    <td>
                      <code>{typeof v === "string" ? v : JSON.stringify(v)}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {ep.notes.length > 0 && (
          <>
            <h4>Notes</h4>
            <ul className="pad-notes">
              {ep.notes.map((n, i) => (
                <li key={i}>{n.replace(/`/g, "")}</li>
              ))}
            </ul>
          </>
        )}
        {ep.sandbox && (
          <p className="muted small">
            Sandbox base URL: <code>{ep.sandbox}</code>
          </p>
        )}
      </div>

      <div className="pad-right">
        <div className="pad-panel">
          <div className="pad-tabs">
            <span className="pad-panel-title">Example request</span>
            <button type="button" className={tab === "curl" ? "is-on" : ""} onClick={() => setTab("curl")}>
              cURL
            </button>
            <button type="button" className={tab === "node" ? "is-on" : ""} onClick={() => setTab("node")}>
              Node.js
            </button>
          </div>
          <CodeBlock code={code} />
        </div>
        <div className="pad-panel">
          <div className="pad-tabs">
            <span className="pad-panel-title">Response · {ep.responseType.toUpperCase()}</span>
          </div>
          <CodeBlock code={pretty(ep.response)} />
        </div>
      </div>
    </section>
  );
}

function WebhookSection({ webhook }) {
  if (!webhook) return null;
  const curl = `curl -X POST "https://api.yourstore.com/api/webhook/plugin/<id>/<secret>" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(webhook.request, null, 2).replace(/\n/g, "\n  ")}'`;
  return (
    <section className="pad-endpoint" id="api-webhook">
      <div className="pad-left">
        <h2>{webhook.title}</h2>
        <div className="pad-route">
          <span className="pad-method pad-post">POST</span>
          <code>{"<tracking_url from set-webhook-url>"}</code>
        </div>
        <p className="pad-when">{webhook.intro.replace(/`/g, "")}</p>
        <h4>Fields</h4>
        <table className="pad-table">
          <tbody>
            {webhook.fields.map(([f, req, meaning]) => (
              <tr key={f}>
                <td className="pad-key">{f}</td>
                <td className="small">{req}</td>
                <td className="small">{meaning.replace(/`/g, "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h4>Status labels</h4>
        <table className="pad-table">
          <tbody>
            {webhook.statuses.map(([s, m]) => (
              <tr key={s}>
                <td className="pad-key">{s}</td>
                <td className="small">{m}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h4>Notes</h4>
        <ul className="pad-notes">
          {webhook.notes.map((n, i) => (
            <li key={i}>{n.replace(/`/g, "")}</li>
          ))}
        </ul>
      </div>
      <div className="pad-right">
        <div className="pad-panel">
          <div className="pad-tabs">
            <span className="pad-panel-title">Example request (courier → Expressfly)</span>
          </div>
          <CodeBlock code={curl} />
        </div>
        <div className="pad-panel">
          <div className="pad-tabs">
            <span className="pad-panel-title">Response</span>
          </div>
          <CodeBlock code={pretty(webhook.responses[0].body)} />
        </div>
      </div>
    </section>
  );
}

export default function PluginApiDocs({ plugin, contract, onBack }) {
  const endpoints = useMemo(() => buildEndpoints(plugin, contract), [plugin, contract]);
  const isStd = plugin.integration === "standard";
  const webhook = isStd ? contract?.contract?.tracking_webhook : null;
  const common = contract?.contract?.common;

  return (
    <div className="pad-root">
      <div className="pad-top">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          ← Back to plugins
        </button>
        <h1>
          {plugin.app_name} <span className="pad-ver">API reference</span>
        </h1>
        <p className="muted">
          {plugin.description || "These are the courier APIs this plugin calls."}{" "}
          {isStd ? "This plugin uses the Standard Expressfly Courier API." : plugin.adapter_key ? `It runs the "${plugin.adapter_key}" adapter.` : "This plugin uses a custom API setup."}
        </p>
        {plugin.docs_url && (
          <a className="small" href={plugin.docs_url} target="_blank" rel="noreferrer">
            Courier's own documentation ↗
          </a>
        )}
      </div>

      <div className="pad-layout">
        <nav className="pad-nav" aria-label="APIs in this plugin">
          <span className="pad-nav-title">APIs used</span>
          {endpoints.map((ep) => (
            <a key={ep.key} href={`#api-${ep.key}`}>
              <span className={`pad-dot pad-${ep.method.toLowerCase()}`}>{ep.method}</span> {ep.title}
            </a>
          ))}
          {webhook && <a href="#api-webhook">Tracking webhook</a>}
        </nav>

        <div className="pad-main">
          <section className="pad-intro">
            <h3>How the plugin works</h3>
            <ol className="pad-flow">
              <li>The seller enters their courier login in <strong>Plugins → Configure</strong>.</li>
              <li>Expressfly calls <strong>{endpoints[0]?.title || "Login"}</strong> to get a token, then the other APIs below in order.</li>
              <li>When the seller clicks <strong>Ship</strong> on an order, rates are fetched and the shipment is created.</li>
              <li>The courier sends tracking updates back to Expressfly, and the order status updates.</li>
            </ol>
            {common && (
              <>
                <h4>Rules for every request</h4>
                <ul className="pad-notes">
                  {common.rules.map((r, i) => (
                    <li key={i}>{r.replace(/`/g, "")}</li>
                  ))}
                </ul>
                <h4>Error example</h4>
                <CodeBlock code={pretty(common.error_example)} />
              </>
            )}
            {(plugin.attributes || []).length > 0 && (
              <>
                <h4>Seller fields</h4>
                <table className="pad-table">
                  <tbody>
                    {plugin.attributes.map((a) => (
                      <tr key={a.name}>
                        <td className="pad-key">{a.name}</td>
                        <td>{a.label || a.name}</td>
                        <td className="small">
                          {a.is_required ? "required" : "optional"}
                          {a.is_secret ? " · secret" : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>

          {endpoints.length === 0 && !webhook && (
            <p className="muted">
              {plugin.adapter_key
                ? "This plugin runs a built-in adapter, so there are no custom API calls to show."
                : "No APIs have been added to this plugin yet. Edit the plugin and add at least one API."}
            </p>
          )}
          {endpoints.map((ep) => (
            <Endpoint key={ep.key} ep={ep} plugin={plugin} />
          ))}
          <WebhookSection webhook={webhook} />
        </div>
      </div>
    </div>
  );
}
