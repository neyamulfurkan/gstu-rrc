// src/components/admin/CommitteeAdmin.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  GripVertical,
  Plus,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  Loader2,
  Users,
  UserCheck,
  History,
  BookOpen,
  Search,
  Trash2,
  Pencil,
  Check,
} from "lucide-react";
import useSWR, { mutate as globalMutate } from "swr";

import { cn } from "@/lib/utils";
import { CloudinaryWidget } from "@/components/ui/Media";
import { Badge, Alert, Spinner, Skeleton, toast } from "@/components/ui/Feedback";
import { EmptyState } from "@/components/ui/DataDisplay";
import { useMemberSearch } from "@/hooks/useMemberSearch";
import type {
  CommitteeMemberEntry,
  AdvisorEntry,
} from "@/types/index";

// ─── Fetcher ──────────────────────────────────────────────────────────────────

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch error: ${res.status}`);
  return res.json();
};

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = "executive" | "sub-executive" | "ex-committee" | "advisors";

interface DraggableRow {
  localId: string;
  id: string;
  memberId: string | null;
  memberName: string;
  designation: string;
  sortOrder: number;
  member?: { username: string; avatarUrl: string; fullName: string } | null;
}

interface ExSession {
  sessionLabel: string;
  rows: DraggableRow[];
}

interface AdvisorFormState {
  id: string;
  name: string;
  designation: string;
  institution: string;
  photoUrl: string;
  bio: string;
  researchInterests: string[];
  email: string;
  socialLinks: Record<string, string>;
  isCurrent: boolean;
  periodStart: string;
  periodEnd: string;
  sortOrder: number;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function makeLocalId(): string {
  return `local-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function toRows(entries: CommitteeMemberEntry[]): DraggableRow[] {
  return entries
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((e) => ({
      localId: makeLocalId(),
      id: e.id,
      memberId: e.memberId ?? null,
      memberName: e.memberName,
      designation: e.designation,
      sortOrder: e.sortOrder,
      member: e.member ?? null,
    }));
}

function emptyRow(): DraggableRow {
  return {
    localId: makeLocalId(),
    id: "",
    memberId: null,
    memberName: "",
    designation: "",
    sortOrder: 0,
    member: null,
  };
}

function emptyAdvisorForm(): AdvisorFormState {
  return {
    id: "",
    name: "",
    designation: "",
    institution: "",
    photoUrl: "",
    bio: "",
    researchInterests: [],
    email: "",
    socialLinks: {},
    isCurrent: true,
    periodStart: "",
    periodEnd: "",
    sortOrder: 0,
  };
}

// ─── MemberSearchDropdown ─────────────────────────────────────────────────────

interface MemberSearchDropdownProps {
  value: string;
  onChange: (value: string, memberId: string | null) => void;
  placeholder?: string;
}

function MemberSearchDropdown({
  value,
  onChange,
  placeholder = "Search member...",
}: MemberSearchDropdownProps): JSX.Element {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const { members, isLoading } = useMemberSearch(query);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onChange(e.target.value, null);
    setOpen(true);
  };

  const handleSelect = (m: { id: string; fullName: string; username: string; avatarUrl: string }) => {
    setQuery(m.fullName);
    onChange(m.fullName, m.id);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative flex-1 min-w-0">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder={placeholder}
          className={cn(
            "w-full pl-8 pr-3 py-2 text-sm rounded-md",
            "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
            "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent",
            "transition-colors"
          )}
        />
        {isLoading && (
          <Spinner
            size="sm"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
          />
        )}
      </div>
      {open && members.length > 0 && (
        <ul
          role="listbox"
          className={cn(
            "absolute z-50 w-full mt-1 rounded-lg border border-[var(--color-border)]",
            "bg-[var(--color-bg-elevated)] shadow-lg overflow-hidden",
            "max-h-48 overflow-y-auto"
          )}
        >
          {members.map((m) => (
            <li key={m.id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => handleSelect(m)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left",
                  "hover:bg-[var(--color-bg-overlay)] transition-colors",
                  "text-[var(--color-text-primary)]"
                )}
              >
                {m.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.avatarUrl}
                    alt={m.fullName}
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-[var(--color-primary)]">
                      {m.fullName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-medium truncate">{m.fullName}</div>
                  <div className="text-xs text-[var(--color-text-secondary)] truncate">@{m.username}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── DraggableList ────────────────────────────────────────────────────────────

interface DraggableListProps {
  rows: DraggableRow[];
  onChange: (rows: DraggableRow[]) => void;
  committeeType: string;
}

function DraggableList({ rows, onChange, committeeType }: DraggableListProps): JSX.Element {
  const listRef = useRef<HTMLDivElement>(null);
  const draggingIdx = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);

  const updateRow = useCallback(
    (localId: string, patch: Partial<DraggableRow>) => {
      onChange(rows.map((r) => (r.localId === localId ? { ...r, ...patch } : r)));
    },
    [rows, onChange]
  );

  const removeRow = useCallback(
    (localId: string) => {
      onChange(rows.filter((r) => r.localId !== localId));
    },
    [rows, onChange]
  );

  const addRow = useCallback(() => {
    onChange([...rows, emptyRow()]);
  }, [rows, onChange]);

  const handleDragStart = (idx: number) => {
    draggingIdx.current = idx;
  };

  const handleDragEnter = (idx: number) => {
    dragOverIdx.current = idx;
  };

  const handleDragEnd = () => {
    const from = draggingIdx.current;
    const to = dragOverIdx.current;
    if (from === null || to === null || from === to) {
      draggingIdx.current = null;
      dragOverIdx.current = null;
      return;
    }
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const reordered = next.map((r, i) => ({ ...r, sortOrder: i }));
    onChange(reordered);
    draggingIdx.current = null;
    dragOverIdx.current = null;
  };

  return (
    <div ref={listRef} className="space-y-2">
      {rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
          No members yet. Click &ldquo;Add Member&rdquo; to get started.
        </div>
      ) : (
        rows.map((row, idx) => (
          <div
            key={row.localId}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragEnter={() => handleDragEnter(idx)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className={cn(
              "flex items-center gap-2 p-2.5 rounded-lg border",
              "bg-[var(--color-bg-surface)] border-[var(--color-border)]",
              "hover:border-[var(--color-primary)]/40 transition-colors",
              "cursor-default select-none"
            )}
          >
            {/* Drag handle */}
            <button
              type="button"
              aria-label="Drag to reorder"
              className="flex-shrink-0 cursor-grab active:cursor-grabbing text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-1 rounded"
            >
              <GripVertical size={16} aria-hidden="true" />
            </button>

            {/* Sort index badge */}
            <span className="flex-shrink-0 w-6 text-center text-xs font-mono text-[var(--color-text-secondary)]">
              {idx + 1}
            </span>

            {/* Member search */}
            <MemberSearchDropdown
              value={row.memberName}
              onChange={(name, id) =>
                updateRow(row.localId, { memberName: name, memberId: id })
              }
              placeholder="Search or type name..."
            />

            {/* Designation */}
            <input
              type="text"
              value={row.designation}
              onChange={(e) => updateRow(row.localId, { designation: e.target.value })}
              placeholder="Designation"
              className={cn(
                "flex-1 min-w-0 px-3 py-2 text-sm rounded-md",
                "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
                "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent",
                "transition-colors"
              )}
            />

            {/* Remove */}
            <button
              type="button"
              onClick={() => removeRow(row.localId)}
              aria-label="Remove row"
              className={cn(
                "flex-shrink-0 p-1.5 rounded-md text-[var(--color-text-secondary)]",
                "hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10",
                "transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              )}
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        ))
      )}

      <button
        type="button"
        onClick={addRow}
        className={cn(
          "mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium",
          "border border-dashed border-[var(--color-border)]",
          "text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]",
          "hover:border-[var(--color-primary)] transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        )}
      >
        <Plus size={14} aria-hidden="true" />
        Add Member
      </button>
    </div>
  );
}

// ─── CurrentCommitteeTab ──────────────────────────────────────────────────────

interface CurrentCommitteeTabProps {
  committeeType: "executive" | "sub-executive";
}

function CurrentCommitteeTab({ committeeType }: CurrentCommitteeTabProps): JSX.Element {
  const apiType = committeeType === "executive" ? "executive" : "sub_executive";
  const { data, isLoading, error } = useSWR<{ data: { executive: CommitteeMemberEntry[]; subExecutive: CommitteeMemberEntry[]; exCommittee: CommitteeMemberEntry[] } }>(
    `/api/admin/committee?type=${apiType}`,
    fetcher
  );

  const [rows, setRows] = useState<DraggableRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (data?.data) {
      const entries =
        apiType === "executive"
          ? data.data.executive
          : apiType === "sub_executive"
          ? data.data.subExecutive
          : data.data.exCommittee;
      setRows(toRows(Array.isArray(entries) ? entries : []));
    }
  }, [data, apiType]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = rows
        .filter((r) => r.memberName.trim() && r.designation.trim())
        .map((r, i) => ({
          id: r.id || undefined,
          memberId: r.memberId || null,
          memberName: r.memberName.trim(),
          designation: r.designation.trim(),
          committeeType: apiType,
          sortOrder: i,
        }));

      const res = await fetch("/api/admin/committee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replaceAll: true, items: payload }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to save" }));
        throw new Error(err.message || "Failed to save");
      }

      await globalMutate(`/api/admin/committee?type=${apiType}`);
      toast("Committee saved successfully", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      setSaveError(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={52} className="w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        variant="error"
        title="Failed to load committee"
        message="Could not fetch committee data. Please refresh and try again."
        className="mt-4"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Drag rows to reorder. Changes are not saved until you click &ldquo;Save.&rdquo;
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
            "bg-[var(--color-primary)] text-white",
            "hover:opacity-90 active:scale-95 transition-all",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          {saving ? (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          ) : (
            <Save size={15} aria-hidden="true" />
          )}
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {saveError && (
        <Alert variant="error" message={saveError} dismissible onDismiss={() => setSaveError(null)} />
      )}

      <DraggableList rows={rows} onChange={setRows} committeeType={apiType} />
    </div>
  );
}

// ─── ExCommitteeTab ───────────────────────────────────────────────────────────

function ExCommitteeTab(): JSX.Element {
  const { data, isLoading, error } = useSWR<{ data: { executive: CommitteeMemberEntry[]; subExecutive: CommitteeMemberEntry[]; exCommittee: CommitteeMemberEntry[] } }>(
    "/api/admin/committee?type=ex",
    fetcher
  );

  const [sessions, setSessions] = useState<ExSession[]>([]);
  const [openSessions, setOpenSessions] = useState<Set<number>>(new Set([0]));
  const [saving, setSaving] = useState<number | null>(null);
  const [newSessionLabel, setNewSessionLabel] = useState("");
  const [addingSession, setAddingSession] = useState(false);

  useEffect(() => {
    if (data?.data) {
      const exMembers = Array.isArray(data.data.exCommittee) ? data.data.exCommittee : [];
      // Group ex-committee members by session label
      const sessionMap = new Map<string, CommitteeMemberEntry[]>();
      for (const member of exMembers) {
        const label = member.session ?? "Unknown Session";
        if (!sessionMap.has(label)) sessionMap.set(label, []);
        sessionMap.get(label)!.push(member);
      }
      setSessions(
        Array.from(sessionMap.entries()).map(([sessionLabel, members]) => ({
          sessionLabel,
          rows: toRows(members),
        }))
      );
    }
  }, [data]);

  const toggleSession = (idx: number) => {
    setOpenSessions((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const updateSessionRows = (idx: number, rows: DraggableRow[]) => {
    setSessions((prev) => prev.map((s, i) => (i === idx ? { ...s, rows } : s)));
  };

  const addSession = () => {
    const label = newSessionLabel.trim();
    if (!label) return;
    const newIdx = sessions.length;
    setSessions((prev) => [...prev, { sessionLabel: label, rows: [] }]);
    setOpenSessions((prev) => new Set([...prev, newIdx]));
    setNewSessionLabel("");
    setAddingSession(false);
  };

  const handleSaveSession = async (idx: number) => {
    const session = sessions[idx];
    if (!session) return;
    setSaving(idx);
    try {
      const payload = session.rows.map((r, i) => ({
        id: r.id || undefined,
        memberId: r.memberId || null,
        memberName: r.memberName.trim(),
        designation: r.designation.trim(),
        committeeType: "ex_committee",
        sortOrder: i,
        sessionYear: session.sessionLabel,
      }));

      const res = await fetch("/api/admin/committee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replaceAll: true, items: payload }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to save" }));
        throw new Error(err.message || "Failed to save");
      }

      await globalMutate("/api/admin/committee?type=ex");
      toast(`Session "${session.sessionLabel}" saved`, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      toast(msg, "error");
    } finally {
      setSaving(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={56} className="w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        variant="error"
        title="Failed to load ex-committee"
        message="Could not fetch ex-committee data. Please refresh and try again."
        className="mt-4"
      />
    );
  }

  return (
    <div className="space-y-3">
      {sessions.length === 0 && !addingSession && (
        <EmptyState
          icon="History"
          heading="No ex-committee records"
          description="Add sessions to record past committee members."
        />
      )}

      {sessions.map((session, idx) => {
        const isOpen = openSessions.has(idx);
        return (
          <div
            key={`session-${idx}-${session.sessionLabel}`}
            className="rounded-xl border border-[var(--color-border)] overflow-hidden"
          >
            {/* Accordion header */}
            <button
              type="button"
              onClick={() => toggleSession(idx)}
              aria-expanded={isOpen}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 text-left",
                "bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-overlay)]",
                "transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-accent)]"
              )}
            >
              <div className="flex items-center gap-3">
                <History size={16} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
                <span className="font-semibold text-[var(--color-text-primary)] font-[var(--font-heading)]">
                  {session.sessionLabel}
                </span>
                <Badge variant="neutral" size="sm">
                  {session.rows.length} member{session.rows.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              {isOpen ? (
                <ChevronUp size={16} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
              ) : (
                <ChevronDown size={16} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
              )}
            </button>

            {/* Accordion body */}
            {isOpen && (
              <div className="p-4 bg-[var(--color-bg-surface)] border-t border-[var(--color-border)] space-y-4">
                <DraggableList
                  rows={session.rows}
                  onChange={(rows) => updateSessionRows(idx, rows)}
                  committeeType="ex"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleSaveSession(idx)}
                    disabled={saving === idx}
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                      "bg-[var(--color-primary)] text-white",
                      "hover:opacity-90 active:scale-95 transition-all",
                      "disabled:opacity-60 disabled:cursor-not-allowed",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    )}
                  >
                    {saving === idx ? (
                      <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Save size={15} aria-hidden="true" />
                    )}
                    {saving === idx ? "Saving…" : "Save Session"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add session */}
      {addingSession ? (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-surface)]">
          <input
            type="text"
            value={newSessionLabel}
            onChange={(e) => setNewSessionLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addSession();
              if (e.key === "Escape") setAddingSession(false);
            }}
            placeholder="e.g. 2022–2023"
            autoFocus
            className={cn(
              "flex-1 px-3 py-2 text-sm rounded-md",
              "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]",
              "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          />
          <button
            type="button"
            onClick={addSession}
            disabled={!newSessionLabel.trim()}
            aria-label="Confirm add session"
            className={cn(
              "p-2 rounded-md bg-[var(--color-primary)] text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "hover:opacity-90 transition-opacity",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            <Check size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              setAddingSession(false);
              setNewSessionLabel("");
            }}
            aria-label="Cancel add session"
            className={cn(
              "p-2 rounded-md text-[var(--color-text-secondary)]",
              "hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingSession(true)}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
            "border border-dashed border-[var(--color-border)]",
            "text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]",
            "hover:border-[var(--color-primary)] transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          <Plus size={15} aria-hidden="true" />
          Add Session
        </button>
      )}
    </div>
  );
}

// ─── AdvisorForm ──────────────────────────────────────────────────────────────

interface AdvisorFormProps {
  initial: AdvisorFormState;
  onSave: (form: AdvisorFormState) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

function AdvisorForm({ initial, onSave, onCancel, saving }: AdvisorFormProps): JSX.Element {
  const [form, setForm] = useState<AdvisorFormState>(initial);
  const [interestInput, setInterestInput] = useState("");
  const [socialKey, setSocialKey] = useState("");
  const [socialVal, setSocialVal] = useState("");

  const patch = (p: Partial<AdvisorFormState>) => setForm((f) => ({ ...f, ...p }));

  const addInterest = () => {
    const v = interestInput.trim();
    if (!v) return;
    patch({ researchInterests: [...form.researchInterests, v] });
    setInterestInput("");
  };

  const removeInterest = (idx: number) => {
    patch({ researchInterests: form.researchInterests.filter((_, i) => i !== idx) });
  };

  const addSocialLink = () => {
    const k = socialKey.trim();
    const v = socialVal.trim();
    if (!k || !v) return;
    patch({ socialLinks: { ...form.socialLinks, [k]: v } });
    setSocialKey("");
    setSocialVal("");
  };

  const removeSocialLink = (key: string) => {
    const next = { ...form.socialLinks };
    delete next[key];
    patch({ socialLinks: next });
  };

  const inputCls = cn(
    "w-full px-3 py-2 text-sm rounded-md",
    "bg-[var(--color-bg-surface)] border border-[var(--color-border)]",
    "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]",
    "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent",
    "transition-colors"
  );

  return (
    <div className="space-y-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)]">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
            Full Name <span className="text-[var(--color-error)]">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Dr. Jane Doe"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
            Designation <span className="text-[var(--color-error)]">*</span>
          </label>
          <input
            type="text"
            value={form.designation}
            onChange={(e) => patch({ designation: e.target.value })}
            placeholder="Professor, Dept. of CSE"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
            Institution
          </label>
          <input
            type="text"
            value={form.institution}
            onChange={(e) => patch({ institution: e.target.value })}
            placeholder="GSTU"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => patch({ email: e.target.value })}
            placeholder="advisor@university.edu"
            className={inputCls}
          />
        </div>
      </div>

      {/* Photo Upload */}
      <div>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
          Photo
        </label>
        <CloudinaryWidget
          folder="admin/gallery"
          value={form.photoUrl || null}
          onChange={(url) => patch({ photoUrl: url })}
          label="Upload Photo"
        />
        {form.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={form.photoUrl}
            alt="Advisor preview"
            className="mt-2 w-16 h-16 rounded-full object-cover border border-[var(--color-border)]"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>

      {/* Bio */}
      <div>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
          Bio
        </label>
        <textarea
          value={form.bio}
          onChange={(e) => patch({ bio: e.target.value })}
          placeholder="A brief biography..."
          rows={3}
          className={cn(inputCls, "resize-y min-h-[72px]")}
        />
      </div>

      {/* Research Interests */}
      <div>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
          Research Interests
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={interestInput}
            onChange={(e) => setInterestInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInterest())}
            placeholder="Type and press Enter"
            className={cn(inputCls, "flex-1")}
          />
          <button
            type="button"
            onClick={addInterest}
            aria-label="Add interest"
            className={cn(
              "px-3 py-2 rounded-md bg-[var(--color-primary)] text-white text-sm",
              "hover:opacity-90 transition-opacity",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            <Plus size={15} aria-hidden="true" />
          </button>
        </div>
        {form.researchInterests.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {form.researchInterests.map((interest, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20"
              >
                {interest}
                <button
                  type="button"
                  onClick={() => removeInterest(idx)}
                  aria-label={`Remove ${interest}`}
                  className="hover:text-[var(--color-error)] transition-colors"
                >
                  <X size={11} aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Social Links */}
      <div>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
          Social Links
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={socialKey}
            onChange={(e) => setSocialKey(e.target.value)}
            placeholder="Label (e.g. LinkedIn)"
            className={cn(inputCls, "flex-1")}
          />
          <input
            type="url"
            value={socialVal}
            onChange={(e) => setSocialVal(e.target.value)}
            placeholder="URL"
            className={cn(inputCls, "flex-1")}
          />
          <button
            type="button"
            onClick={addSocialLink}
            aria-label="Add social link"
            className={cn(
              "px-3 py-2 rounded-md bg-[var(--color-primary)] text-white text-sm",
              "hover:opacity-90 transition-opacity",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            )}
          >
            <Plus size={15} aria-hidden="true" />
          </button>
        </div>
        {Object.entries(form.socialLinks).length > 0 && (
          <ul className="space-y-1">
            {Object.entries(form.socialLinks).map(([k, v]) => (
              <li
                key={k}
                className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-md bg-[var(--color-bg-elevated)] text-sm"
              >
                <span className="font-medium text-[var(--color-text-secondary)]">{k}</span>
                <span className="flex-1 truncate text-[var(--color-accent)]">{v}</span>
                <button
                  type="button"
                  onClick={() => removeSocialLink(k)}
                  aria-label={`Remove ${k}`}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Period & Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
            Period Start (Year)
          </label>
          <input
            type="number"
            value={form.periodStart}
            onChange={(e) => patch({ periodStart: e.target.value })}
            placeholder="2020"
            min={1990}
            max={2100}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
            Period End (Year)
          </label>
          <input
            type="number"
            value={form.periodEnd}
            onChange={(e) => patch({ periodEnd: e.target.value })}
            placeholder="2024"
            min={1990}
            max={2100}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
            Sort Order
          </label>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => patch({ sortOrder: Number(e.target.value) })}
            min={0}
            className={inputCls}
          />
        </div>
      </div>

      {/* isCurrent toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
        <button
          type="button"
          role="switch"
          aria-checked={form.isCurrent}
          onClick={() => patch({ isCurrent: !form.isCurrent })}
          className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1",
            form.isCurrent ? "bg-[var(--color-primary)]" : "bg-[var(--color-bg-elevated)]"
          )}
        >
          <span
            className={cn(
              "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
              form.isCurrent ? "translate-x-4" : "translate-x-1"
            )}
          />
        </button>
        <span className="text-sm text-[var(--color-text-primary)]">Currently active advisor</span>
      </label>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium",
            "border border-[var(--color-border)] text-[var(--color-text-secondary)]",
            "hover:bg-[var(--color-bg-elevated)] transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={saving || !form.name.trim() || !form.designation.trim()}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
            "bg-[var(--color-primary)] text-white",
            "hover:opacity-90 active:scale-95 transition-all",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          {saving ? (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          ) : (
            <Save size={15} aria-hidden="true" />
          )}
          {saving ? "Saving…" : "Save Advisor"}
        </button>
      </div>
    </div>
  );
}

// ─── AdvisorsTab ──────────────────────────────────────────────────────────────

function AdvisorsTab(): JSX.Element {
  const { data, isLoading, error } = useSWR<{ data: AdvisorEntry[] }>(
    "/api/admin/advisors",
    fetcher
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const advisors = data?.data ?? [];
  const currentAdvisors = advisors.filter((a) => a.isCurrent);
  const exAdvisors = advisors.filter((a) => !a.isCurrent);

  const handleSave = async (form: AdvisorFormState, isNew: boolean) => {
    setSaving(true);
    try {
      const method = isNew || !form.id ? "POST" : "PUT";
      const res = await fetch("/api/admin/advisors", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          periodStart: form.periodStart ? Number(form.periodStart) : null,
          periodEnd: form.periodEnd ? Number(form.periodEnd) : null,
          id: form.id || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to save" }));
        throw new Error(err.message || "Failed to save advisor");
      }

      await globalMutate("/api/admin/advisors");
      setEditingId(null);
      setAddingNew(false);
      toast(isNew ? "Advisor added" : "Advisor updated", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete advisor "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/admin/advisors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      await globalMutate("/api/admin/advisors");
      toast("Advisor deleted", "success");
    } catch {
      toast("Failed to delete advisor", "error");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={80} className="w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        variant="error"
        title="Failed to load advisors"
        message="Could not fetch advisor data. Please refresh and try again."
        className="mt-4"
      />
    );
  }

  const AdvisorRow = ({ advisor }: { advisor: AdvisorEntry }) => {
    const isEditing = editingId === advisor.id;
    return (
      <div
        className={cn(
          "rounded-xl border transition-colors",
          isEditing
            ? "border-[var(--color-primary)]/40 bg-[var(--color-bg-surface)]"
            : "border-[var(--color-border)] bg-[var(--color-bg-surface)] hover:border-[var(--color-primary)]/30"
        )}
      >
        {isEditing ? (
          <div className="p-0">
            <AdvisorForm
              initial={{
                id: advisor.id,
                name: advisor.name,
                designation: advisor.designation,
                institution: advisor.institution,
                photoUrl: advisor.photoUrl,
                bio: advisor.bio,
                researchInterests: advisor.researchInterests ?? [],
                email: advisor.email ?? "",
                socialLinks: advisor.socialLinks ?? {},
                isCurrent: advisor.isCurrent,
                periodStart: advisor.periodStart ? String(advisor.periodStart) : "",
                periodEnd: advisor.periodEnd ? String(advisor.periodEnd) : "",
                sortOrder: 0,
              }}
              onSave={(form) => handleSave(form, false)}
              onCancel={() => setEditingId(null)}
              saving={saving}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3">
            {advisor.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={advisor.photoUrl}
                alt={advisor.name}
                className="w-12 h-12 rounded-full object-cover border border-[var(--color-border)] flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-[var(--color-primary)]">
                  {advisor.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[var(--color-text-primary)] text-sm">
                  {advisor.name}
                </span>
                <Badge variant={advisor.isCurrent ? "success" : "neutral"} size="sm">
                  {advisor.isCurrent ? "Current" : "Ex-Advisor"}
                </Badge>
              </div>
              <div className="text-xs text-[var(--color-text-secondary)] truncate">
                {advisor.designation}
                {advisor.institution ? ` — ${advisor.institution}` : ""}
              </div>
              {advisor.researchInterests && advisor.researchInterests.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {advisor.researchInterests.slice(0, 3).map((r, i) => (
                    <span
                      key={i}
                      className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]"
                    >
                      {r}
                    </span>
                  ))}
                  {advisor.researchInterests.length > 3 && (
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      +{advisor.researchInterests.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => setEditingId(advisor.id)}
                aria-label={`Edit ${advisor.name}`}
                className={cn(
                  "p-2 rounded-lg text-[var(--color-text-secondary)]",
                  "hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10",
                  "transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                )}
              >
                <Pencil size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(advisor.id, advisor.name)}
                disabled={deletingId === advisor.id}
                aria-label={`Delete ${advisor.name}`}
                className={cn(
                  "p-2 rounded-lg text-[var(--color-text-secondary)]",
                  "hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10",
                  "transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {deletingId === advisor.id ? (
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 size={15} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Current Advisors */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
          Current Advisors
        </h3>
        <div className="space-y-2">
          {currentAdvisors.length === 0 && (
            <p className="text-sm text-[var(--color-text-secondary)] py-2">No current advisors.</p>
          )}
          {currentAdvisors.map((a) => (
            <AdvisorRow key={a.id} advisor={a} />
          ))}
        </div>
      </div>

      {/* Ex Advisors */}
      {exAdvisors.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Former Advisors
          </h3>
          <div className="space-y-2">
            {exAdvisors.map((a) => (
              <AdvisorRow key={a.id} advisor={a} />
            ))}
          </div>
        </div>
      )}

      {/* Add new advisor */}
      {addingNew ? (
        <AdvisorForm
          initial={emptyAdvisorForm()}
          onSave={(form) => handleSave(form, true)}
          onCancel={() => setAddingNew(false)}
          saving={saving}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setAddingNew(true);
          }}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
            "bg-[var(--color-primary)] text-white",
            "hover:opacity-90 active:scale-95 transition-all",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          <Plus size={15} aria-hidden="true" />
          Add Advisor
        </button>
      )}
    </div>
  );
}

// ─── CommitteeAdmin (main) ────────────────────────────────────────────────────

export function CommitteeAdmin(): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>("executive");

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: "executive",
      label: "Current Executive",
      icon: <UserCheck size={15} aria-hidden="true" />,
    },
    {
      id: "sub-executive",
      label: "Sub-Executive",
      icon: <Users size={15} aria-hidden="true" />,
    },
    {
      id: "ex-committee",
      label: "Ex-Committee",
      icon: <History size={15} aria-hidden="true" />,
    },
    {
      id: "advisors",
      label: "Advisors",
      icon: <BookOpen size={15} aria-hidden="true" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]">
          Committee Management
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Manage executive, sub-executive, ex-committee, and advisors. Drag to reorder.
        </p>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Committee sections"
        className="flex gap-1 p-1 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] overflow-x-auto"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={activeTab === tab.id}
            aria-controls={`committee-panel-${tab.id}`}
            id={`committee-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap",
              "transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              activeTab === tab.id
                ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div
        role="tabpanel"
        id={`committee-panel-${activeTab}`}
        aria-labelledby={`committee-tab-${activeTab}`}
      >
        {activeTab === "executive" && <CurrentCommitteeTab committeeType="executive" />}
        {activeTab === "sub-executive" && <CurrentCommitteeTab committeeType="sub-executive" />}
        {activeTab === "ex-committee" && <ExCommitteeTab />}
        {activeTab === "advisors" && <AdvisorsTab />}
      </div>
    </div>
  );
}