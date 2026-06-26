// Ported from insights/frontend/src/components/MetricCards.jsx
// Adapted to use goliops CSS variables

export default function InsightsMetricCards({ dashboard, pnl, products }) {
  const fmt = (n) =>
    n == null
      ? "—"
      : new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(n);

  const healthyPct = products?.length
    ? Math.round(
        (products.filter((p) => p.stock >= 50).length / products.length) * 100
      )
    : null;

  const cards = [
    {
      label: "Revenue This Month",
      value: fmt(pnl?.revenue),
      sub: pnl?.period,
      color: "ins-card-green",
      icon: "📊",
    },
    {
      label: "Expenses This Month",
      value: fmt((pnl?.operatingExpenses ?? 0) + (pnl?.cogs ?? 0)),
      sub: "Operating + COGS",
      color: "ins-card-orange",
      icon: "💸",
    },
    {
      label: "Net Profit",
      value: fmt(pnl?.netProfit),
      sub: `Margin: ${pnl?.margin ?? "—"}%`,
      color: pnl?.netProfit >= 0 ? "ins-card-blue" : "ins-card-red",
      icon: "💹",
    },
    {
      label: "Products Tracked",
      value: dashboard?.totalProducts != null ? dashboard.totalProducts + " SKUs" : "—",
      sub: `${dashboard?.totalProducts ?? "—"} SKUs tracked`,
      color: "ins-card-purple",
      icon: "🛒",
    },
    {
      label: "Stock Health",
      value: healthyPct != null ? `${healthyPct}%` : "—",
      sub: `${dashboard?.lowStockCount ?? "—"} SKUs low`,
      color:
        healthyPct >= 70
          ? "ins-card-green"
          : healthyPct >= 40
          ? "ins-card-orange"
          : "ins-card-red",
      icon: "📦",
    },
    {
      label: "Total Stock Units",
      value:
        dashboard?.totalStock != null
          ? dashboard.totalStock.toLocaleString("en-IN")
          : "—",
      sub: `Across ${dashboard?.totalProducts ?? "—"} products`,
      color: "ins-card-blue",
      icon: "🏭",
    },
  ];

  return (
    <div className="ins-metric-grid">
      {cards.map((c, i) => (
        <div key={i} className={`ins-metric-card ${c.color}`}>
          <div className="ins-metric-icon">{c.icon}</div>
          <div className="ins-metric-body">
            <p className="ins-metric-label">{c.label}</p>
            <p className="ins-metric-value">{c.value}</p>
            <p className="ins-metric-sub">{c.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
