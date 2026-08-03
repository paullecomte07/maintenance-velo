"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { siteOrigin } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string | null };

const MIN_PASSWORD_LENGTH = 6;

// Contrôles communs à tous les formulaires qui posent un mot de passe.
// Retourne le message à afficher, ou null si la saisie est bonne.
function checkNewPassword(password: string, confirmation: string) {
  if (password !== confirmation) {
    return "Les deux mots de passe ne sont pas identiques.";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  }
  return null;
}

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return {
      error:
        error.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect."
          : "La connexion a échoué. Réessaie dans un instant.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/bikes");
}

export async function signup(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = createClient();

  const password = formData.get("password") as string;
  const problem = checkNewPassword(
    password,
    formData.get("password_confirmation") as string
  );
  if (problem) return { error: problem };

  const { data, error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password,
    options: { emailRedirectTo: `${siteOrigin()}/auth/callback` },
  });

  if (error) {
    return {
      error: error.message.includes("Password should be")
        ? `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`
        : "La création du compte a échoué. Réessaie dans un instant.",
    };
  }

  // Si la confirmation d'email est activée, pas de session immédiate.
  if (data.user && !data.session) {
    redirect("/login?message=confirm-email");
  }

  revalidatePath("/", "layout");
  redirect("/bikes");
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export type ResetRequestState = { error: string | null; sent: boolean };

export async function requestPasswordReset(
  _prevState: ResetRequestState,
  formData: FormData
): Promise<ResetRequestState> {
  const email = (formData.get("email") as string).trim();
  const supabase = createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteOrigin()}/auth/callback/reset`,
  });

  // On confirme l'envoi quoi qu'il arrive. Répondre différemment selon que
  // l'adresse a un compte ou non dirait à un visiteur qui est inscrit ici ;
  // l'échec réel (adresse inconnue, quota d'emails atteint) reste dans les
  // logs serveur, où il est utile sans être révélateur.
  if (error) {
    console.error("resetPasswordForEmail:", error.message);
  }

  return { error: null, sent: true };
}

// Fin du parcours « mot de passe oublié » : la session vient d'être ouverte
// par le lien de récupération, on ne peut donc pas demander l'ancien mot de
// passe — c'est précisément celui qu'on a perdu.
export async function updatePassword(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = formData.get("password") as string;
  const problem = checkNewPassword(
    password,
    formData.get("password_confirmation") as string
  );
  if (problem) return { error: problem };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Ce lien n'est plus valable. Demande-en un nouveau." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      error: error.message.includes("should be different")
        ? "Ce mot de passe est déjà le tien. Choisis-en un autre."
        : "Le changement de mot de passe a échoué. Réessaie dans un instant.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/bikes?message=mot-de-passe-modifie");
}

// Changement depuis « Mon compte », en étant déjà connecté.
export async function changePassword(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = formData.get("password") as string;
  const problem = checkNewPassword(
    password,
    formData.get("password_confirmation") as string
  );
  if (problem) return { error: problem };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  // Redemande le mot de passe actuel : sans ça, un cookie de session récupéré
  // sur un appareil laissé ouvert suffirait à verrouiller le compte de son
  // propriétaire. C'est le seul geste de l'app qui coupe l'accès aux données.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: formData.get("current_password") as string,
  });
  if (reauthError) {
    return { error: "Mot de passe actuel incorrect." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      error: error.message.includes("should be different")
        ? "Ce mot de passe est déjà le tien. Choisis-en un autre."
        : "Le changement de mot de passe a échoué. Réessaie dans un instant.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/bikes?message=mot-de-passe-modifie");
}
