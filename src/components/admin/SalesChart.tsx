"use client";

import { useMemo, useState } from "react";

export type ChartPoint = { day: string; revenue: number; orders: number };
type Metric = "revenue" | "orders";
type Range = "14d" | "30d";

const W = 720;
const H = 260;
const PAD = { top: 16, right: 12, bottom: 28, left: 46 };

export default function SalesChart({ data }: { data: ChartPoint[] }) {
  const [metric, setMetric] = useState<Metric>("revenue");
  const [range, setRange] = useState<Range>("14d");
  const [hover, setHover] = useState<number | null>(null);

  const points = useMemo(() => {
    const n = range === "14d" ? 14 : 30;
    return data.slice(-n);
  }, [data, range]);

  const values = points.map((p) => (metric === "revenue" ? p.revenue : p.orders));
  const max = Math.max(...values, 1);
  const niceMax = Math.ceil(max / 10 ** Math.floor(Math.log10(max))) * 10 ** Math.floor(Math.log10(max));

  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => PAD.top + ih - (v / niceMax) * ih;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(metric === "revenue" ? p.revenue : p.orders).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${(PAD.top + ih).toFixed(1)} L${x(0).toFixed(1)},${(PAD.top + ih).toFixed(1)} Z`;

  const total = metric === "revenue"
    ? points.reduce((s, p) => s + p.revenue, 0)
    : points.reduce((s, p) => s + p.orders, 0);

  const fmt = (v: number) => (metric === "revenue" ? `৳${v.toLocaleString("en-IN")}` : String(v));

  return (
    <section className="adm-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-bold text-[var(--adm-text)]">Sales analytics</h2>
          <p className="mt-1 text-sm text-[var(--adm-sub)]">
            <span className="text-lg font-bold text-[var(--adm-text)]">{fmt(total)}</span> in the last {range === "14d" ? "14" : "30"} days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[var(--adm-border)] p-0.5" role="group" aria-label="Metric">
            {(["revenue", "orders"] as Metric[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                aria-pressed={metric === m}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  metric === m ? "bg-[var(--adm-tint)] text-[var(--adm-primary-soft)]" : "text-[var(--adm-sub)] hover:text-[var(--adm-text)]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-[var(--adm-border)] p-0.5" role="group" aria-label="Range">
            {(["14d", "30d"] as Range[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  range === r ? "bg-[var(--adm-tint)] text-[var(--adm-primary-soft)]" : "text-[var(--adm-sub)] hover:text-[var(--adm-text)]"
                }`}
              >
                {r === "14d" ? "2W" : "1M"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative mt-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${metric} over the last ${range === "14d" ? "14" : "30"} days`}>
          {/* gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={PAD.top + ih * t}
                y2={PAD.top + ih * t}
                stroke="var(--adm-border)"
                strokeDasharray={t === 1 ? undefined : "3 4"}
              />
              <text x={PAD.left - 8} y={PAD.top + ih * t + 4} textAnchor="end" className="fill-[var(--adm-sub)]" fontSize="10">
                {fmt(Math.round(niceMax * (1 - t)))}
              </text>
            </g>
          ))}

          <defs>
            <linearGradient id="adm-chart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--adm-primary-soft)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--adm-primary-soft)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <path d={area} fill="url(#adm-chart-fill)" className="adm-fade" />
          <path d={line} fill="none" stroke="var(--adm-primary-soft)" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />

          {/* x labels — every ~5th day */}
          {points.map((p, i) =>
            i % Math.ceil(points.length / 6) === 0 || i === points.length - 1 ? (
              <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="fill-[var(--adm-sub)]" fontSize="10">
                {p.day}
              </text>
            ) : null,
          )}

          {/* hover target + marker */}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + ih} stroke="var(--adm-primary-soft)" strokeOpacity="0.4" />
              <circle cx={x(hover)} cy={y(metric === "revenue" ? points[hover].revenue : points[hover].orders)} r="4.5" fill="var(--adm-primary-soft)" stroke="var(--adm-surface)" strokeWidth="2" />
            </g>
          )}

          {/* transparent hit columns */}
          {points.map((_, i) => (
            <rect
              key={i}
              x={x(i) - iw / points.length / 2}
              y={PAD.top}
              width={iw / points.length}
              height={ih}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>

        {hover !== null && (
          <div
            className="adm-card pointer-events-none absolute z-10 px-3 py-2 text-xs"
            style={{
              left: `${(x(hover) / W) * 100}%`,
              top: 0,
              transform: `translateX(${hover > points.length / 2 ? "-110%" : "10%"})`,
            }}
          >
            <p className="font-semibold text-[var(--adm-text)]">{points[hover].day}</p>
            <p className="mt-0.5 text-[var(--adm-sub)]">
              Revenue <span className="font-semibold text-[var(--adm-text)]">৳{points[hover].revenue.toLocaleString("en-IN")}</span>
            </p>
            <p className="text-[var(--adm-sub)]">
              Orders <span className="font-semibold text-[var(--adm-text)]">{points[hover].orders}</span>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
