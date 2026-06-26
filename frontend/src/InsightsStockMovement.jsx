// Ported from insights/frontend/src/components/StockMovement.jsx
// Adapted to use goliops CSS variables

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function InsightsStockMovement({ products, transactions }) {
  const skuData = useMemo(() => {
    if (!products || !transactions) return [];
    return products.map((p) => {
      const txns = transactions.filter((t) => t.productId === p.id);
      const inQty = txns
        .filter((t) => t.type === "IN")
        .reduce((s, t) => s + t.quantity, 0);
      const outQty = txns
        .filter((t) => t.type === "OUT")
        .reduce((s, t) => s + t.quantity, 0);
      return {
        name: p.name.replace(" Goli Soda", "").replace(" Soda", ""),
        IN: inQty,
        OUT: outQty,
        stock: p.stock,
      };
    });
  }, [products, transactions]);

  const getHealthClass = (stock) => {
    if (stock >= 200) return "ins-heat-high";
    if (stock >= 100) return "ins-heat-mid";
    if (stock >= 50) return "ins-heat-low";
    return "ins-heat-critical";
  };

  if (!products?.length)
    return (
      <div className="ins-chart-card">
        <p className="ins-empty-state">No stock data available.</p>
      </div>
    );

  return (
    <div className="ins-view-stack">
      {/* Bar chart — IN vs OUT */}
      <div className="ins-chart-card">
        <div className="ins-chart-header">
          <div>
            <h2 className="ins-chart-title">Stock Movement</h2>
            <p className="ins-chart-sub">Stock IN vs OUT per product</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={skuData}
            margin={{ top: 5, right: 10, left: 0, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ins-grid)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "var(--ins-text-muted)" }}
              angle={-30}
              textAnchor="end"
            />
            <YAxis tick={{ fontSize: 11, fill: "var(--ins-text-muted)" }} />
            <Tooltip
              contentStyle={{
                background: "var(--ins-card-bg)",
                border: "1px solid var(--ins-border)",
                borderRadius: 8,
                color: "var(--surface-100)",
              }}
            />
            <Legend />
            <Bar dataKey="IN" fill="var(--success)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="OUT" fill="var(--warning)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Heatmap */}
      <div className="ins-chart-card">
        <h2 className="ins-chart-title">Stock Level Heatmap</h2>
        <p className="ins-chart-sub">
          Current stock per SKU — colour indicates health
        </p>
        <div className="ins-heatmap-grid">
          {products.map((p) => (
            <div key={p.id} className={`ins-heatmap-cell ${getHealthClass(p.stock)}`}>
              <p className="ins-heatmap-name">
                {p.name.replace(" Goli Soda", "").replace(" Soda", "")}
              </p>
              <p className="ins-heatmap-stock">
                {p.stock.toLocaleString("en-IN")}
              </p>
              <p className="ins-heatmap-sku">{p.id}</p>
            </div>
          ))}
        </div>
        <div className="ins-heatmap-legend">
          <span className="ins-heat-high">■</span> 200+ (Healthy)&nbsp;&nbsp;
          <span className="ins-heat-mid">■</span> 100–199 (OK)&nbsp;&nbsp;
          <span className="ins-heat-low">■</span> 50–99 (Watch)&nbsp;&nbsp;
          <span className="ins-heat-critical">■</span> &lt;50 (Low)
        </div>
      </div>
    </div>
  );
}
