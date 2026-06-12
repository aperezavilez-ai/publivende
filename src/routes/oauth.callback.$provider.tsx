import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { completeOAuthCallback } from "@/lib/api/oauth.functions";
import { connectAccountOAuth } from "@/services/social/mock";
import { useAuth } from "@/lib/mock/auth";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PubliVendeMark } from "@/components/PubliVendeLogo";

const searchSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export const Route = createFileRoute("/oauth/callback/$provider")({
  validateSearch: (s) => searchSchema.parse(s),
  component: OAuthCallbackPage,
});

function OAuthCallbackPage() {
  const { provider } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Completando conexión…");
  const [returnTo, setReturnTo] = useState("/configuracion");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function run() {
      if (search.error) {
        setStatus("error");
        setMessage(search.error_description ?? search.error ?? "Autorización cancelada");
        return;
      }
      if (!search.code || !search.state) {
        setStatus("error");
        setMessage("Faltan parámetros de OAuth. Intenta conectar de nuevo.");
        return;
      }
      if (provider !== "meta" && provider !== "google" && provider !== "tiktok") {
        setStatus("error");
        setMessage("Proveedor OAuth no reconocido");
        return;
      }

      const result = await completeOAuthCallback({
        data: { provider, code: search.code, state: search.state },
      });

      if (!result.ok) {
        setStatus("error");
        setMessage(result.error);
        return;
      }

      connectAccountOAuth(result.userId, result.account.red, {
        nombre_cuenta: result.account.nombre_cuenta,
        access_token: result.account.access_token,
        external_account_id: result.account.external_account_id,
        token_expires_at: result.account.token_expires_at,
        avatar: result.account.avatar,
        oauth_provider: result.account.provider,
      });

      setReturnTo(result.returnTo);
      setStatus("ok");
      setMessage(`${result.account.nombre_cuenta} conectado correctamente`);
      setTimeout(() => navigate({ to: result.returnTo as "/" }), 1800);
    }

    run().catch((err) => {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Error inesperado");
    });
  }, [provider, search, user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="p-8 max-w-md w-full text-center space-y-4">
        <PubliVendeMark size="lg" className="mx-auto" />
        {status === "loading" && <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />}
        {status === "ok" && <CheckCircle2 className="w-10 h-10 mx-auto text-green-600" />}
        {status === "error" && <XCircle className="w-10 h-10 mx-auto text-destructive" />}
        <h1 className="text-lg font-semibold">
          {status === "loading" ? "Conectando red social" : status === "ok" ? "¡Conectado!" : "No se pudo conectar"}
        </h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        {status === "error" && (
          <Button variant="outline" onClick={() => navigate({ to: "/configuracion" })}>
            Volver a Configuración
          </Button>
        )}
        {status === "ok" && (
          <p className="text-xs text-muted-foreground">Redirigiendo a {returnTo}…</p>
        )}
      </Card>
    </div>
  );
}
