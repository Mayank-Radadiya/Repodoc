import type { ReactNode } from "react";
import type { Session } from "next-auth";
import { SessionContext, type SessionContextValue } from "next-auth/react";
import { render } from "@testing-library/react";

export const session: Session = {
  expires: "2099-01-01T00:00:00.000Z",
  user: {
    id: "user-id",
    githubId: "123",
    username: "octocat",
    name: "The Octocat",
    image: "https://avatars.githubusercontent.com/u/123",
  },
};

const update = async () => null;

export function TestAuthSession({
  children,
  status = "unauthenticated",
  userSession = session,
}: {
  children: ReactNode;
  status?: SessionContextValue["status"];
  userSession?: Session;
}) {
  const value: SessionContextValue =
    status === "authenticated"
      ? { data: userSession, status, update }
      : { data: null, status, update };
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function renderSignedOut(ui: ReactNode) {
  return render(ui, { wrapper: TestAuthSession });
}
