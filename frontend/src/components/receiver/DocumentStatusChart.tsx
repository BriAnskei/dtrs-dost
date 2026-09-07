// components/receiver/DocumentStatusChart.tsx

import type { ApexOptions } from "apexcharts";
import Chart from "react-apexcharts";

interface LegendItemProps {
  color: string;
  label: string;
  count: number;
  percent: number;
}

function LegendItem({ color, label, count, percent }: LegendItemProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span
          className="block w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-theme-sm text-gray-600 dark:text-gray-300">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          {count}
        </span>
        <span className="text-theme-xs text-gray-400 dark:text-gray-500 w-10 text-right">
          {percent}%
        </span>
      </div>
    </div>
  );
}

export default function DocumentStatusChart() {
  const total = 115;
  const data = [
    { label: "Received", count: 100, color: "var(--color-success)" },
    { label: "On-Queue", count: 12, color: "var(--color-warning)" },
    { label: "Rejected", count: 3, color: "var(--color-danger)" },
  ];
  const series = data.map((d) => d.count);
  const colors = data.map((d) => d.color);
  const labels = data.map((d) => d.label);

  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "donut",
      height: 220,
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
              formatter: () => `${total}`,
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
    tooltip: {
      y: {
        formatter: (val) => `${val} documents`,
      },
    },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Status Breakdown
        </h3>
        <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
          Distribution of your document statuses
        </p>
      </div>
      {/* Donut chart */}
      <div className="flex items-center justify-center">
        <Chart options={options} series={series} type="donut" height={220} width="100%" />
      </div>
      {/* Legend */}
      <div className="mt-5 space-y-3 border-t border-gray-100 dark:border-white/[0.05] pt-5">
        {data.map((d) => (
          <LegendItem
            key={d.label}
            color={d.color}
            label={d.label}
            count={d.count}
            percent={Math.round((d.count / total) * 100)}
          />
        ))}
      </div>
    </div>
  );
}
