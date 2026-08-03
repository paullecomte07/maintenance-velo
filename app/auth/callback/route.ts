import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { siteOrigin } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

// Point d'atterrissage des liens envoyés par email : confirmation d'inscription
// et réinitialisation de mot de passe. Ces liens ne valent pas session par
// eux-mêmes — ils portent un jeton qu'il faut échanger ici. Sans cette route,
// on atterrissait sur la page d'accueil, déconnecté et sans rien à faire.
export async function GET(request: NextRequest) {
  const origin = siteOrigin();
  const { searchParams } = new URL(request.url);

  // `next` vient de l'URL : on n'accepte qu'un chemin interne, sinon le lien
  // de réinitialisation devient un tremplin de redirection ouverte.
  const requested = searchParams.get("next") ?? "/bikes";
  const next = /^\/(?!\/)/.test(requested) ? requested : "/bikes";

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
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // Lien expiré, déjà utilisé, ou ouvert dans un autre navigateur que celui
  // qui a fait la demande. La page d'arrivée explique quoi faire.
  return NextResponse.redirect(
    next === "/reset-password"
      ? `${origin}/reset-password`
      : `${origin}/login?message=lien-invalide`
  );
}
