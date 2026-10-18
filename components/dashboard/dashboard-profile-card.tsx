"use client";

import { ExternalLink } from "lucide-react";
import type { UserProfileData } from "@/lib/dashboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import styles from "./dashboard.module.css";

export interface DashboardProfileCardProps {
  user: UserProfileData;
}

export function DashboardProfileCard({ user }: DashboardProfileCardProps) {
  return (
    <a
      href={user.githubUrl}
      target="_blank"
      rel="noreferrer"
      className={styles.identity}
      aria-label={`View GitHub profile for ${user.name || user.username}`}
    >
      <Avatar className={styles.avatar}>
        <AvatarImage src={user.avatarUrl} alt="" />
        <AvatarFallback>
          {user.username.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className={styles.identityText}>
        <span className={styles.identityName}>
          {user.name || user.username}
        </span>
        <span className={styles.secondary}>@{user.username}</span>
      </span>
      <ExternalLink size={14} aria-hidden="true" />
    </a>
  );
}
