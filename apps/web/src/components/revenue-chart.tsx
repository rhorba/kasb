"use client";

import type { ChartDay } from "@/actions/cash-entry";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";

type Props = { data: ChartDay[] };

export default function RevenueChart({ data }: Props) {
  if (data.length === 0) return null;

  const formatted = data.map((d) => ({
    label: new Date(d.date).toLocaleDateString("fr-MA", { day: "numeric", month: "short" }),
    income: d.income / 100,
    expense: d.expense / 100,
  }));

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formatted} barSize={8} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <Tooltip
            formatter={(value) =>
              typeof value === "number" ? [`${value.toLocaleString("fr-MA")} MAD`] : ["—"]
            }
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          />
          <Bar dataKey="income" fill="#E8A020" radius={[4, 4, 0, 0]} name="Recettes" />
          <Bar dataKey="expense" fill="#2D2D6B" radius={[4, 4, 0, 0]} name="Dépenses" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
