"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasLiveSession } from "./api";

/**
 * Real session guard: a JWT in localStorage whose exp claim hasn't passed.
 *
 * Hydration-safe on purpose: the server can't read localStorage, so the
 * FIRST client render must also not read it (useState initializer runs
 * during hydration — reading there makes server and client disagree and
 * React throws a hydration error). Instead we start "unknown", render
 * nothing (matching the server), then settle in an effect after mount.
 */
export function useAuthGuard() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null); // null = not yet known

  useEffect(() => {
    setAuthed(hasLiveSession());
  }, []);

  useEffect(() => {
    if (authed === false) router.replace("/login");
  }, [authed, router]);

  return authed === true;
}
