import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import client from "../../api/client";
import DeveloperLayout from "./DeveloperLayout";
import { useDeveloperAuth } from "../../context/DeveloperAuthContext";
import { Loading, ErrorBox } from "../../components/Ui";
import { CodeBlock, buildCurl, buildNode } from "../../components/PluginApiDocs";
import "../../styles/plugin-api-docs.css";
import "../../styles/developer-docs.css";
import { DOCS_PATH, DOCS_ACTIVE_EVENT } from "../../data/devDocsNav";

const BASE = "https://api.courier.com";
const pretty = (o) => JSON.stringify(o, null, 2);
const clean = (t) => String(t || "").replace(/`/g, "");

const HTTP_STATUS = [
  ["200", "OK", "Everything worked. Include \"success\": true."],
  ["200", "OK + success:false", "A business error (for example an unserviceable pincode). Expressfly shows your message to the seller."],
  ["400", "Bad Request", "Missing or invalid field. Say which one in \"message\"."],
  ["401", "Unauthorized", "Token missing, wrong or expired. Expressfly logs in again once and retries."],
  ["403", "Forbidden", "The account is not allowed to do this (for example not activated)."],
  ["404", "Not Found", "Unknown warehouse_id, rate id or shipment."],
  ["409", "Conflict", "Duplicate request that cannot be merged. Prefer returning the existing result instead."],
  ["429", "Too Many Requests", "You are rate limiting Expressfly. The seller can try again shortly."],
  ["500, 502, 503, 504", "Server Errors", "Something went wrong on your side. Keep these rare."],
];

const SELLER_ERRORS = [
  ["Courier returned a non-2xx status", "{Courier} rejected the request (422): <your message>", "502"],
  ["HTTP 200 with \"success\": false", "{Courier}: <your message>", "400"],
  ["Login worked but no \"token\" returned", "{Courier} did not return a login token. Please check your credentials.", "400"],
  ["No answer within 15 seconds", "{Courier} took too long to respond.", "504"],
  ["Server unreachable (DNS, refused, TLS)", "Could not reach {Courier}.", "504"],
  ["Body is not valid JSON", "The courier sent a response we could not read.", "502"],
  ["Production, domain is not https", "Courier URLs must use https.", "500"],
];

const TROUBLE = [
  ["Could not reach {Courier}", "The main domain is wrong, the server is down, or it is not public. Open the domain in a browser or run the cURL from the Login section."],
  ["{Courier} took too long to respond", "Your endpoint needs more than 15 seconds. Return quickly and do slow work in the background."],
  ["did not return a login token", "Login must return success:true and a \"token\" field. Check the response against the Login example."],
  ["rejected the request (401)", "The Bearer token is not accepted. Make sure every endpoint except Login checks the same token Login issued."],
  ["Missing: <field>", "Your validation rejected a field. Compare the request body in Expressfly with the example for that endpoint."],
  ["No rates shown on Ship", "Return \"rates\": [] with success:true when you cannot deliver, otherwise return at least one rate with a unique id."],
  ["Tracking does not update", "Use the exact tracking_url from Set webhook URL, send awb, and use a status label from the table."],
  ["Webhook answers 401 Invalid webhook URL", "The URL or secret is wrong. Do not edit or shorten it. Call Set webhook URL again to get a fresh one."],
  ["Plugin went back to Draft", "You changed domains, APIs, seller fields, adapter key or the docs link. Submit it for review again."],
];

function Section({ id, title, children, right, wide }) {
  return (
    <section className={`dd-section${wide ? " dd-wide" : ""}`} id={id} data-doc-section>
      <div className="dd-left">
        <h2>{title}</h2>
        {children}
      </div>
      {right && <div className="dd-right">{right}</div>}
    </section>
  );
}

const Card = ({ title, children }) => (
  <div className="dd-card">
    <div className="dd-card-title">{title}</div>
    {children}
  </div>
);

const Panel = ({ title, code }) => (
  <div className="pad-panel">
    <div className="pad-tabs">
      <span className="pad-panel-title">{title}</span>
    </div>
    <CodeBlock code={code} />
  </div>
);

function Callout({ kind = "info", children }) {
  return <div className={`dd-callout dd-${kind}`}>{children}</div>;
}

function EndpointSection({ ep, base = BASE }) {
  const [tab, setTab] = useState("curl");
  const isLogin = ep.key === "token_generation";
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Expressfly-Version": "1",
    ...(isLogin ? {} : { Authorization: "Bearer <token>" }),
  };
  const req = { method: ep.method, url: `${base}${ep.path}`, headers, body: ep.request };
  const code = tab === "curl" ? buildCurl(req) : buildNode(req);
  return (
    <Section
      id={`ep-${ep.key}`}
      title={ep.title}
      right={
        <>
          <div className="pad-panel">
            <div className="pad-tabs">
              <span className="pad-panel-title">Example request</span>
              <button type="button" className={tab === "curl" ? "is-on" : ""} onClick={() => setTab("curl")}>cURL</button>
              <button type="button" className={tab === "node" ? "is-on" : ""} onClick={() => setTab("node")}>Node.js</button>
            </div>
            <CodeBlock code={code} />
          </div>
          <Panel title="Response · 200" code={pretty(ep.response)} />
          <Panel title="Error response" code={pretty({ success: false, message: "Describe what went wrong." })} />
        </>
      }
    >
      <div className="pad-route">
        <span className="pad-method pad-post">{ep.method}</span>
        <code>{`{your-domain}${ep.path}`}</code>
      </div>
      <p>
        <strong>When it is called.</strong> {ep.when}
      </p>
      <h4>Request body fields</h4>
      <table className="pad-table">
        <tbody>
          {Object.entries(ep.request).map(([k, v]) => (
            <tr key={k}>
              <td className="pad-key">{k}</td>
              <td className="small">{typeof v === "object" ? "object" : typeof v}</td>
              <td className="small muted">{typeof v === "object" ? "See the example on the right." : `e.g. ${String(v)}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h4>Response fields</h4>
      <table className="pad-table">
        <tbody>
          {Object.entries(ep.response).map(([k, v]) => (
            <tr key={k}>
              <td className="pad-key">{k}</td>
              <td className="small">{Array.isArray(v) ? "array" : typeof v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {ep.notes?.length > 0 && (
        <>
          <h4>Things to get right</h4>
          <ul className="pad-notes">
            {ep.notes.map((n, i) => (
              <li key={i}>{clean(n)}</li>
            ))}
          </ul>
        </>
      )}
    </Section>
  );
}

export default function DeveloperDocs() {
  const { authHeader } = useDeveloperAuth();
  const [contract, setContract] = useState(null);
  const [error, setError] = useState("");
  const { hash } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    client
      .get("/developer/plugins/standard-contract", { headers: authHeader() })
      .then(({ data }) => setContract(data))
      .catch((err) => setError(err.message));
  
  }, []);


  useEffect(() => {
    if (!contract) return undefined;
    const els = document.querySelectorAll("[data-doc-section]");
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) window.dispatchEvent(new CustomEvent(DOCS_ACTIVE_EVENT, { detail: visible[0].target.id }));
      },
      { rootMargin: "-90px 0px -65% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [contract]);


  useEffect(() => {
    if (contract && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
  }, [contract, hash]);


  const go = (id) => (e) => {
    e.preventDefault();
    navigate(`${DOCS_PATH}#${id}`);
  };

  const c = contract?.contract;
  const ep = (key) => c?.endpoints.find((e) => e.key === key);
  const hook = c?.tracking_webhook;

  const downloadMd = async () => {
    try {
      const { data } = await client.get("/developer/plugins/standard-contract.md", { headers: authHeader(), responseType: "text", transformResponse: [(d) => d] });
      const url = URL.createObjectURL(new Blob([data], { type: "text/markdown" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "expressfly-courier-api.md";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Could not download the documentation.");
    }
  };
  const copyMd = async () => {
    try {
      const { data } = await client.get("/developer/plugins/standard-contract.md", { headers: authHeader(), responseType: "text", transformResponse: [(d) => d] });
      await navigator.clipboard.writeText(data);
    } catch (err) {
      setError(err.message || "Could not copy the documentation.");
    }
  };

  return (
    <DeveloperLayout>
      <div className="dd-root">
        <div className="dd-content">
          <ErrorBox message={error} />
          {!contract && !error && <Loading />}

          {c && (
            <>
              <Section
                id="introduction"
                title="Expressfly Courier API"
                right={
                  <Card title="What you will build">
                    <table className="pad-table">
                      <tbody>
                        {c.endpoints.map((e) => (
                          <tr key={e.key}>
                            <td><span className="pad-method pad-post">{e.method}</span></td>
                            <td className="pad-key">{e.path}</td>
                            <td className="small">{e.title}</td>
                          </tr>
                        ))}
                        <tr>
                          <td><span className="pad-method pad-get">IN</span></td>
                          <td className="pad-key">tracking_url</td>
                          <td className="small">Tracking webhook (you call us)</td>
                        </tr>
                      </tbody>
                    </table>
                  </Card>
                }
              >
                <p>{c.intro}</p>
                <p>
                  The API is <strong>standard</strong>: it is the same for every courier plugin, so you never write field mappings. When you add a plugin you
                  choose <em>Standard Expressfly API</em> and enter only the courier's main domain.
                </p>
                <ul className="pad-notes">
                  <li>Version <strong>{c.version}</strong>. Every request carries <code>X-Expressfly-Version: {c.version}</code>.</li>
                  <li>Five endpoints that Expressfly calls on your server, plus one webhook that you call on ours.</li>
                  <li>JSON over HTTPS. Every call times out after 15 seconds.</li>
                </ul>
                <div className="order-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={copyMd}>Copy full spec as Markdown</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={downloadMd}>Download .md</button>
                </div>
              </Section>

              <Section
                id="quickstart"
                title="Quickstart"
                right={
                  <>
                    <Panel title="Run the mock courier (no setup)" code={"node mockCourier.js\n# listens on http://localhost:5005\n# username: test-user   password: test-pass"} />
                    <Panel
                      title="Check your Login endpoint"
                      code={buildCurl({ method: "POST", url: `${BASE}/login`, headers: { "Content-Type": "application/json", "X-Expressfly-Version": "1" }, body: ep("token_generation").request })}
                    />
                  </>
                }
              >
                <ol className="pad-flow">
                  <li>Implement the five endpoints on your own domain (see <a href="#ep-token_generation" onClick={go("ep-token_generation")}>Endpoints you build</a>).</li>
                  <li>Test them against Expressfly's rules with the <a href="#testing" onClick={go("testing")}>mock courier</a> as a reference.</li>
                  <li>In <strong>Shipping plugins → New plugin</strong> choose <em>Standard Expressfly API</em>, enter your main domain and the wording of the login fields.</li>
                  <li>Add the setup guide for sellers, then click <strong>Submit for review</strong>.</li>
                  <li>After an admin approves, sellers see the plugin, connect with their username and password, and can ship orders.</li>
                </ol>
              </Section>

              <Section
                id="requests"
                title="Requests & headers"
                right={
                  <Card title="Headers sent on every request">
                    <table className="pad-table">
                      <tbody>
                        {c.common.headers.map(([k, v]) => (
                          <tr key={k}>
                            <td className="pad-key">{k}</td>
                            <td className="small">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                }
              >
                <p>Expressfly sends every request to <code>{"{main domain}{path}"}</code>. A plugin can have a Live and a Sandbox domain, and the seller picks which one to use.</p>
                <ul className="pad-notes">
                  {c.common.rules.map((r, i) => (
                    <li key={i}>{clean(r)}</li>
                  ))}
                </ul>
                <Callout kind="warn">In production Expressfly refuses to call a domain that does not start with <code>https://</code>. Paths must start with <code>/</code> and must not contain a scheme or placeholders.</Callout>
              </Section>

              <Section
                id="authentication"
                title="Authentication"
                right={
                  <>
                    <Panel title="POST /login" code={pretty(ep("token_generation").request)} />
                    <Panel title="Response" code={pretty(ep("token_generation").response)} />
                    <Panel title="Using the token" code={"Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."} />
                  </>
                }
              >
                <p>Expressfly uses a short-lived <strong>Bearer token</strong>. There are no API keys to copy: the seller's courier username and password are exchanged for a token.</p>
                <ol className="pad-flow">
                  <li>The seller saves their username and password in Expressfly. They are stored encrypted.</li>
                  <li>Expressfly calls <code>POST /login</code> and caches the token.</li>
                  <li>Every other call sends <code>Authorization: Bearer &lt;token&gt;</code>.</li>
                  <li>About 60 seconds before <code>expires_in</code> runs out, Expressfly logs in again by itself.</li>
                  <li>If any call returns <strong>401</strong>, Expressfly logs in once more and retries that call one time.</li>
                </ol>
                <Callout>Return a clear <code>message</code> for wrong credentials, for example "Invalid username or password" with HTTP 401. The seller sees it when they click Save &amp; test connection.</Callout>
              </Section>

              <Section
                id="errors"
                title="Errors"
                right={
                  <>
                    <Card title="HTTP status code summary">
                      <table className="pad-table dd-status">
                        <tbody>
                          {HTTP_STATUS.map(([code, name, text], i) => (
                            <tr key={i}>
                              <td className="pad-key">{code}</td>
                              <td>{name}</td>
                              <td className="small">{text}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Card>
                    <Panel title="Error body" code={pretty(c.common.error_example)} />
                  </>
                }
              >
                <p>Use conventional HTTP status codes to tell Expressfly whether a request worked. In general:</p>
                <ul className="pad-notes">
                  <li>Codes in the <code>2xx</code> range indicate success.</li>
                  <li>Codes in the <code>4xx</code> range indicate an error caused by the request, such as a missing field or a wrong token.</li>
                  <li>Codes in the <code>5xx</code> range indicate a problem on your servers. These should be rare.</li>
                </ul>
                <p>A failure is either a non-2xx status <strong>or</strong> HTTP 200 with <code>"success": false</code>. Always include a human readable <code>message</code>.</p>
                <h4>Attributes</h4>
                <table className="pad-table">
                  <tbody>
                    <tr><td className="pad-key">success</td><td className="small">boolean</td><td className="small">Must be <code>false</code> for an error sent with HTTP 200.</td></tr>
                    <tr><td className="pad-key">message</td><td className="small">string</td><td className="small">Shown to the seller. Keep it short and clear (the first 200 characters are used).</td></tr>
                  </tbody>
                </table>
                <h4>What the seller sees</h4>
                <table className="pad-table">
                  <thead><tr><th>Situation</th><th>Message shown</th><th>HTTP</th></tr></thead>
                  <tbody>
                    {SELLER_ERRORS.map(([a, b, d]) => (
                      <tr key={a}>
                        <td className="small">{a}</td>
                        <td className="small"><code>{b}</code></td>
                        <td className="small">{d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>

              <Section
                id="error-handling"
                title="Handling errors"
                right={
                  <>
                    <Panel
                      title="Express example: one error handler"
                      code={`class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// ...inside a route
if (!serviceable(req.body.delivery_pincode)) {
  throw new ApiError(\`Pincode \${req.body.delivery_pincode} is not serviceable.\`);
}

// last middleware
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: status === 500 ? "Something went wrong on our side." : err.message,
  });
});`}
                    />
                    <Panel title="No service is not an error" code={pretty({ success: true, rates: [] })} />
                  </>
                }
              >
                <p>Good error handling is what makes the plugin feel professional to a seller, because your message is shown to them word for word.</p>
                <h4>Do</h4>
                <ul className="pad-notes">
                  <li>Say what is wrong and how to fix it: <em>"Pincode 110099 is not serviceable."</em> is better than <em>"Error 422"</em>.</li>
                  <li>Name the missing field: <em>"Missing: pickup_pincode, weight_kg"</em>.</li>
                  <li>Return <code>"rates": []</code> with <code>success: true</code> when you simply do not deliver to a pincode. Use an error only when something is actually wrong.</li>
                  <li>Return 401 for a bad or expired token and 400 for a bad request, so the right retry happens.</li>
                  <li>Validate the body and reject early instead of failing halfway through.</li>
                </ul>
                <h4>Do not</h4>
                <ul className="pad-notes">
                  <li>Do not put stack traces, SQL, internal ids or secrets in <code>message</code>.</li>
                  <li>Do not answer with HTML error pages. Always send JSON.</li>
                  <li>Do not hold the request open. Expressfly gives up after 15 seconds.</li>
                </ul>
                <Callout>Expressfly does not retry failed calls on its own, apart from the single re-login after a 401. The seller fixes the problem and clicks the button again, so your calls must be safe to repeat (see Idempotency).</Callout>
              </Section>

              <Section
                id="timeouts-retries"
                title="Timeouts & retries"
                right={
                  <Panel
                    title="Retry the webhook with backoff (your side)"
                    code={`async function sendTracking(url, payload, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status < 500) return res; // 2xx done, 4xx do not retry
    } catch {
      /* timeout or network error: retry */
    }
    await new Promise((r) => setTimeout(r, 2 ** i * 1000)); // 1s, 2s, 4s...
  }
  throw new Error("Expressfly webhook failed");
}`}
                  />
                }
              >
                <table className="pad-table">
                  <thead><tr><th>Direction</th><th>Rule</th></tr></thead>
                  <tbody>
                    <tr><td className="small">Expressfly → you</td><td className="small">15 second timeout per call. One automatic re-login and retry on 401. No other automatic retries.</td></tr>
                    <tr><td className="small">You → Expressfly webhook</td><td className="small">Retry only on timeouts and 5xx, with exponential backoff. Never retry a 2xx or a 4xx.</td></tr>
                  </tbody>
                </table>
              </Section>

              <Section
                id="idempotency"
                title="Idempotency"
                right={
                  <Card title="Safe to repeat">
                    <table className="pad-table">
                      <tbody>
                        <tr><td className="pad-key">warehouse_ref</td><td className="small">Same ref again: update the warehouse and return the same <code>warehouse_id</code>.</td></tr>
                        <tr><td className="pad-key">order_id</td><td className="small">Same id again: return the existing shipment, do not create a second AWB.</td></tr>
                        <tr><td className="pad-key">tracking_logs[]._id</td><td className="small">Scans with an id Expressfly already has are ignored.</td></tr>
                      </tbody>
                    </table>
                  </Card>
                }
              >
                <p>A seller can click twice, a network can drop the answer, or Expressfly can re-send a request. The same request must never create duplicate warehouses or shipments.</p>
                <p>Use the ids Expressfly sends as your idempotency keys, as shown on the right. Expressfly never needs a separate idempotency header.</p>
              </Section>

              <Section
                id="versioning"
                title="Versioning"
                right={<Panel title="Header on every request" code={`X-Expressfly-Version: ${c.version}`} />}
              >
                <p>The current version is <strong>{c.version}</strong>. Version 1 will not change in a way that breaks an existing integration.</p>
                <ul className="pad-notes">
                  <li>New optional fields can be added to requests at any time. <strong>Ignore fields you do not know</strong> instead of rejecting them.</li>
                  <li>Breaking changes would ship as a new version number in this header, announced here in the changelog.</li>
                  <li>The mock courier rejects a request without <code>X-Expressfly-Version: 1</code>. Doing the same is a good way to catch mistakes early.</li>
                </ul>
              </Section>

              {["token_generation", "create_warehouse", "get_rating", "order_create", "set_webhook"].map((k) => (ep(k) ? <EndpointSection key={k} ep={ep(k)} /> : null))}

              <Section
                id="tracking-webhook"
                title={hook.title}
                right={
                  <>
                    <Panel
                      title="Example request (you → Expressfly)"
                      code={buildCurl({ method: "POST", url: "<tracking_url>", headers: { "Content-Type": "application/json" }, body: hook.request })}
                    />
                  </>
                }
              >
                <p>{clean(hook.intro)}</p>
                <h4>Attributes</h4>
                <table className="pad-table">
                  <tbody>
                    {hook.fields.map(([f, req, m]) => (
                      <tr key={f}>
                        <td className="pad-key">{f}</td>
                        <td className="small">{req}</td>
                        <td className="small">{clean(m)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <h4>Notes</h4>
                <ul className="pad-notes">
                  {hook.notes.map((n, i) => (
                    <li key={i}>{clean(n)}</li>
                  ))}
                </ul>
              </Section>

              <Section
                id="status-labels"
                title="Status labels"
                right={<Panel title="Shipment statuses" code={hook.statuses.map(([k]) => k).join("\n")} />}
              >
                <p>Send one of these labels in <code>last_tracking_status</code>. Matching ignores case and punctuation, so <code>In Transit</code>, <code>IN_TRANSIT</code> and <code>in-transit</code> are the same.</p>
                <table className="pad-table">
                  <thead><tr><th>Label</th><th>What happens in Expressfly</th></tr></thead>
                  <tbody>
                    {hook.statuses.map(([s, m]) => (
                      <tr key={s}>
                        <td className="pad-key">{s}</td>
                        <td className="small">{m}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>

              <Section
                id="webhook-responses"
                title="Webhook responses"
                right={hook.responses.map((r, i) => (
                  <Panel key={i} title={`HTTP ${r.status}`} code={pretty(r.body)} />
                ))}
              >
                <p>What Expressfly answers when you call the tracking URL:</p>
                <table className="pad-table">
                  <thead><tr><th>Status</th><th>Meaning</th></tr></thead>
                  <tbody>
                    {hook.responses.map((r, i) => (
                      <tr key={i}>
                        <td className="pad-key">{r.status}</td>
                        <td className="small">{r.when}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="pad-key">500</td>
                      <td className="small">Something went wrong on our side. Retry with backoff.</td>
                    </tr>
                  </tbody>
                </table>
              </Section>

              <Section
                id="testing"
                title="Testing locally"
                right={
                  <>
                    <Panel title="Start the mock courier" code={"node mockCourier.js"} />
                    <Panel title="Fake a tracking update" code={"http://localhost:5005/simulate?awb=<AWB>&status=in_transit\n\n# status: created, picked_up, in_transit, out_for_delivery,\n#         delivered, undelivered, rto_initiated,\n#         rto_delivered, cancelled\n# &same=1  sends the previous update again (duplicates are ignored)"} />
                  </>
                }
              >
                <p>The repository ships <code>mockCourier.js</code>, a fake courier that implements this exact API and <strong>rejects any request that does not follow it</strong>. Use it as a reference implementation, and to see how Expressfly behaves end to end.</p>
                <ol className="pad-flow">
                  <li>Run the mock courier. Create a plugin with main domain <code>http://localhost:5005</code>.</li>
                  <li>As a seller, connect with <code>test-user</code> / <code>test-pass</code> and click <strong>Save &amp; test connection</strong>.</li>
                  <li>Ship an order, pick a rate and note the AWB.</li>
                  <li>Open the <code>/simulate</code> link to send tracking updates and watch the order status change.</li>
                </ol>
                <h4>Checklist before you submit</h4>
                <ul className="pad-notes">
                  <li>Login with a wrong password returns a clear message.</li>
                  <li>Every endpoint except Login rejects a missing or wrong token with 401.</li>
                  <li>Repeating Create warehouse returns the same <code>warehouse_id</code>.</li>
                  <li>Repeating Create shipment with the same <code>order_id</code> returns the same AWB.</li>
                  <li>An unserviceable pincode returns <code>"rates": []</code> or a clear message.</li>
                  <li>Your tracking webhook retries on 5xx and stops on 2xx or 4xx.</li>
                </ul>
              </Section>

              <Section
                id="review"
                title="Review & approval"
                right={
                  <Card title="Lifecycle">
                    <table className="pad-table">
                      <tbody>
                        <tr><td className="pad-key">Draft</td><td className="small">Only you can see it. Edit freely.</td></tr>
                        <tr><td className="pad-key">Pending review</td><td className="small">Submitted. Waiting for an admin.</td></tr>
                        <tr><td className="pad-key">Approved</td><td className="small">Visible to sellers while its status is Active.</td></tr>
                        <tr><td className="pad-key">Rejected</td><td className="small">Read the admin's note, fix it and submit again.</td></tr>
                      </tbody>
                    </table>
                  </Card>
                }
              >
                <p>Sellers type their courier credentials into your plugin, so every plugin is reviewed by an admin before sellers can see it.</p>
                <Callout kind="warn">Changing the <strong>integration type, domains, APIs, seller fields, adapter key or documentation link</strong> of a submitted or approved plugin sends it back to Draft, because those decide where credentials are sent. Name, logo, description, status and setup steps can change without a new review.</Callout>
              </Section>

              <Section id="troubleshooting" title="Troubleshooting" wide>
                <table className="pad-table dd-trouble">
                  <thead><tr><th>You see</th><th>Likely cause and fix</th></tr></thead>
                  <tbody>
                    {TROUBLE.map(([a, b]) => (
                      <tr key={a}>
                        <td className="small"><code>{a}</code></td>
                        <td className="small">{b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>

              <Section id="changelog" title="Changelog" wide>
                <table className="pad-table">
                  <tbody>
                    <tr>
                      <td className="pad-key">v{c.version}</td>
                      <td className="small">Current version. Login, Create warehouse, Get rates, Create shipment, Set webhook URL and the tracking webhook.</td>
                    </tr>
                  </tbody>
                </table>
                <p className="muted small">New versions and changes will be listed here first.</p>
              </Section>
            </>
          )}
        </div>
      </div>
    </DeveloperLayout>
  );
}
