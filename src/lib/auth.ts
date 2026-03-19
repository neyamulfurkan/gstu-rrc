// src/lib/auth.ts

import NextAuth, { type Session, type DefaultSession } from "next-auth";
import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";

declare module "next-auth" {
  interface Session {
    user: {
      userId: string;
      email: string;
      username: string;
      fullName: string;
      avatarUrl: string;
      isAdmin: boolean;
      adminRole: string | null;
      permissions: Record<string, boolean>;
    } & DefaultSession["user"];
  }
}

// JWT type augmentation skipped — next-auth/jwt module augmentation not supported in this version

const authConfig: NextAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<{
        id: string;
        email: string;
        username: string;
        fullName: string;
        avatarUrl: string;
        isAdmin: boolean;
        adminRole: string | null;
        permissions: Record<string, boolean>;
      } | null> {
        if (
          !credentials?.identifier ||
          !credentials?.password ||
          typeof credentials.identifier !== "string" ||
          typeof credentials.password !== "string"
        ) {
          return null;
        }

        const identifier = credentials.identifier.trim().toLowerCase();
        const password = credentials.password as string;

        let member: {
          id: string;
          email: string;
          username: string;
          passwordHash: string;
          fullName: string;
          avatarUrl: string;
          isAdmin: boolean;
          adminRoleId: string | null;
          status: string;
          adminRole: {
            permissions: unknown;
            name: string;
          } | null;
        } | null = null;

        try {
          member = await prisma.member.findFirst({
            where: {
              OR: [
                { email: identifier },
                { username: identifier },
              ],
            },
            select: {
              id: true,
              email: true,
              username: true,
              passwordHash: true,
              fullName: true,
              avatarUrl: true,
              isAdmin: true,
              adminRoleId: true,
              status: true,
              adminRole: {
                select: {
                  permissions: true,
                  name: true,
                },
              },
            },
          });
        } catch (error) {
          console.error("[auth] Database error during authorize:", error);
          return null;
        }

        if (!member) {
          return null;
        }

        if (member.status !== "active") {
          return null;
        }

        let passwordMatch = false;
        try {
          passwordMatch = await bcryptjs.compare(password, member.passwordHash);
        } catch (error) {
          console.error("[auth] bcrypt compare error:", error);
          return null;
        }

        if (!passwordMatch) {
          return null;
        }

        let permissions: Record<string, boolean> = {};
        if (member.adminRole?.permissions) {
          const raw = member.adminRole.permissions;
          if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
            permissions = raw as Record<string, boolean>;
          }
        }

        return {
          id: member.id,
          email: member.email,
          username: member.username,
          fullName: member.fullName,
          avatarUrl: member.avatarUrl,
          isAdmin: member.isAdmin,
          adminRole: member.adminRole?.name ?? null,
          permissions,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          id: string;
          email: string;
          username: string;
          fullName: string;
          avatarUrl: string;
          isAdmin: boolean;
          adminRole: string | null;
          permissions: Record<string, boolean>;
        };

        token.userId = u.id;
        token.email = u.email;
        token.username = u.username;
        token.fullName = u.fullName;
        token.avatarUrl = u.avatarUrl;
        token.isAdmin = u.isAdmin;
        token.adminRole = u.adminRole;
        token.permissions = u.permissions;
      }

      return token;
    },

    async session({ session, token }) {
      session.user.userId = token.userId as string;
      session.user.email = (token.email as string) ?? "";
      session.user.username = token.username as string;
      session.user.fullName = token.fullName as string;
      session.user.avatarUrl = token.avatarUrl as string;
      session.user.isAdmin = token.isAdmin as boolean;
      session.user.adminRole = (token.adminRole as string | null) ?? null;
      session.user.permissions = (token.permissions as Record<string, boolean>) ?? {};

      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export type { Session };