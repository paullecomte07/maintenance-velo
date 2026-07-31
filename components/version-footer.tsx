import packageJson from "@/package.json";

const REPO_URL = "https://github.com/paullecomte07/maintenance-velo";

export function VersionFooter() {
  return (
    <footer className="border-t px-4 py-3 text-center">
      <a
        href={`${REPO_URL}/releases/tag/v${packageJson.version}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-muted-foreground hover:underline"
      >
        v{packageJson.version}
      </a>
    </footer>
  );
}
