import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/settings";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const isDemo = isDemoMode();
  
  if (isDemo) {
    return <LoginForm isDemo={true} />;
  }

  let userCount = 0;
  try {
    userCount = await db.user.count();
  } catch (e: any) {
    if (e.code === 'P2021') { // Table does not exist
      redirect("/setup");
    }
    throw e;
  }

  if (userCount === 0) {
    redirect("/setup");
  }

  return <LoginForm isDemo={false} />;
}
