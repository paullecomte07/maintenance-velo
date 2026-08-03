"use client";

import { useFormState, useFormStatus } from "react-dom";

import { updatePassword, type AuthState } from "../actions";
import { PasswordFields } from "@/components/password-fields";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Enregistrement…" : "Choisir ce mot de passe"}
    </Button>
  );
}

export function ResetPasswordForm() {
  const [state, formAction] = useFormState<AuthState, FormData>(
    updatePassword,
    { error: null }
  );

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Nouveau mot de passe</CardTitle>
        <CardDescription>6 caractères minimum.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <PasswordFields label="Nouveau mot de passe" />
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
        </CardContent>
        <CardFooter>
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  );
}
