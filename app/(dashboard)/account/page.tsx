import { redirect } from "next/navigation";

import { ChangePasswordForm } from "./change-password-form";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mon compte</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Adresse email</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mot de passe</CardTitle>
          <CardDescription>
            Le mot de passe actuel est redemandé pour valider le changement.
          </CardDescription>
        </CardHeader>
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
