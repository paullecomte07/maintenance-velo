import { redirect } from "next/navigation";

/**
 * La liste des interventions vit désormais sur la fiche du vélo, en trois
 * groupes (en cours / à venir / terminées). Cette route est conservée pour ne
 * pas casser les liens déjà en circulation.
 */
export default function InterventionsPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/bikes/${params.id}`);
}
