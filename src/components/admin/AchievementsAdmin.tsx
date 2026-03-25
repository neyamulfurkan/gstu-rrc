// src/components/admin/AchievementsAdmin.tsx
"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Trophy, Plus, Pencil, Trash2, X, Save, Loader2, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  year: number;
  link: string | null;
  sortOrder: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CURRENT_YEAR = new Date().getFullYear();

function AchievementForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: Partial<Achievement>;
  onSave: (data: Partial<Achievement>) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    icon: initial.icon ?? "Trophy",
    title: initial.title ?? "",
    description: initial.description ?? "",
    year: initial.year ?? CURRENT_YEAR,
    link: initial.link ?? "",
    sortOrder: initial.sortOrder ?? 99,
  });

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Title *</label>
          <input
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. National Robotics Championship"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Year *</label>
          <input
            type="number"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            value={form.year}
            min={2000}
            max={CURRENT_YEAR + 5}
            onChange={(e) => set("year", parseInt(e.target.value, 10))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Icon name (Lucide)</label>
          <input
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            value={form.icon}
            onChange={(e) => set("icon", e.target.value)}
            placeholder="Trophy"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Sort Order</label>
          <input
            type="number"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            value={form.sortOrder}
            min={0}
            onChange={(e) => set("sortOrder", parseInt(e.target.value, 10))}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Description *</label>
        <textarea
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none"
          rows={3}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Brief description of this achievement"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Link (optional)</label>
        <input
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          value={form.link}
          onChange={(e) => set("link", e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)] transition-colors"
        >
          <X size={14} /> Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={saving || !form.title || !form.description}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save
        </button>
      </div>
    </div>
  );
}

export function AchievementsAdmin(): JSX.Element {
  const { data, isLoading } = useSWR<{ data: Achievement[] }>("/api/admin/achievements", fetcher);
  const achievements = data?.data ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const revalidate = () => mutate("/api/admin/achievements");

  const handleCreate = async (form: Partial<Achievement>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to create");
        return;
      }
      setShowForm(false);
      revalidate();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, form: Partial<Achievement>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/achievements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...form }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to update");
        return;
      }
      setEditingId(null);
      revalidate();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this achievement? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await fetch("/api/admin/achievements", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      revalidate();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)] flex items-center gap-3">
            <Trophy size={24} className="text-[var(--color-accent)]" />
            Achievements
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Manage club achievements and awards displayed on the public site.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(true); setEditingId(null); setError(null); }}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          <Plus size={16} /> Add Achievement
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 px-4 py-3 text-sm text-[var(--color-error)]">
          {error}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <AchievementForm
          initial={{}}
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
          saving={saving}
        />
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-[var(--color-text-secondary)]" />
        </div>
      ) : achievements.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Trophy size={40} className="text-[var(--color-text-secondary)] opacity-40" />
          <p className="text-[var(--color-text-secondary)] text-sm">No achievements yet. Add your first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {achievements.map((a) =>
            editingId === a.id ? (
              <AchievementForm
                key={a.id}
                initial={a}
                onSave={(form) => handleUpdate(a.id, form)}
                onCancel={() => setEditingId(null)}
                saving={saving}
              />
            ) : (
              <div
                key={a.id}
                className="flex items-start gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-lg font-bold">
                  {a.icon?.charAt(0) ?? "🏆"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[var(--color-text-primary)] text-sm">{a.title}</span>
                    <span className="rounded-full bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
                      {a.year}
                    </span>
                    {a.link && (
                      <a href={a.link} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline" title="View link">
                        <LinkIcon size={12} />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-2">{a.description}</p>
                  <p className="text-[10px] text-[var(--color-text-secondary)] mt-1 opacity-60">Sort: {a.sortOrder} · Icon: {a.icon}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setEditingId(a.id); setShowForm(false); setError(null); }}
                    className="rounded-lg p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)] transition-colors"
                    aria-label="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    disabled={deletingId === a.id}
                    className="rounded-lg p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)] transition-colors disabled:opacity-50"
                    aria-label="Delete"
                  >
                    {deletingId === a.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}