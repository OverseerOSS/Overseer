import { getStatusPage } from "./actions";
import StatusPageClient from "./components/StatusPageClient";

// Revalidate every 60 seconds
export const revalidate = 60;

export default async function StatusPage() {
  const data = await getStatusPage(); // No slug = main page logic

  if (!data) {
     return <div>System status unavailable.</div>
  }

  return <StatusPageClient data={data} />;
}

