"use client";

import dynamic from "next/dynamic";

const EssaysShell = dynamic(
  () => import("@/components/essays/EssaysShell"),
  { ssr: false }
);

export default function EssaysClient() {
  return <EssaysShell />;
}
