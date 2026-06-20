import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Stethoscope,
  Activity,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Download,
  PlayCircle,
  Cpu,
  MemoryStick,
  Thermometer,
  HardDrive,
  Fan,
  AppWindow,
  Gauge,
  Bell,
  History,
  FileText,
  Lock,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Brain,
  Search,
  Lightbulb,
  ListChecks,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI PC Doctor — Comprenez enfin pourquoi votre ordinateur ralentit" },
      {
        name: "description",
        content:
          "AI PC Doctor analyse votre ordinateur en temps réel et identifie automatiquement les causes des ralentissements grâce à l'intelligence artificielle.",
      },
      { property: "og:title", content: "AI PC Doctor" },
      {
        property: "og:description",
        content: "Diagnostic IA local de votre ordinateur. Rapide, sûr, sans envoyer vos données.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [demoOpen, setDemoOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Hero onOpenDemo={() => setDemoOpen(true)} />
      <Problems />
      <HowItWorks />
      <Features />
      <Security />
      <Screenshots />
      <Pricing />
      <FAQ />
      <SiteFooter />
      {demoOpen && <DemoModal onClose={() => setDemoOpen(false)} />}
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
            <Stethoscope className="h-5 w-5" />
          </span>
          <span className="font-semibold tracking-tight">
            AI PC <span className="text-gradient">Doctor</span>
          </span>
        </Link>
        <nav className="hidden gap-6 text-sm text-muted-foreground md:flex">
          <a href="#fonctionnalites" className="hover:text-foreground">
            Fonctionnalités
          </a>
          <a href="#fonctionnement" className="hover:text-foreground">
            Fonctionnement
          </a>
          <a href="#tarifs" className="hover:text-foreground">
            Tarifs
          </a>
          <a href="#faq" className="hover:text-foreground">
            FAQ
          </a>
        </nav>
        <Link
          to="/auth"
          className="rounded-md border border-border/60 bg-secondary/50 px-3.5 py-1.5 text-sm hover:bg-secondary"
        >
          Se connecter
        </Link>
      </div>
    </header>
  );
}

function Hero({ onOpenDemo }: { onOpenDemo: () => void }) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Diagnostic IA local
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Comprenez enfin pourquoi votre ordinateur{" "}
            <span className="text-gradient">ralentit.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            AI PC Doctor analyse votre ordinateur en temps réel et identifie automatiquement les
            causes des ralentissements.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/downloads"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-[color:var(--primary-glow)] px-5 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-90"
            >
              <Download className="h-4 w-4" /> Télécharger l'application
            </Link>
            <button
              type="button"
              onClick={onOpenDemo}
              className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/50 px-5 py-3 text-sm font-medium hover:bg-secondary"
            >
              <PlayCircle className="h-4 w-4" /> Voir une démonstration
            </button>
          </div>
          <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> 100% local
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Aucune donnée envoyée
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5" /> Propulsé par l'IA
            </span>
          </div>
        </div>

        <HeroDashboard />
      </div>
    </section>
  );
}

function HeroDashboard() {
  return (
    <div className="relative">
      <div
        className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-accent/20 blur-2xl"
        aria-hidden
      />
      <div className="relative surface-card rounded-2xl border border-border/60 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4 text-primary" /> Tableau de bord — temps réel
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> En ligne
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <ScoreCard />
          <Metric icon={Cpu} label="CPU" value="42%" tone="primary" />
          <Metric icon={MemoryStick} label="RAM" value="68%" tone="warning" />
          <Metric icon={Thermometer} label="Température" value="61°C" tone="success" />
        </div>

        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Brain className="h-4 w-4 text-primary" /> Diagnostic IA
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Chrome et Slack consomment <strong className="text-foreground">74% de votre RAM</strong>
            . Fermer 12 onglets inactifs libérerait ~3,2 Go.
          </p>
        </div>
      </div>
    </div>
  );
}

function ScoreCard() {
  return (
    <div className="row-span-2 flex flex-col items-center justify-center rounded-xl border border-border/60 bg-secondary/30 p-4">
      <div className="relative grid h-28 w-28 place-items-center rounded-full border-4 border-primary/30 animate-pulse-ring">
        <div className="text-center">
          <div className="text-3xl font-semibold text-gradient">78</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Score santé
          </div>
        </div>
      </div>
      <div className="mt-3 text-xs text-success">Bon état général</div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "primary" | "warning" | "success" | "critical";
}) {
  const toneClass = {
    primary: "text-primary bg-primary/15",
    warning: "text-warning bg-warning/15",
    success: "text-success bg-success/15",
    critical: "text-critical bg-critical/15",
  }[tone];
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`grid h-7 w-7 place-items-center rounded-md ${toneClass}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  );
}

function Problems() {
  const items = [
    {
      icon: Gauge,
      title: "Mon PC est lent",
      text: "Démarrage, applications, navigation : on identifie l'origine exacte.",
    },
    {
      icon: Fan,
      title: "Mon ventilateur tourne sans arrêt",
      text: "Processus en surcharge, températures anormales, blocages thermiques.",
    },
    {
      icon: HardDrive,
      title: "Mon SSD est saturé",
      text: "Fichiers volumineux, caches, logs : voyez ce qui occupe l'espace.",
    },
    {
      icon: AppWindow,
      title: "Une application bloque mon ordinateur",
      text: "Détection des processus instables ou trop gourmands.",
    },
    {
      icon: Activity,
      title: "Je ne sais pas ce qui consomme mes ressources",
      text: "Vue claire CPU, RAM, disque et réseau, en français.",
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <SectionTitle
        eyebrow="Problèmes courants"
        title="Vous reconnaissez l'un de ces symptômes ?"
      />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <div key={it.title} className="surface-card rounded-xl border border-border/60 p-5">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
              <it.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-medium">{it.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{it.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: Search,
      title: "Analyse du système",
      text: "Collecte locale des métriques CPU, RAM, disque, processus et température.",
    },
    {
      icon: ListChecks,
      title: "Identification des causes",
      text: "Corrélation des signaux pour pointer ce qui ralentit vraiment votre PC.",
    },
    {
      icon: Brain,
      title: "Diagnostic IA",
      text: "Explication claire en français, sans jargon, basée sur l'état réel de la machine.",
    },
    {
      icon: Lightbulb,
      title: "Recommandations concrètes",
      text: "Actions priorisées et applicables immédiatement pour retrouver des performances.",
    },
  ];
  return (
    <section id="fonctionnement" className="border-y border-border/40 bg-secondary/20 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionTitle eyebrow="Comment ça marche" title="Quatre étapes, zéro complexité." />
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="relative">
              <div className="absolute -top-3 left-5 rounded-full bg-gradient-to-r from-primary to-[color:var(--primary-glow)] px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                Étape {i + 1}
              </div>
              <div className="surface-card h-full rounded-xl border border-border/60 p-6 pt-7">
                <s.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-3 font-medium">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: Activity,
      title: "Analyse temps réel",
      text: "Métriques système rafraîchies en continu.",
    },
    {
      icon: Brain,
      title: "Diagnostic IA",
      text: "Explications en langage naturel, contextualisées.",
    },
    {
      icon: Bell,
      title: "Alertes intelligentes",
      text: "Soyez prévenu avant que ça devienne critique.",
    },
    {
      icon: History,
      title: "Historique",
      text: "Suivez l'évolution de la santé de votre machine.",
    },
    { icon: FileText, title: "Rapports PDF", text: "Exportez un diagnostic complet en un clic." },
    {
      icon: ShieldCheck,
      title: "Confidentialité",
      text: "Analyse 100% locale, sans télémétrie cachée.",
    },
  ];
  return (
    <section id="fonctionnalites" className="mx-auto max-w-6xl px-6 py-20">
      <SectionTitle
        eyebrow="Fonctionnalités"
        title="Tout ce qu'il faut pour comprendre votre PC."
      />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="surface-card rounded-xl border border-border/60 p-5">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent/15 text-accent">
              <f.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-medium">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Security() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="surface-card grid items-center gap-8 rounded-2xl border border-border/60 p-8 lg:grid-cols-[auto_1fr] lg:p-12">
        <div className="grid h-20 w-20 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Lock className="h-10 w-10" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Vos données ne quittent jamais votre machine.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Toutes les analyses sont effectuées{" "}
            <strong className="text-foreground">localement</strong>. AI PC Doctor n'envoie aucune
            métrique système à un serveur distant. Vous gardez le contrôle complet de vos
            informations matérielles et logicielles.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            {[
              "Aucune télémétrie",
              "Pas de cloud obligatoire",
              "Open source friendly",
              "Conforme RGPD",
            ].map((b) => (
              <span
                key={b}
                className="rounded-full border border-border/60 bg-secondary/40 px-3 py-1"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Screenshots() {
  const slides = [
    { title: "Dashboard principal", desc: "Vue d'ensemble avec score santé et métriques live." },
    { title: "Diagnostic IA", desc: "Explication claire des causes de ralentissement." },
    { title: "Historique", desc: "Évolution de la santé sur plusieurs semaines." },
    { title: "Rapport PDF", desc: "Document exportable pour vos clients ou votre équipe." },
  ];
  const [i, setI] = useState(0);
  const next = () => setI((p) => (p + 1) % slides.length);
  const prev = () => setI((p) => (p - 1 + slides.length) % slides.length);
  return (
    <section className="border-y border-border/40 bg-secondary/20 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionTitle eyebrow="Captures d'écran" title="Un aperçu de l'application." />
        <div className="relative mt-10">
          <div className="surface-card aspect-[16/9] overflow-hidden rounded-2xl border border-border/60">
            <div className="relative grid h-full place-items-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-8">
              <div className="text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/20 text-primary">
                  <Activity className="h-8 w-8" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold">{slides[i].title}</h3>
                <p className="mt-2 max-w-md text-muted-foreground">{slides[i].desc}</p>
              </div>
            </div>
          </div>
          <button
            onClick={prev}
            aria-label="Précédent"
            className="absolute left-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-background/80 backdrop-blur hover:bg-secondary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            aria-label="Suivant"
            className="absolute right-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-background/80 backdrop-blur hover:bg-secondary"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="mt-4 flex justify-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${idx === i ? "w-8 bg-primary" : "w-2 bg-border"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      name: "Gratuit",
      price: "0€",
      period: "pour toujours",
      desc: "Pour les particuliers curieux.",
      features: [
        "Analyse temps réel",
        "1 diagnostic IA / jour",
        "Score santé",
        "Historique 7 jours",
      ],
      cta: "Commencer",
      highlight: false,
    },
    {
      name: "Pro",
      price: "9€",
      period: "/ mois",
      desc: "Pour développeurs et power users.",
      features: [
        "Diagnostics IA illimités",
        "Alertes intelligentes",
        "Historique illimité",
        "Rapports PDF",
        "Support prioritaire",
      ],
      cta: "Essayer Pro",
      highlight: true,
    },
    {
      name: "Entreprise",
      price: "Sur devis",
      period: "",
      desc: "Pour les PME et équipes IT.",
      features: [
        "Déploiement multi-postes",
        "Tableau de bord centralisé",
        "SSO & gestion d'équipe",
        "SLA & support dédié",
      ],
      cta: "Nous contacter",
      highlight: false,
    },
  ];
  return (
    <section id="tarifs" className="mx-auto max-w-6xl px-6 py-20">
      <SectionTitle eyebrow="Tarifs" title="Un plan pour chaque besoin." />
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`surface-card relative rounded-2xl border p-6 ${p.highlight ? "border-primary/60 shadow-[var(--shadow-glow)]" : "border-border/60"}`}
          >
            {p.highlight && (
              <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-primary to-[color:var(--primary-glow)] px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                Recommandé
              </span>
            )}
            <h3 className="text-lg font-semibold">{p.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="text-4xl font-semibold">{p.price}</span>
              <span className="text-sm text-muted-foreground">{p.period}</span>
            </div>
            <ul className="mt-6 space-y-2.5 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-success" /> {f}
                </li>
              ))}
            </ul>
            <Link
              to="/auth"
              className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${p.highlight ? "bg-gradient-to-r from-primary to-[color:var(--primary-glow)] text-primary-foreground hover:opacity-90" : "border border-border/60 bg-secondary/50 hover:bg-secondary"}`}
            >
              {p.cta} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    {
      q: "AI PC Doctor fonctionne-t-il hors ligne ?",
      a: "L'analyse système est 100% locale. Seul le diagnostic IA via Lovable AI nécessite une connexion.",
    },
    {
      q: "Mes données sont-elles envoyées sur internet ?",
      a: "Non. Les métriques système restent sur votre machine. Seul un résumé anonymisé est envoyé au modèle IA si vous lancez un diagnostic.",
    },
    {
      q: "Sur quels systèmes l'application fonctionne-t-elle ?",
      a: "Windows, macOS et Linux via l'application Electron. Une version web de démonstration est aussi disponible.",
    },
    {
      q: "Puis-je essayer avant d'acheter ?",
      a: "Oui, le plan Gratuit est sans limite de durée et ne nécessite aucune carte bancaire.",
    },
    {
      q: "Comment fonctionne la facturation Entreprise ?",
      a: "Sur devis selon le nombre de postes et les besoins d'intégration. Contactez-nous.",
    },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="border-t border-border/40 bg-secondary/20 py-20">
      <div className="mx-auto max-w-3xl px-6">
        <SectionTitle eyebrow="FAQ" title="Vos questions, nos réponses." center />
        <div className="mt-10 space-y-3">
          {items.map((it, idx) => (
            <div key={it.q} className="surface-card rounded-xl border border-border/60">
              <button
                onClick={() => setOpen(open === idx ? null : idx)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <span className="font-medium">{it.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${open === idx ? "rotate-180" : ""}`}
                />
              </button>
              {open === idx && (
                <div className="px-5 pb-5 text-sm text-muted-foreground">{it.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
              <Stethoscope className="h-5 w-5" />
            </span>
            <span className="font-semibold tracking-tight">
              AI PC <span className="text-gradient">Doctor</span>
            </span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Le médecin IA de votre ordinateur. Local, rapide, transparent.
          </p>
        </div>
        <FooterCol
          title="Produit"
          links={[
            ["Fonctionnalités", "#fonctionnalites"],
            ["Tarifs", "#tarifs"],
            ["Télécharger", "/downloads"],
          ]}
        />
        <FooterCol
          title="Ressources"
          links={[
            ["FAQ", "#faq"],
            ["Documentation", "#"],
            ["Changelog", "#"],
          ]}
        />
        <FooterCol
          title="Légal"
          links={[
            ["Confidentialité", "#"],
            ["Conditions", "#"],
            ["Contact", "#"],
          ]}
        />
      </div>
      <div className="border-t border-border/40 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} AI PC Doctor. Tous droits réservés.
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {links.map(([label, href]) => (
          <li key={label}>
            {href.startsWith("/") ? (
              <Link to={href} className="hover:text-foreground">
                {label}
              </Link>
            ) : (
              <a href={href} className="hover:text-foreground">
                {label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  center,
}: {
  eyebrow: string;
  title: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "text-center" : ""}>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
    </div>
  );
}

function DemoModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Démonstration AI PC Doctor"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="surface-card relative w-full max-w-3xl overflow-hidden rounded-2xl border border-border/60"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-background/80 backdrop-blur hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="aspect-video w-full bg-gradient-to-br from-primary/15 via-background to-accent/15">
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/20 text-primary">
              <PlayCircle className="h-8 w-8" />
            </span>
            <h3 className="mt-5 text-2xl font-semibold">Démonstration bientôt disponible</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              La vidéo de démonstration sera ajoutée à la sortie de la version 1.0. En attendant,
              vous pouvez tester l'application directement.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/downloads"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-[color:var(--primary-glow)] px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                <Download className="h-4 w-4" /> Télécharger
              </Link>
              <Link
                to="/auth"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/50 px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                Essayer la version web <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
