import Link from "next/link";
import Image from "next/image";
import { cn, cloudinaryUrl } from "@/lib/utils";

interface PlatformArchitectureProps {
  architect: { username: string; fullName: string; avatarUrl: string; roleName: string } | null;
}

const SUBSYSTEMS = [
  "AI Integration", "Member Management System", "Event Infrastructure",
  "Research Showcase", "Admin & Super Admin Panels", "Cloud Media Pipeline",
];

export function PlatformArchitecture({ architect }: PlatformArchitectureProps): JSX.Element | null {
  if (!architect) return null;
  const avatarUrl = architect.avatarUrl ? cloudinaryUrl(architect.avatarUrl, { width: 64, height: 64 }) : null;

  return (
    <section aria-labelledby="platform-architecture-heading" className="py-20 px-6 bg-[var(--color-bg-surface)] border-t border-[var(--color-border)]">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)] font-[var(--font-mono)]">Under the Hood</span>
          <h2 id="platform-architecture-heading" className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)] font-[var(--font-display)]">Platform Architecture</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
          {SUBSYSTEMS.map((s) => (
            <div key={s} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-base)] px-4 py-3 text-xs font-medium text-[var(--color-text-secondary)] text-center">{s}</div>
          ))}
        </div>
        <Link href={`/members/${architect.username}`} className={cn(
          "flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)] p-5 max-w-md mx-auto transition-all duration-200",
          "hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        )}>
          <div className="relative w-14 h-14 flex-shrink-0 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
            {avatarUrl ? <Image src={avatarUrl} alt={architect.fullName} fill sizes="56px" className="object-cover" /> :
              <div className="w-full h-full flex items-center justify-center font-bold text-[var(--color-text-secondary)] font-[var(--font-display)]">{architect.fullName.charAt(0)}</div>}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[var(--color-text-secondary)] mb-0.5">Designed &amp; engineered by</p>
            <p className="text-sm font-semibold text-[var(--color-text-primary)] font-[var(--font-heading)] truncate">{architect.fullName}</p>
            <p className="text-xs text-[var(--color-accent)] mt-0.5">{architect.roleName}</p>
          </div>
        </Link>
      </div>
    </section>
  );
}