"use client";
import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Props {
  data: Array<{ name: string; value: number }>;
  primaryColor: string;
  accentColor: string;
  accentSecondaryColor: string;
}

export function MemberTypePieChart({ data, primaryColor, accentColor, accentSecondaryColor }: Props): JSX.Element {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
        No data available
      </div>
    );
  }
  const COLORS = [primaryColor, accentColor, accentSecondaryColor, "var(--color-success)", "var(--color-warning)"];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "var(--color-text-secondary)" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}