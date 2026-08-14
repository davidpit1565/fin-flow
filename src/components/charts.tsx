import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CurrencyCode } from "../types";
import { formatMoney } from "../lib/currency";

export const CHART_COLORS = ["#0e8a5c", "#8aa2a0", "#c0a878", "#7d93b8", "#a58a9e", "#b3b7bd", "#5f9ea0", "#9c8f74"];

function ChartTooltip({ active, payload, currency, label }: { active?: boolean; payload?: { value: number; name: string }[]; currency: CurrencyCode; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="chart-tooltip">
      {label && <p className="chart-tooltip-label">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="chart-tooltip-value">
          {formatMoney(Math.round(p.value), currency)}
        </p>
      ))}
    </div>
  );
}

export function SpendingChart({
  data,
  currency,
  kind = "area",
  height = 180,
}: {
  data: { key: string; label: string; cents: number }[];
  currency: CurrencyCode;
  kind?: "area" | "bar";
  height?: number;
}) {
  const chartData = data.map((d) => ({ ...d, value: d.cents / 100 }));
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {kind === "area" ? (
          <AreaChart data={chartData} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="flowArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.16} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
              axisLine={false}
              tickLine={false}
              minTickGap={28}
              interval="preserveStartEnd"
            />
            <YAxis hide domain={[0, "auto"]} />
            <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }} />
            <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} fill="url(#flowArea)" dot={false} activeDot={{ r: 3.5, fill: "var(--accent)" }} />
          </AreaChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
              axisLine={false}
              tickLine={false}
              minTickGap={28}
              interval="preserveStartEnd"
            />
            <YAxis hide domain={[0, "auto"]} />
            <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ fill: "var(--surface-2)" }} />
            <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={22} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryDonut({
  data,
  currency,
  centerLabel,
  height = 190,
}: {
  data: { name: string; value: number }[];
  currency: CurrencyCode;
  centerLabel: string;
  height?: number;
}) {
  if (data.length === 0) return null;
  return (
    <div className="chart chart-donut" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<ChartTooltip currency={currency} />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            strokeWidth={0}
            isAnimationActive={true}
            animationDuration={400}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-center" aria-hidden="true">
        <span className="donut-center-label">{centerLabel}</span>
      </div>
    </div>
  );
}
