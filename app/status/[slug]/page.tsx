import { getStatusPage } from "../actions";
import { notFound } from "next/navigation";
import StatusPageClient from "../components/StatusPageClient";

// Revalidate every 60 seconds
export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function StatusPage({ params }: PageProps) {
  const { slug }  = await params;
  const data = await getStatusPage(slug);

  if (!data) {
    notFound();
  }

  return <StatusPageClient data={data} />;
}
