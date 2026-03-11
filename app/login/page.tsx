import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/settings";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const isDemo = isDemoMode();
  
  if (isDemo) {
    redirect("/");
  }

  if (!process.env.DATABASE_URL) {
    redirect("/setup");
  }

  let userCount = 0;
  try {
    userCount = await db.user.count();
  } catch (e: any) {
    if (e.code === 'P2021') { // Table does not exist
      redirect("/setup");
    }
    if (typeof e?.message === "string" && e.message.includes("DATABASE_URL")) {
      redirect("/setup");
    }
    redirect("/setup");
  }

  if (userCount === 0) {
    redirect("/setup");
  }

  return <LoginForm />;
}
