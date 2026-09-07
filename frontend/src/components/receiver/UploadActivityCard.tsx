// components/receiver/UploadActivityCard.tsx

import type { ApexOptions } from "apexcharts";
import { useState } from "react";
import Chart from "react-apexcharts";
import { MoreDotIcon } from "../../icons";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

// ── Mini Stat ────────────────────────────────────────────────────────────────

function ActivityStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub: string;
  accent: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      <p className="text-theme-xs text-gray-500 dark:text-gray-400">{sub}</p>
    </div>
  );
}

// ── Upload Activity Card ───────────────────────────────────────────────────────

export default function UploadActivityCard() {
  const [isOpen, setIsOpen] = useState(false);

  // Daily uploads for the past 7 days (Mon–Sun)
  const dailyData = [4, 7, 3, 8, 6, 5, 5];
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const todayUploads = dailyData[dailyData.length - 1];
  const weekUploads = dailyData.reduce((a, b) => a + b, 0);

  const options: ApexOptions = {
    colors: ["#1e3a8a"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 160,
      toolbar: { show: false },
      sparkline: { enabled: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "45%",
        borderRadius: 4,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 3, colors: ["transparent"] },
    xaxis: {
      categories: weekdays,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { fontSize: "11px", colors: Array(7).fill("#9CA3AF") },
      },
    },
    yaxis: {
      show: true,
      labels: {
        style: { fontSize: "11px", colors: ["#9CA3AF"] },
      },
    },
    grid: {
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
      borderColor: "#F3F4F6",
    },
    fill: { opacity: 1 },
    tooltip: {
      x: { show: true },
      y: { formatter: (val) => `${val} docs` },
    },
  };

  const series = [{ name: "Uploads", data: dailyData }];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pt-5 pb-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Upload Activity
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Documents you've uploaded this week
          </p>
        </div>
        <div className="relative inline-block">
          <button className="dropdown-toggle" onClick={() => setIsOpen((v) => !v)}>
            <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 size-6" />
          </button>
          <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-40 p-2">
            <DropdownItem
              onItemClick={() => setIsOpen(false)}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              View More
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-around py-4 mb-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
        <ActivityStat
          label="Today"
          value={todayUploads}
          sub="documents uploaded"
          accent="text-primary dark:text-secondary"
        />
        <div className="w-px h-10 bg-gray-200 dark:bg-gray-800" />
        <ActivityStat
          label="This Week"
          value={weekUploads}
          sub="documents uploaded"
          accent="text-success"
        />
      </div>

      {/* Bar chart */}
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[300px]">
          <Chart options={options} series={series} type="bar" height={160} />
        </div>
      </div>
    </div>
  );
}
