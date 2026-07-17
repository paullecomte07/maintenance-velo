import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-semibold">Maintenance vélo</span>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Suivez l&apos;entretien de vos vélos
        </h1>
        <p className="max-w-md text-muted-foreground">
          Cahier d&apos;intervention en ligne, suivi des coûts et valeur
          estimée de chaque vélo, accessible depuis tous vos appareils.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/login">Se connecter</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/signup">Créer un compte</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
