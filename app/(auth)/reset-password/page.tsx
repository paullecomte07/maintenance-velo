import Link from "next/link";

import { ResetPasswordForm } from "./reset-password-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

// On arrive ici après /auth/callback, qui a échangé le jeton du mail contre
// une session. Pas de session = le lien était expiré, déjà utilisé, ou ouvert
// dans un autre navigateur que celui qui a fait la demande.
export default async function ResetPasswordPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Ce lien n&apos;est plus valable</CardTitle>
          <CardDescription>
            Un lien de réinitialisation expire et ne sert qu&apos;une fois. Il
            doit aussi être ouvert depuis le navigateur qui a fait la demande.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex-col gap-3">
          <Button className="w-full" asChild>
            <Link href="/forgot-password">Demander un nouveau lien</Link>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/login">Retour à la connexion</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return <ResetPasswordForm />;
}
