// src/components/instruments/index.tsx
"use client";

import { useCallback, useState } from "react";

import useSWR from "swr";

import { cn } from "@/lib/utils";
import { Badge, Skeleton, Spinner, toast } from "@/components/ui/Feedback";
import { Table, EmptyState } from "@/components/ui/DataDisplay";
import { InstrumentCard } from "@/components/instruments/Card";
import { BorrowModal } from "@/components/instruments/BorrowModal";
import { useDebounce } from "@/hooks/useDebounce";
import type { InstrumentCard as InstrumentCardType, BorrowRequestCard } from "@/types/index";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryOption {
  id: string;
  name: string;
}

interface InstrumentsPageProps {
  initialInstruments: InstrumentCardType[];
  categories: CategoryOption[];
  currentMemberId?: string;
}

type ActiveTab = "all" | "my-requests";

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch error: ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── InstrumentsPage ──────────────────────────────────────────────────────────

export function InstrumentsPage({
  initialInstruments,
  categories,
  currentMemberId,
}: InstrumentsPageProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [borrowModalInstrument, setBorrowModalInstrument] =
    useState<InstrumentCardType | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  // ── All Instruments fetch ──
  const allInstrumentsKey = (() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set("categoryId", selectedCategory);
    if (debouncedSearch) params.set("search", debouncedSearch);
    const qs = params.toString();
    return `/api/instruments${qs ? `?${qs}` : ""}`;
  })();

  const {
    data: allInstrumentsData,
    isLoading: allLoading,
    error: allError,
  } = useSWR<{ data: InstrumentCardType[]; total: number }>(
    activeTab === "all" ? allInstrumentsKey : null,
    fetcher,
    {
      fallbackData:
        !selectedCategory && !debouncedSearch
          ? { data: initialInstruments, total: initialInstruments.length }
          : undefined,
      revalidateOnFocus: false,
    }
  );

  // ── My Requests fetch ──
  const {
    data: myRequestsData,
    isLoading: myRequestsLoading,
    error: myRequestsError,
  } = useSWR<{ data: BorrowRequestCard[]; total: number }>(
    activeTab === "my-requests" && currentMemberId
      ? "/api/instruments?myRequests=true"
      : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const instruments = allInstrumentsData?.data ?? [];
  const myRequests = myRequestsData?.data ?? [];

  // On-loan instruments (always computed from current all-instruments list)
  const onLoanInstruments = instruments.filter((i) => i.status === "on_loan");

  // ── Handlers ──
  const handleRequestBorrow = useCallback(
    (instrument: InstrumentCardType) => {
      setBorrowModalInstrument(instrument);
    },
    [setBorrowModalInstrument]
  );

  const handleModalClose = useCallback(() => {
    setBorrowModalInstrument(null);
  }, []);

  const handleModalSuccess = useCallback(() => {
    setBorrowModalInstrument(null);
    toast("Borrow request submitted successfully!", "success");
  }, []);

  // ── My-requests table columns ──
  const myRequestsColumns: Array<{ key: string; header: string; render: (row: Record<string, unknown>) => React.ReactNode }> = [
    {
      key: "instrumentName",
      header: "Instrument",
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as BorrowRequestCard;
        return (<div className="flex items-center gap-3">
          {r.instrument.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={r.instrument.imageUrl}
              alt={r.instrument.name}
              className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-[var(--color-bg-elevated)]"
              loading="lazy"
            />
          )}
          <span className="font-medium text-[var(--color-text-primary)]">
            {r.instrument.name}
          </span>
        </div>);
      },
    },
    {
      key: "purpose",
      header: "Purpose",
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as BorrowRequestCard;
        return (<span className="text-[var(--color-text-secondary)] text-xs line-clamp-2 max-w-[180px]">
          {r.purpose}
        </span>);
      },
    },
    {
      key: "borrowDate",
      header: "Borrow Date",
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as BorrowRequestCard;
        return (<span className="text-xs text-[var(--color-text-secondary)] font-[var(--font-mono)]">
          {new Date(r.borrowDate as string).toLocaleDateString("en-BD", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>);
      },
    },
    {
      key: "returnDate",
      header: "Return Date",
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as BorrowRequestCard;
        return (<span className="text-xs text-[var(--color-text-secondary)] font-[var(--font-mono)]">
          {new Date(r.returnDate as string).toLocaleDateString("en-BD", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>);
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as BorrowRequestCard;
        const variantMap: Record<
          string,
          "success" | "warning" | "error" | "primary" | "neutral"
        > = {
          approved: "success",
          pending: "warning",
          rejected: "error",
          returned: "primary",
        };
        const variant = variantMap[r.status] ?? "neutral";
        return (
          <Badge variant={variant} size="sm">
            {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
          </Badge>
        );
      },
    },
    {
      key: "adminNote",
      header: "Admin Note",
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as BorrowRequestCard;
        return r.adminNote ? (
          <span className="text-xs text-[var(--color-text-secondary)] italic max-w-[160px] line-clamp-2">
            {r.adminNote}
          </span>
        ) : (
          <span className="text-xs text-[var(--color-border)]">—</span>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)]">
      {/* ── Page Header ── */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1
            className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Lab Instruments
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm md:text-base">
            Browse and request lab equipment for your projects and research.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── Tab Bar ── */}
        <div className="flex items-center gap-1 border-b border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "px-5 py-3 text-sm font-medium transition-colors duration-150 border-b-2 -mb-px focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-inset",
              activeTab === "all"
                ? "border-[var(--color-primary)] text-[var(--color-text-primary)]"
                : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)]"
            )}
          >
            All Instruments
          </button>

          {currentMemberId && (
            <button
              type="button"
              onClick={() => setActiveTab("my-requests")}
              className={cn(
                "px-5 py-3 text-sm font-medium transition-colors duration-150 border-b-2 -mb-px focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-inset",
                activeTab === "my-requests"
                  ? "border-[var(--color-primary)] text-[var(--color-text-primary)]"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)]"
              )}
            >
              My Requests
            </button>
          )}
        </div>

        {/* ── All Instruments Tab ── */}
        {activeTab === "all" && (
          <div className="space-y-6">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150",
                  "border focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                  selectedCategory === null
                    ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                    : "bg-transparent border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-text-primary)]"
                )}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === cat.id ? null : cat.id
                    )
                  }
                  className={cn(
                    "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150",
                    "border focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                    selectedCategory === cat.id
                      ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                      : "bg-transparent border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search instruments…"
                aria-label="Search instruments"
                className={cn(
                  "w-full pl-10 pr-4 py-2.5 rounded-lg text-sm",
                  "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                  "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
                  "transition-colors duration-150",
                  "hover:border-[var(--color-primary)]/50",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                )}
              />
              {search.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2",
                    "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded"
                  )}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Instruments Grid */}
            {allLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={`skel-${i}`}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] overflow-hidden"
                    aria-hidden="true"
                  >
                    <Skeleton height={200} className="w-full rounded-none" />
                    <div className="p-4 space-y-3">
                      <Skeleton height={20} className="w-3/4" />
                      <Skeleton height={14} className="w-1/2" />
                      <Skeleton height={14} className="w-full" />
                      <Skeleton height={36} className="w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : allError ? (
              <EmptyState
                icon="AlertCircle"
                heading="Failed to load instruments"
                description="There was an error fetching the instruments list. Please try again."
                action={{
                  label: "Retry",
                  onClick: () => window.location.reload(),
                }}
              />
            ) : instruments.length === 0 ? (
              <EmptyState
                icon="Package"
                heading="No instruments found"
                description={
                  debouncedSearch || selectedCategory
                    ? "No instruments match your current filters. Try adjusting your search or category."
                    : "No instruments are available at the moment."
                }
                action={
                  (debouncedSearch || selectedCategory)
                    ? {
                        label: "Clear Filters",
                        onClick: () => {
                          setSearch("");
                          setSelectedCategory(null);
                        },
                      }
                    : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {instruments.map((instrument) => (
                  <InstrumentCard
                    key={instrument.id}
                    instrument={instrument}
                    onRequestBorrow={() => handleRequestBorrow(instrument)}
                    isLoggedIn={Boolean(currentMemberId)}
                  />
                ))}
              </div>
            )}

            {/* Currently On Loan Section */}
            {onLoanInstruments.length > 0 && (
              <section
                aria-labelledby="on-loan-heading"
                className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-warning)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="flex-shrink-0"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4" />
                    <path d="M12 16h.01" />
                  </svg>
                  <h2
                    id="on-loan-heading"
                    className="text-sm font-semibold text-[var(--color-text-primary)]"
                  >
                    Currently On Loan
                    <span className="ml-2 text-[var(--color-text-secondary)] font-normal">
                      ({onLoanInstruments.length})
                    </span>
                  </h2>
                </div>
                <ul className="divide-y divide-[var(--color-border)]" role="list">
                  {onLoanInstruments.map((inst) => (
                    <li
                      key={inst.id}
                      className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--color-bg-elevated)] transition-colors"
                    >
                      {inst.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={inst.imageUrl}
                          alt={inst.name}
                          className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-[var(--color-bg-elevated)]"
                          loading="lazy"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {inst.name}
                        </p>
                        {inst.borrower && (
                          <p className="text-xs text-[var(--color-text-secondary)] truncate">
                            Borrowed by{" "}
                            <span className="text-[var(--color-accent)]">
                              {inst.borrower.fullName}
                            </span>
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge variant="warning" size="sm">
                          On Loan
                        </Badge>
                        {inst.returnDate && (
                          <span className="text-xs text-[var(--color-text-secondary)] font-[var(--font-mono)]">
                            Due{" "}
                            {new Date(inst.returnDate).toLocaleDateString(
                              "en-BD",
                              { day: "2-digit", month: "short" }
                            )}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {/* ── My Requests Tab ── */}
        {activeTab === "my-requests" && currentMemberId && (
          <div className="space-y-6">
            {myRequestsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={`req-skel-${i}`} height={52} className="w-full rounded-lg" />
                ))}
              </div>
            ) : myRequestsError ? (
              <EmptyState
                icon="AlertCircle"
                heading="Failed to load requests"
                description="Unable to fetch your borrow requests. Please try again."
                action={{
                  label: "Retry",
                  onClick: () => window.location.reload(),
                }}
              />
            ) : myRequests.length === 0 ? (
              <EmptyState
                icon="ClipboardList"
                heading="No borrow requests"
                description="You haven't submitted any instrument borrow requests yet. Browse the instruments tab to make a request."
                action={{
                  label: "Browse Instruments",
                  onClick: () => setActiveTab("all"),
                }}
              />
            ) : (
              <Table<Record<string, unknown>>
                columns={myRequestsColumns}
                data={myRequests as unknown as Record<string, unknown>[]}
                striped
                rowKey={(row) => String(row.id)}
                emptyMessage="No borrow requests found."
              />
            )}

            {/* Currently On Loan Section (also visible on my-requests tab) */}
            {onLoanInstruments.length > 0 && (
              <section
                aria-labelledby="on-loan-my-requests-heading"
                className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-warning)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="flex-shrink-0"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4" />
                    <path d="M12 16h.01" />
                  </svg>
                  <h2
                    id="on-loan-my-requests-heading"
                    className="text-sm font-semibold text-[var(--color-text-primary)]"
                  >
                    Currently On Loan
                    <span className="ml-2 text-[var(--color-text-secondary)] font-normal">
                      ({onLoanInstruments.length})
                    </span>
                  </h2>
                </div>
                <ul className="divide-y divide-[var(--color-border)]" role="list">
                  {onLoanInstruments.map((inst) => (
                    <li
                      key={inst.id}
                      className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--color-bg-elevated)] transition-colors"
                    >
                      {inst.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={inst.imageUrl}
                          alt={inst.name}
                          className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-[var(--color-bg-elevated)]"
                          loading="lazy"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {inst.name}
                        </p>
                        {inst.borrower && (
                          <p className="text-xs text-[var(--color-text-secondary)] truncate">
                            Borrowed by{" "}
                            <span className="text-[var(--color-accent)]">
                              {inst.borrower.fullName}
                            </span>
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge variant="warning" size="sm">
                          On Loan
                        </Badge>
                        {inst.returnDate && (
                          <span className="text-xs text-[var(--color-text-secondary)] font-[var(--font-mono)]">
                            Due{" "}
                            {new Date(inst.returnDate).toLocaleDateString(
                              "en-BD",
                              { day: "2-digit", month: "short" }
                            )}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>

      {/* ── Borrow Modal ── */}
      {borrowModalInstrument !== null && (
        <BorrowModal
          instrument={borrowModalInstrument}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}