"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import { ApiError, getCase } from "@/lib/api";
import { uiCase, uiClient } from "@/lib/adapters";
import { useAuthGuard } from "@/lib/useAuthGuard";
import type { Case, Client } from "@/lib/data";

export default function CaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ready = useAuthGuard();
  const params = useParams<{ caseId: string }>();
  const [ctx, setCtx] = useState<{ client: Client; kase: Case } | null>(null);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    getCase(params.caseId)
      .then((k) => {
        if (alive && k.client)
          setCtx({ client: uiClient(k.client), kase: uiCase(k) });
      })
      .catch((e) => {
        if (alive)
          console.error(
            "Failed to load case:",
            e instanceof ApiError ? e.message : e,
          );
      });
    return () => {
      alive = false;
    };
  }, [ready, params.caseId]);

  if (!ready) return null;

  return (
    <Shell client={ctx?.client} kase={ctx?.kase}>
      {children}
    </Shell>
  );
}
