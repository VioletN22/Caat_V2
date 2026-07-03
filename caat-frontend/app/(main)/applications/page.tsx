import { PageHeader } from "@/components/PageHeader";
import ApplicationsClient from "./client";

// C8 note: unlike profile/documents/essays, the applications list is left
// client-fetched. Its cards render time-relative deadline countdowns
// (new Date() at render), which legitimately differ between the server and the
// client's timezone/clock and produce an intermittent hydration mismatch when
// server-rendered. Keeping the fetch client-side avoids that.
export default function ApplicationsPage() {
  return (
    <>
      <PageHeader title="Applications" />
      <ApplicationsClient />
    </>
  );
}
