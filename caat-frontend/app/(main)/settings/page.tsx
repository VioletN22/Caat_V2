import type { Metadata } from "next";
import { DataAccountSection } from "./client";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your CAAT account, export your data, or delete your account.",
};

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your data and account.
        </p>
      </header>

      <DataAccountSection />
    </div>
  );
}
