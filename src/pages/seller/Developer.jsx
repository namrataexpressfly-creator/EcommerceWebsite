import { useMemo, useState } from "react";
import client from "../../api/client";
import { apiGroups, webhookDoc } from "../../data/apiDocs";
import "../../styles/seller-developer.css";

const METHOD_CLASS = { GET: "dev-method-get", POST: "dev-method-post", PUT: "dev-method-put", DELETE: "dev-method-delete" };

function apiBase() {

  const url = client.defaults?.baseURL || "";
  return url.replace(/\/api\/?$/, "") || "https://your-store-domain.com";
}

function withBase(snippet, base) {
  return snippet.split("https://api.yourstore.com").join(base);
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {

    }
  };
  return (
    <button type="button" className="dev-copy-btn" onClick={copy}>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ code }) {
  return (
    <div className="dev-code-block">
      <CopyButton text={code} />
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function EndpointCard({ endpoint, base }) {
  const [tab, setTab] = useState("curl");
  const curl = withBase(endpoint.curl, base);
  const js = withBase(endpoint.js, base);

  return (
    <article className="dev-endpoint" id={endpoint.id}>
      <div className="dev-endpoint-head">
        <span className={`dev-method ${METHOD_CLASS[endpoint.method]}`}>{endpoint.method}</span>
        <code className="dev-path">{endpoint.path}</code>
      </div>
      <h3>{endpoint.summary}</h3>
      <p className="dev-desc">{endpoint.description}</p>

      {endpoint.params?.length > 0 && (
        <div className="dev-params">
          <table className="dev-params-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>In</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {endpoint.params.map((p) => (
                <tr key={p.name}>
                  <td>
                    <code>{p.name}</code>
                  </td>
                  <td className="muted">{p.in}</td>
                  <td className="muted">{p.type}</td>
                  <td>{p.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="dev-example">
        <div className="dev-example-col">
          <div className="dev-tabs">
            <button type="button" className={tab === "curl" ? "dev-tab-active" : ""} onClick={() => setTab("curl")}>
              cURL
            </button>
            <button type="button" className={tab === "js" ? "dev-tab-active" : ""} onClick={() => setTab("js")}>
              JavaScript
            </button>
          </div>
          <CodeBlock code={tab === "curl" ? curl : js} />
        </div>
        <div className="dev-example-col">
          <div className="dev-tabs">
            <span className="dev-tab-static">Example response</span>
          </div>
          <CodeBlock code={endpoint.response} />
        </div>
      </div>
    </article>
  );
}

export default function Developer() {
  const base = useMemo(apiBase, []);
  const [activeGroup, setActiveGroup] = useState(apiGroups[0].id);

  return (
    <div className="dev-page">
      <div className="page-header">
        <h1>Developer</h1>
      </div>
      <p className="muted" style={{ maxWidth: 680 }}>
        Want a fully custom website or app on top of your store, instead of (or alongside) the built-in
        storefront? These are the public API endpoints your developer can call — no seller login needed for
        any of them except the webhook. All amounts are in your store's currency, and every list endpoint is
        paginated.
      </p>

      <div className="dev-base-card">
        <span className="muted small">Your API base URL</span>
        <div className="dev-base-row">
          <code>{base}</code>
          <CopyButton text={base} />
        </div>
      </div>

      <div className="dev-layout">
        <nav className="dev-side-nav">
          {apiGroups.map((g) => (
            <a
              key={g.id}
              href={`#group-${g.id}`}
              className={activeGroup === g.id ? "dev-side-link dev-side-link-active" : "dev-side-link"}
              onClick={() => setActiveGroup(g.id)}
            >
              {g.title}
            </a>
          ))}
          <a href="#group-webhook" className="dev-side-link" onClick={() => setActiveGroup("webhook")}>
            Payment webhook
          </a>
        </nav>

        <div className="dev-content">
          {apiGroups.map((group) => (
            <section key={group.id} id={`group-${group.id}`} className="dev-group">
              <h2>{group.title}</h2>
              <p className="muted">{group.description}</p>
              {group.endpoints.map((ep) => (
                <EndpointCard key={ep.id} endpoint={ep} base={base} />
              ))}
            </section>
          ))}

          <section id="group-webhook" className="dev-group">
            <h2>{webhookDoc.title}</h2>
            <p className="muted">{webhookDoc.description}</p>
            <article className="dev-endpoint">
              <div className="dev-endpoint-head">
                <span className={`dev-method ${METHOD_CLASS.POST}`}>POST</span>
                <code className="dev-path">{webhookDoc.path}</code>
              </div>
              <ol className="dev-steps">
                {webhookDoc.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              <p className="dev-desc">{webhookDoc.note}</p>
              <a className="btn btn-ghost" href="/seller/payment-settings">
                Go to Payment methods →
              </a>
            </article>
          </section>
        </div>
      </div>
    </div>
  );
}
