import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { siteOrigin } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

// Échange le jeton porté par un lien reçu par email contre une session.
//
// Les destinations sont des littéraux fournis par la route appelante, jamais
// lues dans l'URL : Supabase compare l'adresse de retour à sa liste blanche,
// et une chaîne de requête y rendrait la correspondance incertaine. En cas de
// non-correspondance, Supabase ne signale rien — il redirige vers la Site URL,
// soit exactement le symptôme qu'on cherche à supprimer.
export async function handleEmailLink(
  request: NextRequest,
  { onSuccess, onFailure }: { onSuccess: string; onFailure: string }
) {
  const origin = siteOrigin();
  const { searchParams } = new URL(request.url);
  const supabase = createClient();

  // Deux formes selon la configuration des templates Supabase : token_hash
  // (indépendant du navigateur) ou code PKCE (lié à celui qui a fait la
  // demande). On accepte les deux plutôt que de parier sur l'une.
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}${onSuccess}`);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${onSuccess}`);
  }

  // Lien expiré, déjà utilisé, ou ouvert dans un autre navigateur que celui
  // qui a fait la demande.
  return NextResponse.redirect(`${origin}${onFailure}`);
}
