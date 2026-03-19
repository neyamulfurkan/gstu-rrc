"use client";

import React, { useState, useCallback } from "react";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { EditProfileForm } from "@/components/profile/EditProfileForm";
import { Modal } from "@/components/ui/Overlay";
import { useRouter } from "next/navigation";
import type { MemberPrivate, MemberPublic } from "@/types/index";

interface ProfilePageClientProps {
  member: MemberPrivate;
  isOwner?: boolean;
}

export function ProfilePageClient({
  member: initialMember,
  isOwner = true,
}: ProfilePageClientProps): JSX.Element {
  const [member, setMember] = useState<MemberPrivate>(initialMember);
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

  const handleSave = useCallback((updated: MemberPublic) => {
    setMember((prev) => ({
      ...prev,
      fullName: updated.fullName ?? prev.fullName,
      avatarUrl: updated.avatarUrl ?? prev.avatarUrl,
      coverUrl: updated.coverUrl ?? prev.coverUrl,
      bio: updated.bio ?? prev.bio,
      skills: updated.skills ?? prev.skills,
      socialLinks: updated.socialLinks ?? prev.socialLinks,
      interests: updated.interests ?? prev.interests,
      workplace: updated.workplace ?? prev.workplace,
    }));
    setEditOpen(false);
    router.refresh();
  }, [router]);

  const memberPublic: MemberPublic = {
    id: member.id,
    username: member.username,
    fullName: member.fullName,
    avatarUrl: member.avatarUrl,
    coverUrl: member.coverUrl,
    bio: member.bio,
    skills: member.skills,
    socialLinks: member.socialLinks,
    interests: member.interests,
    workplace: member.workplace,
    session: member.session,
    memberType: member.memberType,
    createdAt: member.createdAt,
    department: member.department,
    role: member.role,
  };

  return (
    <>
      <div className="min-h-screen bg-[var(--color-bg-base)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pt-28 lg:pt-24 space-y-6">
          <ProfileHeader
            member={member}
            isOwner={isOwner}
            onEditClick={isOwner ? () => setEditOpen(true) : undefined}
          />
          <ProfileTabs member={memberPublic} isOwner={isOwner} />
        </div>
      </div>

      {isOwner && (
        <Modal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          title="Edit Profile"
          size="lg"
          closeOnBackdrop={false}
        >
          <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
            <EditProfileForm
              member={member}
              onClose={() => setEditOpen(false)}
              onSave={handleSave}
            />
          </div>
        </Modal>
      )}
    </>
  );
}