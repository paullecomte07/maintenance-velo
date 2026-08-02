import type { Config } from "tailwindcss";

/**
 * Les couleurs sont lues depuis les variables CSS de `app/globals.css`, qui
 * les stocke en canaux RVB. `rgb(… / <alpha-value>)` est ce qui permet aux
 * modificateurs d'opacité (`bg-muted/50`, `hover:bg-primary/90`) de continuer
 * à fonctionner : avec des hexadécimaux bruts, ils tomberaient en silence.
 */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // La police est chargée par `app/layout.tsx` ; sans ce branchement,
        // elle était téléchargée puis jamais appliquée.
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        background: token("background"),
        foreground: token("foreground"),
        card: {
          DEFAULT: token("card"),
          foreground: token("card-foreground"),
        },
        popover: {
          DEFAULT: token("popover"),
          foreground: token("popover-foreground"),
        },
        primary: {
          DEFAULT: token("primary"),
          foreground: token("primary-foreground"),
        },
        secondary: {
          DEFAULT: token("secondary"),
          foreground: token("secondary-foreground"),
        },
        muted: {
          DEFAULT: token("muted"),
          foreground: token("muted-foreground"),
        },
        accent: {
          DEFAULT: token("accent"),
          foreground: token("accent-foreground"),
        },
        destructive: {
          DEFAULT: token("destructive"),
          foreground: token("destructive-foreground"),
        },
        border: token("border"),
        input: token("input"),
        ring: token("ring"),

        // Familles de sens, jamais utilisées comme décoration.
        ok: { DEFAULT: token("ok"), foreground: token("ok-foreground") },
        warn: { DEFAULT: token("warn"), foreground: token("warn-foreground") },
        info: { DEFAULT: token("info"), foreground: token("info-foreground") },
        alert: {
          DEFAULT: token("alert"),
          foreground: token("alert-foreground"),
        },

        // Réservées au graphe coût vs valeur (#8).
        chart: {
          cost: token("chart-cost"),
          value: token("chart-value"),
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
