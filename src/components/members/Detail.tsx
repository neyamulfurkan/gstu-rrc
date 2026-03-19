// src/components/members/Detail.tsx
"use client";

import type { MemberPrivate, MemberPublic } from "@/types/index";

interface MemberDetailProps {
  member: MemberPublic | MemberPrivate;
  isOwner: boolean;
}

export function MemberDetail({ member, isOwner }: MemberDetailProps): JSX.Element {
  return (
    <div className="max-w-4xl mx-auto w-full">
      <p className="text-[var(--color-text-secondary)] text-sm">
        Profile for {member.fullName}
      </p>
    </div>
  );
}