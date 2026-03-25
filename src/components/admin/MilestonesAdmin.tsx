// src/components/admin/MilestonesAdmin.tsx
"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Flag, Plus, Pencil, Trash2, X, Save, Loader2, Image as ImageIcon } from "lucide-react";

interface Milestone {
  id: string;
  date: string;
  title: string;
  description: string;
  imageUrl: string | null;
  sortOrder: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function MilestoneForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: Partial<Milestone>;
  onSave: (data: Partial<Milestone>) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    date: initial.date ?? "",
    title: initial.title ?? "",
    description: initial.description ?? "",
    imageUrl: initial.imageUrl ?? "",
    sortOrder: initial.sortOrder ?? 99,
  });

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
            Date * <span className="opacity-60">(display text, e.g. "March 2019")</span>
          </label>
          <input
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            placeholder="March 2019"
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
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Title *</label>
        <input
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Club Founded"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Description *</label>
        <textarea
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none"
          rows={3}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Brief description of this milestone"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Image URL (optional)</label>
        <input
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          value={form.imageUrl}
          onChange={(e) => set("imageUrl", e.target.value)}
          placeholder="https://res.cloudinary.com/..."
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
          onClick={() => onSave({ ...form, imageUrl: form.imageUrl || null })}
          disabled={saving || !form.title || !form.description || !form.date}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save
        </button>
      </div>
    </div>
  );
}

export function MilestonesAdmin(): JSX.Element {
  const { data, isLoading } = useSWR<{ data: Milestone[] }>("/api/admin/milestones", fetcher);
  const milestones = data?.data ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const revalidate = () => mutate("/api/admin/milestones");

  const handleCreate = async (form: Partial<Milestone>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/milestones", {
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

  const handleUpdate = async (id: string, form: Partial<Milestone>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/milestones", {
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
    if (!confirm("Delete this milestone? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await fetch("/api/admin/milestones", {
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
            <Flag size={24} className="text-[var(--color-accent)]" />
            Club Milestones
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Manage key milestones in the club's history displayed on the timeline.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(true); setEditingId(null); setError(null); }}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          <Plus size={16} /> Add Milestone
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 px-4 py-3 text-sm text-[var(--color-error)]">
          {error}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <MilestoneForm
          initial={{}}
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
          saving={saving}
        />
      )}

      {/* Timeline List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-[var(--color-text-secondary)]" />
        </div>
      ) : milestones.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Flag size={40} className="text-[var(--color-text-secondary)] opacity-40" />
          <p className="text-[var(--color-text-secondary)] text-sm">No milestones yet. Add your first one.</p>
        </div>
      ) : (
        <div className="relative space-y-3 pl-6 before:absolute before:left-2 before:top-0 before:bottom-0 before:w-px before:bg-[var(--color-border)]">
          {milestones.map((m) =>
            editingId === m.id ? (
              <MilestoneForm
                key={m.id}
                initial={m}
                onSave={(form) => handleUpdate(m.id, form)}
                onCancel={() => setEditingId(null)}
                saving={saving}
              />
            ) : (
              <div key={m.id} className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-[22px] top-4 h-3 w-3 rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-bg-surface)]" />
                <div className="flex items-start gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
                  {m.imageUrl && (
                    <img
                      src={m.imageUrl}
                      alt={m.title}
                      className="h-12 w-12 rounded-lg object-cover shrink-0 border border-[var(--color-border)]"
                    />
                  )}
                  {!m.imageUrl && (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
                      <ImageIcon size={18} className="text-[var(--color-text-secondary)] opacity-40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary)] font-mono">
                        {m.date}
                      </span>
                    </div>
                    <p className="font-semibold text-[var(--color-text-primary)] text-sm mt-1">{m.title}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-2">{m.description}</p>
                    <p className="text-[10px] text-[var(--color-text-secondary)] mt-1 opacity-60">Sort: {m.sortOrder}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => { setEditingId(m.id); setShowForm(false); setError(null); }}
                      className="rounded-lg p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)] transition-colors"
                      aria-label="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(m.id)}
                      disabled={deletingId === m.id}
                      className="rounded-lg p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)] transition-colors disabled:opacity-50"
                      aria-label="Delete"
                    >
                      {deletingId === m.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}