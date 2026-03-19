// src/components/members/Card.tsx
"use client";

import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useTransform } from "framer-motion";

import { cn, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Feedback";
import type { MemberPublic } from "@/types/index";
import type { BadgeVariant } from "@/types/ui";

// ─── Role Category → Badge Variant Mapping ────────────────────────────────────

function roleCategoryToVariant(category: string): BadgeVariant {
  switch (category.toLowerCase()) {
    case "executive":
      return "accent";
    case "sub-executive":
    case "sub_executive":
      return "primary";
    case "alumni":
      return "success";
    case "general":
    default:
      return "neutral";
  }
}

// ─── Avatar Image ─────────────────────────────────────────────────────────────

interface AvatarProps {
  src: string;
  alt: string;
  size: number;
  className?: string;
}

function AvatarImage({ src, alt, size, className }: AvatarProps): JSX.Element {
  const isDataUri = src.startsWith("data:");
  const [imgSrc, setImgSrc] = useState(src);

  return (
    <div
      className={cn("relative flex-shrink-0 overflow-hidden rounded-full", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={imgSrc}
        alt={alt}
        width={size}
        height={size}
        unoptimized={isDataUri}
        className="object-cover w-full h-full rounded-full"
        onError={() => {
          // Fallback to a placeholder on load error
          setImgSrc(`data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'%3E%3Crect width='${size}' height='${size}' fill='%231A2540' rx='${size / 2}'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%237B8DB0' font-size='${Math.round(size * 0.38)}' font-family='sans-serif'%3E%3F%3C/text%3E%3C/svg%3E`);
        }}
      />
    </div>
  );
}

// ─── Grid Card ────────────────────────────────────────────────────────────────

interface GridCardProps {
  member: MemberPublic;
  onClick: () => void;
}

function GridCard({ member, onClick }: GridCardProps): JSX.Element {
  const cardRef = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      // Limit tilt to ±12 degrees
      rotateX.set(-(deltaY / (rect.height / 2)) * 12);
      rotateY.set((deltaX / (rect.width / 2)) * 12);
    },
    [rotateX, rotateY]
  );

  const handleMouseLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
    setIsHovered(false);
  }, [rotateX, rotateY]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const badgeVariant = roleCategoryToVariant(member.role.category);

  return (
    <motion.div
      ref={cardRef}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        transformPerspective: 800,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={cn(
        "group relative rounded-lg bg-[var(--color-bg-surface)]",
        "border border-[var(--color-border)] overflow-hidden p-6 text-center",
        "transition-[border-color,box-shadow] duration-300 cursor-pointer",
        "hover:border-[var(--color-card-border-hover)] hover:shadow-[0_0_16px_var(--color-glow-accent)]"
      )}
      whileHover={{ translateY: -6 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      role="button"
      tabIndex={0}
      aria-label={`View profile of ${member.fullName}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Avatar */}
      <div className="flex justify-center mb-4">
        <div
          className={cn(
            "rounded-full border-2 border-[var(--color-border-accent)]",
            "transition-shadow duration-300 group-hover:shadow-[0_0_12px_var(--color-glow-accent)]"
          )}
        >
          <AvatarImage
            src={member.avatarUrl}
            alt={`${member.fullName} avatar`}
            size={80}
          />
        </div>
      </div>

      {/* Name */}
      <h3
        className={cn(
          "font-display font-bold text-base leading-tight mb-1.5",
          "text-[var(--color-text-primary)] truncate"
        )}
        title={member.fullName}
      >
        {member.fullName}
      </h3>

      {/* Role Badge */}
      <div className="flex justify-center mb-2">
        <Badge variant={badgeVariant} size="sm">
          {member.role.name}
        </Badge>
      </div>

      {/* Department */}
      <p
        className="text-xs text-[var(--color-text-secondary)] truncate mb-0.5"
        title={member.department.name}
      >
        {member.department.name}
      </p>

      {/* Session */}
      <p className="text-xs text-[var(--color-text-secondary)] font-mono">
        {member.session}
      </p>

      {/* View Profile Button */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="mt-4"
        aria-hidden={!isHovered}
      >
        <span
          className={cn(
            "inline-block px-4 py-1.5 rounded-md text-xs font-semibold",
            "bg-[var(--color-primary)] text-[var(--color-text-inverse)]",
            "transition-colors hover:bg-[var(--color-primary-hover)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          View Profile
        </span>
      </motion.div>
    </motion.div>
  );
}

// ─── List Card ────────────────────────────────────────────────────────────────

interface ListCardProps {
  member: MemberPublic;
  onClick: () => void;
}

function ListCard({ member, onClick }: ListCardProps): JSX.Element {
  const badgeVariant = roleCategoryToVariant(member.role.category);

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4",
        "bg-[var(--color-bg-surface)] rounded-lg",
        "border border-[var(--color-border)]",
        "transition-[border-color,box-shadow] duration-200 cursor-pointer",
        "hover:border-[var(--color-card-border-hover)] hover:shadow-[0_0_12px_var(--color-glow-accent)]"
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`View profile of ${member.fullName}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Avatar */}
      <AvatarImage
        src={member.avatarUrl}
        alt={`${member.fullName} avatar`}
        size={40}
        className="flex-shrink-0 border border-[var(--color-border-accent)]"
      />

      {/* Name + Role */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-display font-semibold text-sm text-[var(--color-text-primary)] truncate"
            title={member.fullName}
          >
            {member.fullName}
          </span>
          <Badge variant={badgeVariant} size="sm">
            {member.role.name}
          </Badge>
        </div>
        <p
          className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5"
          title={`${member.department.name} · ${member.session}`}
        >
          {member.department.name}
          <span className="mx-1 opacity-40">·</span>
          {member.session}
        </p>
      </div>

      {/* Member Since — desktop only */}
      <div className="hidden sm:flex flex-col items-end flex-shrink-0">
        <span className="text-xs text-[var(--color-text-secondary)]">
          Since
        </span>
        <span className="text-xs font-mono text-[var(--color-text-secondary)]">
          {formatDate(member.createdAt, "short")}
        </span>
      </div>

      {/* Profile Link */}
      <span
        className={cn(
          "flex-shrink-0 text-xs font-semibold",
          "text-[var(--color-accent)] hover:text-[var(--color-primary)]",
          "transition-colors duration-150 select-none"
        )}
        aria-hidden="true"
      >
        Profile →
      </span>
    </div>
  );
}

// ─── MemberCard ───────────────────────────────────────────────────────────────

interface MemberCardProps {
  member: MemberPublic;
  view: "grid" | "list";
}

export function MemberCard({ member, view }: MemberCardProps): JSX.Element {
  const router = useRouter();

  const handleClick = useCallback(() => {
    router.push(`/members/${member.username}`);
  }, [router, member.username]);

  if (view === "list") {
    return <ListCard member={member} onClick={handleClick} />;
  }

  return <GridCard member={member} onClick={handleClick} />;
}