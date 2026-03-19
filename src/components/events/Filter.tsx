// src/components/events/Filter.tsx
"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input, Select } from "@/components/ui/Forms";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventFilterState {
  search: string;
  categoryId?: string;
}

interface EventCategory {
  id: string;
  name: string;
  color: string;
}

interface EventsFilterProps {
  state: EventFilterState;
  onChange: (state: EventFilterState) => void;
  categories: EventCategory[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EventsFilter({
  state,
  onChange,
  categories,
}: EventsFilterProps): JSX.Element {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...state, search: e.target.value });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...state, categoryId: e.target.value || undefined });
  };

  const handleClearSearch = () => {
    onChange({ ...state, search: "" });
  };

  const handleClearCategory = () => {
    onChange({ ...state, categoryId: undefined });
  };

  const hasActiveFilters = state.search.length > 0 || !!state.categoryId;

  const categoryOptions = categories.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }));

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Filter Controls */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={state.search}
            onChange={handleSearchChange}
            placeholder="Search events…"
            aria-label="Search events"
            className={cn(
              "block w-full rounded-lg py-2 pl-9 pr-3 text-sm",
              "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]",
              "border border-[var(--color-border)]",
              "placeholder:text-[var(--color-text-secondary)]",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
            )}
          />
        </div>

        {/* Category */}
        <div className="min-w-[180px]">
          <Select
            value={state.categoryId ?? ""}
            onChange={handleCategoryChange}
            placeholder="All Categories"
            options={categoryOptions}
            aria-label="Filter by category"
          />
        </div>

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => onChange({ search: "", categoryId: undefined })}
            aria-label="Clear all filters"
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm",
              "border border-[var(--color-border)]",
              "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
              "bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-surface)]",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            <X size={14} aria-hidden="true" />
            Clear
          </button>
        )}
      </div>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2" aria-label="Active filters">
          {state.search && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                "bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20",
                "text-[var(--color-primary)]"
              )}
            >
              <Search size={11} aria-hidden="true" />
              {state.search}
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label={`Remove search filter: ${state.search}`}
                className={cn(
                  "ml-0.5 rounded-full p-0.5",
                  "hover:bg-[var(--color-primary)]/20",
                  "focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]",
                  "transition-colors duration-150"
                )}
              >
                <X size={10} aria-hidden="true" />
              </button>
            </span>
          )}

          {state.categoryId && (() => {
            const cat = categories.find((c) => c.id === state.categoryId);
            if (!cat) return null;
            return (
              <span
                key={cat.id}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                  "border"
                )}
                style={{
                  color: cat.color,
                  backgroundColor: `${cat.color}1A`,
                  borderColor: `${cat.color}33`,
                }}
              >
                {cat.name}
                <button
                  type="button"
                  onClick={handleClearCategory}
                  aria-label={`Remove category filter: ${cat.name}`}
                  className={cn(
                    "ml-0.5 rounded-full p-0.5",
                    "focus:outline-none focus:ring-1",
                    "transition-colors duration-150",
                    "hover:opacity-70"
                  )}
                  style={
                    { "--tw-ring-color": cat.color } as React.CSSProperties
                  }
                >
                  <X size={10} aria-hidden="true" />
                </button>
              </span>
            );
          })()}
        </div>
      )}
    </div>
  );
}