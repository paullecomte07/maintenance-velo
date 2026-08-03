import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Nouveau mot de passe + sa confirmation, partagés par l'inscription, la
// réinitialisation et « Mon compte ». La confirmation n'est pas décorative :
// sans elle, une faute de frappe à l'inscription coûtait le compte.
export function PasswordFields({ label = "Mot de passe" }: { label?: string }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="password">{label}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password_confirmation">Confirmer le mot de passe</Label>
        <Input
          id="password_confirmation"
          name="password_confirmation"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>
    </>
  );
}
