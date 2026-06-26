// Ported from insights/frontend/src/components/RevenueTrends.jsx
// Adapted to use goliops CSS variables

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

export default function InsightsRevenueTrends({ pnl, sales, compact }) {
  const [period, setPeriod] = useState("daily");

  const dailyData = useMemo(() => {
    if (!pnl?.revenueByDay) return [];
    return Object.entries(pnl.revenueByDay)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, revenue]) => ({
        name: new Date(date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        }),
        Revenue: revenue,
      }));
  }, [pnl]);

  const weeklyData = useMemo(() => {
    if (!pnl?.revenueByWeek) return [];
    return Object.entries(pnl.revenueByWeek).map(([week, revenue]) => ({
      name: week,
      Revenue: revenue,
    }));
  }, [pnl]);

  const data = period === "daily" ? dailyData : weeklyData;

  const totalRev = pnl?.revenue ?? 0;
  const prevPeriodRev = data.length > 1 ? data[data.length - 2]?.Revenue : 0;
  const growthPct =
    prevPeriodRev && data.length > 1
      ? (
          ((data[data.length - 1]?.Revenue - prevPeriodRev) / prevPeriodRev) *
          100
        ).toFixed(1)
      : null;

  if (!pnl)
    return (
      <div className="ins-chart-card">
        <p className="ins-empty-state">No revenue data available.</p>
      </div>
    );

  return (
    <div className={`ins-chart-card${compact ? " ins-compact" : ""}`}>
      <div className="ins-chart-header">
        <div>
          <h2 className="ins-chart-title">Revenue Trends</h2>
          {!compact && (
            <p className="ins-chart-sub">
              Total this period: <strong>{fmt(totalRev)}</strong>
            </p>
          )}
        </div>
        {!compact && (
          <div className="ins-toggle-group">
            {["daily", "weekly"].map((p) => (
              <button
                key={p}
                className={`ins-toggle-btn${period === p ? " active" : ""}`}
                onClick={() => setPeriod(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>
      {growthPct && !compact && (
        <p className="ins-growth-badge">
          {growthPct >= 0 ? "▲" : "▼"} {Math.abs(growthPct)}% vs previous{" "}
          {period === "daily" ? "day" : "week"}
        </p>
      )}
      <ResponsiveContainer width="100%" height={compact ? 180 : 300}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--ins-grid)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--ins-text-muted)" }}
          />
          <YAxis
            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fill: "var(--ins-text-muted)" }}
          />
          <Tooltip
            formatter={(v) => [fmt(v), "Revenue"]}
            contentStyle={{
              background: "var(--ins-card-bg)",
              border: "1px solid var(--ins-border)",
              borderRadius: 8,
              color: "var(--surface-100)",
            }}
          />
          <Line
            type="monotone"
            dataKey="Revenue"
            stroke="var(--success)"
            strokeWidth={2.5}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
