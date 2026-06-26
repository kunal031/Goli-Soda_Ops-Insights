// Ported from insights/frontend/src/components/TopSKUs.jsx
// Adapted to use goliops CSS variables

import { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#22c55e",
  "#f97316",
  "#3b82f6",
  "#a855f7",
  "#eab308",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

export default function InsightsTopSKUs({ pnl, sales, compact }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredSales = useMemo(() => {
    if (!sales) return [];
    return sales.filter((s) => {
      if (dateFrom && s.date < dateFrom) return false;
      if (dateTo && s.date > dateTo) return false;
      return true;
    });
  }, [sales, dateFrom, dateTo]);

  const skuRevenue = useMemo(() => {
    const map = {};
    filteredSales.forEach((s) => {
      map[s.productName] = (map[s.productName] || 0) + s.amount;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([name, revenue], i) => ({ name, revenue, rank: i + 1 }));
  }, [filteredSales]);

  const pieData = useMemo(() => {
    if (skuRevenue.length)
      return skuRevenue.map((d) => ({
        name: d.name.replace(" Goli Soda", "").replace(" Soda", ""),
        value: d.revenue,
      }));
    if (!pnl?.revenueByProduct) return [];
    return Object.entries(pnl.revenueByProduct).map(([name, value]) => ({
      name: name.replace(" Goli Soda", "").replace(" Soda", ""),
      value,
    }));
  }, [skuRevenue, pnl]);

  const displayRanking = skuRevenue.length
    ? skuRevenue
    : pnl?.revenueByProduct
    ? Object.entries(pnl.revenueByProduct)
        .sort(([, a], [, b]) => b - a)
        .map(([name, revenue], i) => ({ name, revenue, rank: i + 1 }))
    : [];

  if (!pnl)
    return (
      <div className="ins-chart-card">
        <p className="ins-empty-state">No SKU data available.</p>
      </div>
    );

  return (
    <div className="ins-view-stack">
      {!compact && (
        <div className="ins-chart-card">
          <div className="ins-chart-header">
            <div>
              <h2 className="ins-chart-title">Top SKUs</h2>
              <p className="ins-chart-sub">
                Revenue by product — filter by date range
              </p>
            </div>
            <div className="ins-date-filters">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="ins-date-input"
              />
              <span style={{ color: "var(--ins-text-muted)", fontSize: 12 }}>
                to
              </span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="ins-date-input"
              />
            </div>
          </div>
          <div className="ins-sku-list">
            {displayRanking.map((sku, i) => (
              <div key={sku.name} className="ins-sku-row">
                <span
                  className={`ins-sku-rank ins-rank-${
                    i + 1 <= 3 ? i + 1 : "rest"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="ins-sku-name">{sku.name}</span>
                <div className="ins-sku-bar-wrap">
                  <div
                    className="ins-sku-bar"
                    style={{
                      width: `${
                        (sku.revenue / displayRanking[0].revenue) * 100
                      }%`,
                      background: COLORS[i % COLORS.length],
                    }}
                  />
                </div>
                <span className="ins-sku-rev">{fmt(sku.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`ins-chart-card${compact ? " ins-compact" : ""}`}>
        {!compact && (
          <h2 className="ins-chart-title">Revenue Share by Product</h2>
        )}
        {compact && <h2 className="ins-chart-title">Top SKUs</h2>}
        <ResponsiveContainer width="100%" height={compact ? 180 : 320}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={compact ? 60 : 110}
              dataKey="value"
              label={
                !compact
                  ? ({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                  : undefined
              }
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => [fmt(v), "Revenue"]}
              contentStyle={{
                background: "var(--ins-card-bg)",
                border: "1px solid var(--ins-border)",
                borderRadius: 8,
                color: "var(--surface-100)",
              }}
            />
            {!compact && <Legend />}
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
