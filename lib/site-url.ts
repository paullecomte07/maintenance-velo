import { headers } from "next/headers";

/**
 * Origine publique du site, pour construire les liens envoyés par email.
 *
 * On préfère une valeur explicite : ces URLs partent dans des mails, et se
 * fier aveuglément à l'en-tête Host laisserait un tiers fabriquer un lien de
 * réinitialisation pointant ailleurs. Le repli sur les en-têtes ne sert qu'au
 * développement local, où NEXT_PUBLIC_SITE_URL n'est pas forcément défini.
 */
export function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const headerList = headers();
  const host =
    headerList.get("x-forwarded-host") ??
    headerList.get("host") ??
    "localhost:3000";
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}
