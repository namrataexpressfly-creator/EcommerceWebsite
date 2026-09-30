import { useEffect, useState } from "react";
import client from "../../api/client";
import { Loading, ErrorBox, EmptyState } from "../../components/Ui";
import { formatDate } from "../../utils/format";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";
import useTableSearch from "../../hooks/useTableSearch";
import TableSearch from "../../components/TableSearch";

export default function Fraud() {
  const [logs, setLogs] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const blacklistSearch = useTableSearch(blacklist);
  const logsSearch = useTableSearch(logs);
  const blacklistPager = usePagination(blacklistSearch.filtered, { resetKey: blacklistSearch.query });
  const logsPager = usePagination(logsSearch.filtered, { resetKey: logsSearch.query });

  const load = () => {
    setLoading(true);
    Promise.all([
      client.get("/fraud/seller/fraud/log"),
      client.get("/fraud/seller/fraud/blacklist"),
    ])
      .then(([l, b]) => {
        setLogs(l.data);
        setBlacklist(b.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const addToBlacklist = async (e) => {
    e.preventDefault();
    if (!phone) return;
    try {
      await client.post("/fraud/seller/fraud/blacklist", { phone, reason });
      setPhone("");
      setReason("");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <h1>Fraud &amp; COD checks</h1>
      <ErrorBox message={error} />

      <section className="panel">
        <h2>Blacklisted phone numbers</h2>
        <form className="form-row" onSubmit={addToBlacklist}>
          <input className="input" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className="input" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button className="btn btn-primary" type="submit">
            Add to blacklist
          </button>
        </form>
        {blacklist.length === 0 ? (
          <EmptyState>No blacklisted numbers.</EmptyState>
        ) : (
          <>
            <TableSearch query={blacklistSearch.query} onChange={blacklistSearch.setQuery} shown={blacklistSearch.filtered.length} total={blacklist.length} placeholder="Search blacklisted numbers…" />
            <table className="data-table">
              <thead>
                <tr>
                  <th>Phone</th>
                  <th>Reason</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {blacklistPager.pageItems.map((b) => (
                  <tr key={b._id}>
                    <td>{b.phone}</td>
                    <td className="muted small">{b.reason || "-"}</td>
                    <td className="muted small">{formatDate(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination {...blacklistPager.pagerProps} />
          </>
        )}
      </section>

      <section className="panel">
        <h2>Fraud log</h2>
        {logs.length === 0 ? (
          <EmptyState>No flagged attempts yet.</EmptyState>
        ) : (
          <>
            <TableSearch query={logsSearch.query} onChange={logsSearch.setQuery} shown={logsSearch.filtered.length} total={logs.length} placeholder="Search fraud log…" />
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Phone</th>
                  <th>Reasons</th>
                </tr>
              </thead>
              <tbody>
                {logsPager.pageItems.map((l) => (
                  <tr key={l._id}>
                    <td className="muted small">{formatDate(l.created_at)}</td>
                    <td>{l.phone}</td>
                    <td className="muted small">{(l.reasons || []).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination {...logsPager.pagerProps} />
          </>
        )}
      </section>
    </div>
  );
}
