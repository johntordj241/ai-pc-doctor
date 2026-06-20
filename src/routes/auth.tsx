import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Stethoscope } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Connexion — PC Diagnostic AI" },
      {
        name: "description",
        content: "Connectez-vous pour diagnostiquer les ralentissements de votre PC avec l'IA.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/app" });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/app" },
        });
        if (error) throw error;
        toast.success("Compte créé. Vous êtes connecté.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/app" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur d'authentification");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/app",
    });
    if (res.error) toast.error(res.error.message ?? "Erreur Google");
    if (res.redirected) return;
    navigate({ to: "/app" });
  };

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
            <Stethoscope className="h-5 w-5" />
          </span>
          <span className="font-semibold tracking-tight">
            PC Diagnostic <span className="text-gradient">AI</span>
          </span>
        </Link>
        <Card className="surface-card border-border/60 p-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Bon retour" : "Créer un compte"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Reprenez vos diagnostics où vous les avez laissés."
              : "Quelques secondes pour démarrer."}
          </p>

          <Button onClick={onGoogle} type="button" variant="outline" className="mt-6 w-full">
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M21.35 11.1h-9.18v2.92h5.27c-.23 1.49-1.7 4.37-5.27 4.37-3.17 0-5.76-2.62-5.76-5.85s2.59-5.85 5.76-5.85c1.8 0 3.01.77 3.7 1.43l2.52-2.43C16.84 4.21 14.7 3.3 12.17 3.3 6.96 3.3 2.75 7.51 2.75 12.72s4.21 9.42 9.42 9.42c5.44 0 9.04-3.82 9.04-9.2 0-.62-.07-1.1-.16-1.84z"
              />
            </svg>
            Continuer avec Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5"
                placeholder="vous@exemple.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-[color:var(--primary-glow)] text-primary-foreground hover:opacity-90"
            >
              {loading ? "..." : mode === "signin" ? "Se connecter" : "Créer mon compte"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "Pas de compte ?" : "Déjà inscrit ?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-medium text-primary hover:underline"
            >
              {mode === "signin" ? "Créer un compte" : "Se connecter"}
            </button>
          </p>
        </Card>
      </div>
    </div>
  );
}
