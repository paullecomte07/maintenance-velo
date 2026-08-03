import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Maintenance vélo",
  description:
    "Suivi de maintenance d'une flotte de vélos personnelle : sessions d'atelier, actions menées, coûts et valeur estimée.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Les variables de police vivent sur <html> : la règle de base de Tailwind
    // applique `font-family` à cet élément, et une variable définie plus bas
    // rendait la déclaration invalide — le navigateur retombait alors sur sa
    // police par défaut, un serif.
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
