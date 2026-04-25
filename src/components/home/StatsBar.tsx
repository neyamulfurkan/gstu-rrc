// src/components/home/StatsBar.tsx
"use client";

import React from "react";
import { CounterStat } from "@/components/ui/DataDisplay";

interface StatsBarProps {
  stats: {
    members: number;
    events: number;
    projects: number;
    foundedYear: number;
  };
}

export function StatsBar({ stats }: StatsBarProps): JSX.Element {
  const yearsActive = new Date().getFullYear() - stats.foundedYear;

  const statItems = [
    { value: stats.members, label: "Members", icon: "Users" },
    { value: stats.events, label: "Events Hosted", icon: "Calendar" },
    { value: stats.projects, label: "Projects Completed", icon: "Cpu" },
    { value: yearsActive, label: "Years Active", icon: "Clock" },
  ];

  return (
    <section
      className="bg-[var(--color-bg-elevated)] border-y-2 border-[var(--color-primary)]/20 py-10"
      aria-label="Club statistics"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto px-4">
        {statItems.map((item, idx) => (
          <div key={item.label} className="relative">
            <CounterStat
              value={item.value}
              label={item.label}
              icon={item.icon}
            />
            {/* Decorative vertical separator — desktop only, not on last item */}
            {idx < statItems.length - 1 && (
              <div
                aria-hidden="true"
                className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 h-12 w-px bg-[var(--color-border)]"
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}