"use client";

import { useFormState, useFormStatus } from "react-dom";

import { changePassword, type AuthState } from "@/app/(auth)/actions";
import { PasswordFields } from "@/components/password-fields";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Enregistrement…" : "Changer le mot de passe"}
    </Button>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useFormState<AuthState, FormData>(
    changePassword,
    { error: null }
  );

  return (
    <form action={formAction}>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current_password">Mot de passe actuel</Label>
          <Input
            id="current_password"
            name="current_password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <PasswordFields label="Nouveau mot de passe" />
        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
      </CardContent>
      <CardFooter>
        <SubmitButton />
      </CardFooter>
    </form>
  );
}
