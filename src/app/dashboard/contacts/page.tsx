import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createServerClient } from "@/lib/database/supabase-server";
import { getCurrentTenantId } from "@/domain/tenants/current";
import { ContactsClient } from "./contacts-client";

function NoTenantState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No tenant configured for this account</CardTitle>
        <CardDescription>
          Your account isn&apos;t linked to any tenant yet, so there&apos;s nothing to show here.
          Contact an administrator to be added to a tenant.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function ContactsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <NoTenantState />;
  }

  const tenantId = await getCurrentTenantId(user.id);

  if (!tenantId) {
    return <NoTenantState />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
        <p className="text-muted-foreground">
          Every number you&apos;ve called or been called by, plus anyone you add or upload — ready to
          use for outbound campaigns.
        </p>
      </div>

      <ContactsClient />
    </div>
  );
}
