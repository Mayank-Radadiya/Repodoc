"use client";

import { useId, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { LogIn, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { cn } from "@/lib/utils";

export interface AuthControlsProps {
  onPhoto?: boolean;
  portalContainer?: HTMLElement | null;
}

export function AuthControls({
  onPhoto = false,
  portalContainer,
}: AuthControlsProps) {
  const { data: session, status } = useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const errorId = useId();

  async function authenticate(action: "signin" | "signout") {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      // Construct from this page, never a caller-supplied redirect parameter.
      const redirectTo = window.location.href;
      if (action === "signin") {
        await signIn("github", { redirectTo });
      } else {
        await signOut({ redirectTo });
      }
      // Success redirects through Auth.js. Keep controls locked until navigation.
    } catch {
      setError(
        action === "signin"
          ? "Unable to sign in. Please try again."
          : "Unable to sign out. Please try again.",
      );
      submitting.current = false;
      setPending(false);
    }
  }

  const controlClass = cn(
    "min-h-11",
    onPhoto && "border-white/40 bg-white/10 text-white hover:bg-white/20",
  );
  const user = status === "authenticated" ? session.user : null;

  return (
    <div className="relative flex w-11 shrink-0 justify-end sm:w-44">
      {status === "loading" ? (
        <span
          role="status"
          className="inline-flex h-11 w-11 items-center justify-center sm:w-44"
        >
          <span className="sr-only">Checking sign-in status…</span>
          <span
            aria-hidden="true"
            className={cn(
              "size-8 rounded-full bg-muted motion-safe:animate-pulse",
              onPhoto && "bg-white/20",
            )}
          />
        </span>
      ) : user ? (
        <Menu>
          <MenuTrigger
            render={
              <Button
                variant="outline"
                className={cn(controlClass, "size-11 p-1")}
              />
            }
            aria-label={`Account menu for ${user.username}`}
            aria-describedby={error ? errorId : undefined}
            disabled={pending}
          >
            <Avatar>
              <AvatarImage src={user.image ?? undefined} alt="" keepMounted />
              <AvatarFallback>
                {user.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </MenuTrigger>
          <MenuPopup
            align="end"
            className="w-60"
            portalProps={{ container: portalContainer ?? undefined }}
          >
            <MenuGroup>
              <MenuGroupLabel className="break-all px-3 py-2">
                Signed in as @{user.username}
              </MenuGroupLabel>
              <MenuSeparator />
              <MenuItem
                className="min-h-11 cursor-pointer px-3"
                disabled={pending}
                onClick={() => void authenticate("signout")}
              >
                <LogOut aria-hidden="true" />
                Sign out
              </MenuItem>
            </MenuGroup>
          </MenuPopup>
        </Menu>
      ) : (
        <Button
          variant="outline"
          className={cn(controlClass, "w-11 px-0 sm:w-44 sm:px-3")}
          loading={pending}
          aria-describedby={error ? errorId : undefined}
          onClick={() => void authenticate("signin")}
        >
          <LogIn aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Sign in with GitHub</span>
        </Button>
      )}
      {pending && (
        <span role="status" className="sr-only">
          {user ? "Signing out…" : "Signing in…"}
        </span>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="absolute right-0 top-full z-10 mt-2 w-60 rounded-lg border border-border bg-popover p-3 text-sm text-popover-foreground shadow-lg"
        >
          {error}
        </p>
      )}
    </div>
  );
}
