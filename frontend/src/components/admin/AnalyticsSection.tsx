// components/admin/AnalyticsSection.tsx

import type { ApexOptions } from "apexcharts";
import { useState } from "react";
import Chart from "react-apexcharts";
import { useNavigate } from "react-router";
import { ArrowRightIcon } from "../../icons";

// ── Mock data (shared across tabs) ────────────────────────────────────────────
const statusData = [
  { label: "Completed", count: 830, color: "var(--color-success)" },
  { label: "On-Going", count: 300, color: "var(--color-warning)" },
  { label: "Pending", count: 120, color: "var(--color-danger)" },
];
const statusTotal = statusData.reduce((a, d) => a + d.count, 0);

const flow = [
  { label: "Incoming", value: 800, color: "text-[#3b82f6]", bg: "bg-[#e0e7ff]" },
  { label: "Outgoing", value: 450, color: "text-[#0284c7]", bg: "bg-[#e0f2fe]" },
];

interface Division {
  name: string;
  count: number;
  color: string;
}
const divisions: Division[] = [
  { name: "Roads Division", count: 30, dotColor: "var(--color-primary)" },
  { name: "Planning Division", count: 20, dotColor: "var(--color-secondary)" },
  { name: "Maintenance Division", count: 15, dotColor: "var(--color-accent)" },
  { name: "Bridge Division", count: 12, dotColor: "var(--color-success)" },
  { name: "Drainage Division", count: 8, dotColor: "var(--color-danger)" },
];

const queueStats = [
  {
    label: "Pending Extraction",
    value: 20,
    sub: "awaiting processing",
    color: "text-[#f59e0b]",
    bg: "bg-[#fef3c7]",
  },
  {
    label: "Routed Today",
    value: 50,
    sub: "sent to recipients",
    color: "text-[#10b981]",
    bg: "bg-[#d1fae5]",
  },
];

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 16V4m0 0L7 9m5-5l5 5M5 20h14"
      />
    </svg>
  );
}

function RouteIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = ["Overview", "Divisions", "Uploads"] as const;
type Tab = (typeof TABS)[number];

export default function AnalyticsSection() {
  const [tab, setTab] = useState<Tab>("Overview");
  const navigate = useNavigate();

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Analytics
          </h3>
          <p className="text-theme-sm mt-1 text-gray-500 dark:text-gray-400">
            Status, division workload &amp; upload flow
          </p>
        </div>
        {/* Tab switcher */}
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-white/[0.05] dark:bg-white/[0.02]">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-theme-sm font-medium transition ${
                tab === t
                  ? "bg-white text-secondary shadow-theme-xs dark:bg-white/10 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "Overview" && <OverviewTab />}
      {tab === "Divisions" && <DivisionsTab />}
      {tab === "Uploads" && <UploadsTab onViewQueue={() => navigate("/upload-queue")} />}
    </section>
  );
}

// ── Overview: donut + Incoming/Outgoing ───────────────────────────────────────
function OverviewTab() {
  const series = statusData.map((d) => d.count);
  const colors = statusData.map((d) => d.color);
  const labels = statusData.map((d) => d.label);

  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "donut",
      height: 240,
      toolbar: { show: false },
    },
    colors,
    labels,
    legend: { show: false },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    plotOptions: {
      pie: {
        donut: {
          size: "72%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total",
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--color-gray-400)",
              formatter: () => `${statusTotal.toLocaleString()}`,
            },
            value: {
              show: true,
              fontSize: "24px",
              fontWeight: 700,
              color: "var(--color-text)",
              offsetY: 4,
            },
          },
        },
      },
    },
    tooltip: { y: { formatter: (val) => `${val} documents` } },
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Donut + legend */}
      <div>
        <div className="flex items-center justify-center">
          <Chart
            options={options}
            series={series}
            type="donut"
            height={240}
            width="100%"
          />
        </div>
        <div className="mt-4 space-y-2.5 border-t border-gray-100 pt-4 dark:border-white/[0.05]">
          {statusData.map((d) => (
            <div key={d.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="block h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-theme-sm text-gray-600 dark:text-gray-300">
                  {d.label}
                </span>
              </div>
              <span className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                {d.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Incoming / Outgoing — tucked inside the chart instead of their own cards */}
      <div className="flex flex-col justify-center gap-4">
        <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Document Flow
        </p>
        {flow.map((f) => (
          <div
            key={f.label}
            className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/[0.05] dark:bg-white/[0.03]"
          >
            <div
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${f.bg}`}
            >
              {f.label === "Incoming" ? (
                <svg
                  className={`size-5 ${f.color}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v8m0-8l-4 4m4-4l4 4M5 20h14"
                  />
                </svg>
              ) : (
                <svg
                  className={`size-5 ${f.color}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 16V8m0 8l-4-4m4 4l4-4M5 4h14"
                  />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {f.label}
              </p>
              <p className={`mt-0.5 text-2xl font-bold ${f.color}`}>{f.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Divisions: workload bars ──────────────────────────────────────────────────
function DivisionsTab() {
  const max = Math.max(...divisions.map((d) => d.count));
  const total = divisions.reduce((a, d) => a + d.count, 0);

  return (
    <div>
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-primary/10 bg-primary/5 p-3.5 dark:border-secondary/10 dark:bg-secondary/5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 dark:bg-secondary/10">
          <BuildingIcon className="size-5 text-primary dark:text-secondary" />
        </div>
        <div>
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            Total assigned documents
          </p>
          <p className="text-lg font-bold text-gray-800 dark:text-white/90">{total}</p>
        </div>
      </div>
      <div className="space-y-4">
        {divisions.map((div) => {
          const percent = Math.round((div.count / max) * 100);
          return (
            <div key={div.name} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="block h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: div.dotColor }}
                  />
                  <span className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                    {div.name}
                  </span>
                </div>
                <span className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                  {div.count}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: "var(--color-primary)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Uploads: summary, not a full list (progressive disclosure) ────────────────
function UploadsTab({ onViewQueue }: { onViewQueue: () => void }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {queueStats.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/[0.05] dark:bg-white/[0.03]"
          >
            <div
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${s.bg}`}
            >
              {s.label === "Pending Extraction" ? (
                <UploadIcon className={`size-5 ${s.color}`} />
              ) : (
                <RouteIcon className={`size-5 ${s.color}`} />
              )}
            </div>
            <div>
              <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {s.label}
              </p>
              <p className={`mt-0.5 text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onViewQueue}
        className="text-theme-sm mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#e2e8f0] py-2.5 font-medium text-[#475569] transition-colors hover:bg-gray-50 dark:border-white/[0.05] dark:text-gray-300 dark:hover:bg-white/[0.03]"
      >
        View Queue <ArrowRightIcon className="size-4" />
      </button>
    </div>
  );
}
