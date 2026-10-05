import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { OAuthCallbackView } from "@/components/oauth/OAuthCallbackView";
import type { OAuthProvider } from "@/lib/oauth/providers";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { PubliVendeMark } from "@/components/PubliVendeLogo";

const searchSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
  error_code: z.string().optional(),
  error_message: z.string().optional(),
});

export const Route = createFileRoute("/oauth/callback/$provider")({
  validateSearch: (s) => searchSchema.parse(s),
  component: OAuthCallbackPage,
});

function OAuthCallbackPage() {
  const { provider } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  if (provider !== "meta" && provider !== "google" && provider !== "tiktok") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <PubliVendeMark size="lg" className="mx-auto" />
          <XCircle className="w-10 h-10 mx-auto text-destructive" />
          <h1 className="text-lg font-semibold">No se pudo conectar</h1>
          <p className="text-sm text-muted-foreground">Proveedor OAuth no reconocido</p>
          <Button variant="outline" onClick={() => navigate({ to: "/configuracion" })}>
            Volver a Configuración
          </Button>
        </Card>
      </div>
    );
  }

  return <OAuthCallbackView provider={provider as OAuthProvider} search={search} />;
}
