"use client";

import dynamic from "next/dynamic";

const DashboardShell = dynamic(
  () => import("@/components/dashboard/DashboardShell"),
  { ssr: false }
);

export default function DashboardClient() {
  return <DashboardShell />;
}
