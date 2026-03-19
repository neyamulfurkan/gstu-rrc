// src/components/members/Detail.tsx
"use client";

import type { MemberPrivate, MemberPublic } from "@/types/index";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileTabs } from "@/components/profile/ProfileTabs";

interface MemberDetailProps {
  member: MemberPublic | MemberPrivate;
  isOwner: boolean;
}

export function MemberDetail({ member, isOwner }: MemberDetailProps): JSX.Element {
  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <ProfileHeader member={member} isOwner={isOwner} />
      <ProfileTabs member={member as MemberPublic} isOwner={isOwner} />
    </div>
  );
}