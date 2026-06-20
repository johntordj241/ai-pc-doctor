import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Apple, Monitor, Terminal, ArrowLeft, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/downloads")({
  head: () => ({
    meta: [
      { title: "Télécharger AI PC Doctor — Windows, macOS, Linux" },
      {
        name: "description",
        content:
          "Téléchargez AI PC Doctor pour Windows, macOS ou Linux. Installation locale, analyses 100% privées.",
      },
    ],
  }),
  component: DownloadsPage,
});

// Release Candidate — binaires non signés. Remplacer ces URLs par les artefacts CI une fois la signature en place.
const RELEASE_VERSION = "0.9.0-rc.1";
const DOWNLOADS = [
  {
    os: "Windows",
    icon: Monitor,
    requirement: "Windows 10 / 11 (x64)",
    filename: "PC-Diagnostic-AI-Setup.exe",
    href: "/release/PC-Diagnostic-AI-Setup.exe",
    note: "Installateur non signé — un avertissement SmartScreen peut s'afficher.",
  },
  {
    os: "macOS",
    icon: Apple,
    requirement: "macOS 12+ (Intel / Apple Silicon)",
    filename: `AI-PC-Doctor-${RELEASE_VERSION}-mac.dmg`,
    href: "#",
    note: "Image non notarisée — clic droit → Ouvrir au premier lancement.",
  },
  {
    os: "Linux",
    icon: Terminal,
    requirement: "Distributions x64 récentes",
    filename: `AI-PC-Doctor-${RELEASE_VERSION}-linux-x86_64.AppImage`,
    href: "#",
    note: "Rendre exécutable : chmod +x puis double-cliquer.",
  },
];

function DownloadsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">Télécharger AI PC Doctor</h1>
      <p className="mt-3 text-muted-foreground">
        Version <strong className="text-foreground">{RELEASE_VERSION}</strong> — Release Candidate.
        Installation locale, aucune donnée envoyée à un serveur tiers.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {DOWNLOADS.map((d) => (
          <a
            key={d.os}
            href={d.href}
            download={d.filename}
            className="surface-card group flex flex-col rounded-2xl border border-border/60 p-6 transition hover:border-primary/60"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
              <d.icon className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">{d.os}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{d.requirement}</p>
            <span className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-[color:var(--primary-glow)] px-3 py-2 text-sm font-medium text-primary-foreground">
              <Download className="h-4 w-4" /> Télécharger
            </span>
            <p className="mt-3 text-[11px] text-muted-foreground">{d.note}</p>
          </a>
        ))}
      </div>

      <div className="surface-card mt-10 flex items-start gap-3 rounded-xl border border-border/60 p-5 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
        <p>
          Les binaires de cette Release Candidate ne sont pas encore signés. La version GA inclura
          la signature Authenticode (Windows) et la notarisation Apple (macOS).
        </p>
      </div>
    </div>
  );
}
