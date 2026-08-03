import { type NextRequest } from "next/server";

import { handleEmailLink } from "@/lib/auth-callback";

// Réinitialisation de mot de passe. Un chemin distinct plutôt qu'un paramètre
// sur /auth/callback : la destination doit être un chemin exact pour que la
// liste blanche de Supabase la reconnaisse à coup sûr.
//
// L'échec renvoie sur /reset-password sans session, qui explique alors que le
// lien n'est plus valable et propose d'en redemander un.
export async function GET(request: NextRequest) {
  return handleEmailLink(request, {
    onSuccess: "/reset-password",
    onFailure: "/reset-password",
  });
}
