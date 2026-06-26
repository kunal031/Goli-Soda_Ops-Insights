// Ported from insights/frontend/src/components/ExpenseRevenue.jsx
// Adapted to use goliops CSS variables

import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
const COLORS = ["#f97316", "#3b82f6", "#a855f7", "#eab308", "#ec4899"];

export default function InsightsExpenseRevenue({ pnl, expenses }) {
  const monthlyData = useMemo(() => {
    if (!pnl) return [];
    return [
      {
        period: pnl.period,
        Revenue: pnl.revenue,
        Expenses: (pnl.operatingExpenses || 0) + (pnl.cogs || 0),
        "Gross Profit": pnl.grossProfit,
      },
    ];
  }, [pnl]);

  const weeklyData = useMemo(() => {
    if (!pnl?.revenueByWeek) return [];
    return Object.entries(pnl.revenueByWeek).map(([week, rev]) => ({
      period: week,
      Revenue: rev,
      Expenses: Math.round(
        (pnl.operatingExpenses / Object.keys(pnl.revenueByWeek).length)
      ),
      "Gross Profit": Math.round(rev * (pnl.grossProfit / (pnl.revenue || 1))),
    }));
  }, [pnl]);

  const chartData = weeklyData.length ? weeklyData : monthlyData;

  const expBreakdown = useMemo(() => {
    if (!pnl?.expenseBreakdown) return [];
    return Object.entries(pnl.expenseBreakdown).map(([cat, amount]) => ({
      name: cat,
      value: amount,
    }));
  }, [pnl]);

  if (!pnl)
    return (
      <div className="ins-chart-card">
        <p className="ins-empty-state">No financial data available.</p>
      </div>
    );

  return (
    <div className="ins-view-stack">
      {/* P&L Summary numbers */}
      <div className="ins-chart-card">
        <h2 className="ins-chart-title">P&L Summary — {pnl.period}</h2>
        <div className="ins-pnl-row">
          <div className="ins-pnl-item">
            <p className="ins-pnl-label">Revenue</p>
            <p className="ins-pnl-val ins-green">{fmt(pnl.revenue)}</p>
          </div>
          <div className="ins-pnl-item">
            <p className="ins-pnl-label">COGS</p>
            <p className="ins-pnl-val ins-orange">−{fmt(pnl.cogs)}</p>
          </div>
          <div className="ins-pnl-item">
            <p className="ins-pnl-label">Gross Profit</p>
            <p
              className={`ins-pnl-val ${
                pnl.grossProfit >= 0 ? "ins-green" : "ins-red"
              }`}
            >
              {fmt(pnl.grossProfit)}
            </p>
          </div>
          <div className="ins-pnl-item">
            <p className="ins-pnl-label">Operating Expenses</p>
            <p className="ins-pnl-val ins-orange">
              −{fmt(pnl.operatingExpenses)}
            </p>
          </div>
          <div className="ins-pnl-item">
            <p className="ins-pnl-label">Net Profit</p>
            <p
              className={`ins-pnl-val ${
                pnl.netProfit >= 0 ? "ins-green" : "ins-red"
              }`}
            >
              {fmt(pnl.netProfit)}
            </p>
          </div>
          <div className="ins-pnl-item">
            <p className="ins-pnl-label">Net Margin</p>
            <p
              className={`ins-pnl-val ${
                parseFloat(pnl.margin) >= 0 ? "ins-green" : "ins-red"
              }`}
            >
              {pnl.margin}%
            </p>
          </div>
        </div>
      </div>

      {/* Revenue vs Expenses bar + gross profit line */}
      <div className="ins-chart-card">
        <h2 className="ins-chart-title">Revenue vs Expenses</h2>
        <p className="ins-chart-sub">
          Bar = Revenue &amp; Expenses · Line = Gross Profit
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ins-grid)" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: "var(--ins-text-muted)" }}
            />
            <YAxis
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: "var(--ins-text-muted)" }}
            />
            <Tooltip
              formatter={(v, n) => [fmt(v), n]}
              contentStyle={{
                background: "var(--ins-card-bg)",
                border: "1px solid var(--ins-border)",
                borderRadius: 8,
                color: "var(--surface-100)",
              }}
            />
            <Legend />
            <Bar dataKey="Revenue" fill="var(--success)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Expenses" fill="var(--warning)" radius={[4, 4, 0, 0]} />
            <Line
              type="monotone"
              dataKey="Gross Profit"
              stroke="var(--info)"
              strokeWidth={2.5}
              dot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Expense breakdown pie */}
      {expBreakdown.length > 0 && (
        <div className="ins-chart-card">
          <h2 className="ins-chart-title">Operating Expense Breakdown</h2>
          <p className="ins-chart-sub">By category this period</p>
          <div className="ins-exp-breakdown-layout">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={expBreakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {expBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [fmt(v), "Amount"]}
                  contentStyle={{
                    background: "var(--ins-card-bg)",
                    border: "1px solid var(--ins-border)",
                    borderRadius: 8,
                    color: "var(--surface-100)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="ins-exp-table">
              {expBreakdown.map((e, i) => (
                <div key={e.name} className="ins-exp-table-row">
                  <span
                    className="ins-exp-dot"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span className="ins-exp-cat">{e.name}</span>
                  <span className="ins-exp-amt">{fmt(e.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
