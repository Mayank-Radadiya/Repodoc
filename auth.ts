import "server-only";
import NextAuth from "next-auth";
import { getAuthConfig } from "@/lib/auth/config";

export const { handlers, auth, signIn, signOut } = NextAuth(() => getAuthConfig());
