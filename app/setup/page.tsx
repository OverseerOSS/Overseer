import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/settings";
import SetupWizard from "./setup-wizard";

export default async function SetupPage() {
  if (isDemoMode()) {
    return <SetupWizard />;
  }

  let userCount = 0;

  try {
    userCount = await db.user.count();
  } catch (e: any) {
    // If the table doesn't exist or DB is unreachable, we assume setup is needed
    // The SetupWizard handles migration running
    console.log("Database check failed, assuming clean install:", e.message);
    return <SetupWizard />;
  }

  if (userCount > 0) {
    redirect("/login");
  }

  return <SetupWizard />;
}
