import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/auth/login-form";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/");
  }
  return <LoginScreen />;
}
