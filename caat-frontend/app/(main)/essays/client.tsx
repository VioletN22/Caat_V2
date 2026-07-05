"use client";

import dynamic from "next/dynamic";
import type { EssayPrompt } from "@/components/essays/api";

const EssaysShell = dynamic(
  () => import("@/components/essays/EssaysShell"),
  { ssr: false }
);

export default function EssaysClient({
  initialPrompts,
}: {
  initialPrompts?: EssayPrompt[] | null;
}) {
  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <EssaysShell initialPrompts={initialPrompts} />
      </div>
    </div>
  );
}
