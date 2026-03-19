// src/components/home/RecentProjectsSection.tsx
"use client";

import { useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Layers } from "lucide-react";
import Link from "next/link";

import { Modal } from "@/components/ui/Overlay";
import { ProjectCard } from "@/components/projects/Card";
import { ProjectDetail } from "@/components/projects/Detail";
import type { ProjectCard as ProjectCardType } from "@/types/index";

// ─── Animation Variants ───────────────────────────────────────────────────────

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 90, damping: 20 },
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface RecentProjectsSectionProps {
  projects: ProjectCardType[];
}

export function RecentProjectsSection({
  projects,
}: RecentProjectsSectionProps): JSX.Element {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const displayProjects = projects.slice(0, 3);

  function handleClose(): void {
    setSelectedProjectId(null);
  }

  return (
    <section
      aria-labelledby="recent-projects-heading"
      className="py-16 md:py-24 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto w-full"
    >
      {/* ── Section Header ── */}
      <div className="flex items-end justify-between mb-10 gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest"
              style={{
                color: "var(--color-accent)",
                backgroundColor: "var(--color-accent-muted)",
                border: "1px solid var(--color-accent-subtle)",
              }}
            >
              <Layers size={11} aria-hidden="true" />
              Projects
            </span>
          </div>
          <h2
            id="recent-projects-heading"
            className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Recent Projects
          </h2>
        </div>

        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)] rounded-md px-1 py-0.5 transition-colors duration-150 whitespace-nowrap"
          aria-label="See all projects"
        >
          See All
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>

      {/* ── Projects Grid ── */}
      {displayProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-secondary)]">
          <Layers size={40} className="mb-4 opacity-40" aria-hidden="true" />
          <p className="text-sm">No projects to display yet.</p>
        </div>
      ) : (
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className={
            displayProjects.length >= 2
              ? // Desktop: asymmetric magazine grid; mobile: single column stack
                "hidden md:grid gap-4"
              : "flex flex-col gap-4"
          }
          style={
            displayProjects.length >= 2
              ? {
                  gridTemplateColumns: "3fr 2fr",
                  gridTemplateRows: "auto auto",
                }
              : undefined
          }
        >
          {displayProjects.map((project, index) => {
            const isFirst = index === 0;
            const isSecond = index === 1;
            const isThird = index === 2;

            return (
              <motion.div
                key={project.id}
                variants={cardVariants}
                className="hidden md:block"
                style={
                  displayProjects.length >= 2
                    ? {
                        gridColumn: isFirst ? "1" : "2",
                        gridRow: isFirst
                          ? "1 / span 2"
                          : isSecond
                          ? "1"
                          : isThird
                          ? "2"
                          : "auto",
                      }
                    : undefined
                }
              >
                <ProjectCard
                  project={project}
                  onClick={() => setSelectedProjectId(project.id)}
                />
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Mobile: flex column (visible only on mobile) */}
      {displayProjects.length > 0 && (
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="flex flex-col gap-4 md:hidden"
        >
          {displayProjects.map((project) => (
            <motion.div key={project.id} variants={cardVariants}>
              <ProjectCard
                project={project}
                onClick={() => setSelectedProjectId(project.id)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── See All Button (mobile) ── */}
      {displayProjects.length > 0 && (
        <div className="flex justify-center mt-10 md:hidden">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-base)]"
            style={{
              backgroundColor: "var(--color-accent-muted)",
              color: "var(--color-accent)",
              border: "1px solid var(--color-accent-subtle)",
            }}
          >
            See All Projects
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* ── Project Detail Modal ── */}
      <AnimatePresence>
        {selectedProjectId !== null && (
          <Modal
            isOpen={true}
            onClose={handleClose}
            size="xl"
            showCloseButton={false}
            className="overflow-hidden"
          >
            <ProjectDetail
              projectId={selectedProjectId}
              onClose={handleClose}
            />
          </Modal>
        )}
      </AnimatePresence>
    </section>
  );
}