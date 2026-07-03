import { PageHeader } from "@/components/PageHeader";
import DocumentVaultClient from "./client";
import { createServerClient } from "@/lib/supabase/server";
import type { DocumentRow } from "./api";

// C8: resolve the documents list on the server for an instant first paint.
async function fetchDocumentsServer(): Promise<DocumentRow[] | null> {
  const sb = await createServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data, error } = await sb
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .order("uploaded_at", { ascending: false });
  if (error) return null;
  return (data ?? []) as DocumentRow[];
}

export default async function DocumentsPage() {
  const initialDocs = await fetchDocumentsServer();
  return (
    <>
      <PageHeader title="Documents" />
      <DocumentVaultClient initialDocs={initialDocs} />
    </>
  );
}
