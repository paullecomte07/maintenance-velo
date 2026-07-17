"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteBikeButton({
  bikeName,
  onDelete,
}: {
  bikeName: string;
  onDelete: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Supprimer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer « {bikeName} » ?</DialogTitle>
          <DialogDescription>
            Le vélo et tout son cahier d&apos;intervention seront supprimés
            définitivement.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await onDelete();
                  toast.success(`« ${bikeName} » a été supprimé.`);
                  router.push("/bikes");
                } catch {
                  toast.error("La suppression du vélo a échoué.");
                }
              })
            }
          >
            {isPending ? "Suppression…" : "Supprimer définitivement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
