import { type NextRequest } from "next/server";

import { handleEmailLink } from "@/lib/auth-callback";

// Confirmation d'adresse à l'inscription. Chemin exact, sans paramètre : c'est
// lui qui doit figurer dans les Redirect URLs du dashboard Supabase.
export async function GET(request: NextRequest) {
  return handleEmailLink(request, {
    onSuccess: "/bikes",
    onFailure: "/login?message=lien-invalide",
  });
}
