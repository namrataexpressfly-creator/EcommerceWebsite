import { useEffect, useState } from "react";
import client from "../../api/client";
import { Loading, ErrorBox, EmptyState } from "../../components/Ui";
import { formatMoney } from "../../utils/format";

export default function Overview() {
  const [revenue, setRevenue] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [conversion, setConversion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      client.get("/seller/analytics/revenue"),
      client.get("/seller/analytics/top-products?limit=5"),
      client.get("/seller/analytics/conversion"),
    ])
      .then(([r, t, c]) => {
        setRevenue(r.data);
        setTopProducts(t.data);
        setConversion(c.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading label="Loading analytics…" />;
  if (error) return <ErrorBox message={error} />;

  const maxRevenue = Math.max(1, ...(revenue?.daily || []).map((d) => d.revenue));

  return (
    <div>
      <h1>Overview</h1>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Revenue (30d)</div>
          <div className="stat-value">{formatMoney(revenue?.totals?.revenue)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Orders (30d)</div>
          <div className="stat-value">{revenue?.totals?.order_count ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Storefront visits (30d)</div>
          <div className="stat-value">{conversion?.total_visits ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Conversion rate</div>
          <div className="stat-value">{conversion?.conversion_rate ?? 0}%</div>
        </div>
      </div>

      <section className="panel">
        <h2>Daily revenue</h2>
        {revenue?.daily?.length ? (
          <div className="bar-chart">
            {revenue.daily.map((d) => (
              <div className="bar-chart-col" key={d.date}>
                <div
                  className="bar-chart-bar"
                  style={{ height: `${Math.max(4, (d.revenue / maxRevenue) * 100)}%` }}
                  title={`${d.date}: ${formatMoney(d.revenue)}`}
                />
                <div className="bar-chart-label">{d.date.slice(5)}</div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>No paid or COD-confirmed orders in the last 30 days yet.</EmptyState>
        )}
      </section>

      <section className="panel">
        <h2>Top products</h2>
        {topProducts.length === 0 ? (
          <EmptyState>No sales data yet.</EmptyState>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Units sold</th>
                <th>Revenue</th>
                <th>Current stock</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p) => (
                <tr key={p.product_id}>
                  <td>{p.name}</td>
                  <td>{p.units_sold}</td>
                  <td>{formatMoney(p.revenue)}</td>
                  <td>{p.current_stock ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
