import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";

export default async function SettingsPage() {
  await requireAuth();

  return (
    <AppShell>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>Admin settings (MVP)</CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Single admin account is controlled by environment variables.</p>
            <p><b>ADMIN_EMAIL</b> and <b>ADMIN_PASSWORD</b> can be changed without DB migrations.</p>
            <p>Future multi-user support is prepared via Prisma <b>User</b> model and relation-ready records.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>Future integrations</CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Gmail sync route placeholder: <code>/api/integrations/gmail</code></p>
            <p>Calendar sync route placeholder: <code>/api/integrations/calendar</code></p>
            <p>Attachment model is already included for brochure/quotation file workflows.</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
