import { PageHeader } from "@/components/PageHeader";
import ApplicationHubClient from "./client";

export default async function ApplicationHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <PageHeader title="Applications" />
      <ApplicationHubClient applicationId={id} />
    </>
  );
}
