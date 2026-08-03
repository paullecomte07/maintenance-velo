"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";

import { requestPasswordReset, type ResetRequestState } from "../actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Envoi…" : "Envoyer le lien"}
    </Button>
  );
}

export default function ForgotPasswordPage() {
  const [state, formAction] = useFormState<ResetRequestState, FormData>(
    requestPasswordReset,
    { error: null, sent: false }
  );

  if (state.sent) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Lien envoyé</CardTitle>
          <CardDescription>
            Si un compte existe pour cette adresse, un lien de réinitialisation
            vient d&apos;y être envoyé. Ouvre-le depuis ce navigateur.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/login">Retour à la connexion</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Mot de passe oublié</CardTitle>
        <CardDescription>
          Indique ton adresse : tu recevras un lien pour en choisir un nouveau.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <SubmitButton />
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="underline underline-offset-4">
              Retour à la connexion
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
