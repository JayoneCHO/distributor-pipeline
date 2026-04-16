import { login } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  async function handleLogin(formData: FormData) {
    "use server";
    const ok = await login(String(formData.get("email") || ""), String(formData.get("password") || ""));
    if (!ok) return redirect("/login?error=1");
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <form action={handleLogin} className="w-full max-w-sm rounded-xl border bg-white p-6 shadow">
        <h2 className="mb-1 text-xl font-semibold">Admin Login</h2>
        <p className="mb-4 text-sm text-slate-500">Single-user MVP access</p>
        <div className="space-y-3">
          <div><label>Email</label><input name="email" type="email" defaultValue="admin@ruikd.local" required /></div>
          <div><label>Password</label><input name="password" type="password" defaultValue="admin1234" required /></div>
          <Button type="submit" className="w-full">Login</Button>
        </div>
      </form>
    </div>
  );
}
