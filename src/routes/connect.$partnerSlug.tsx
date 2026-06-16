import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { getPartnerConnectPage, startPartnerOAuthFromConnect } from "@/lib/api/partner.functions";
import { PartnerConnectWhatsApp } from "@/components/whatsapp/PartnerConnectWhatsApp";
import { RED_LABELS } from "@/services/social/mock";
import type { Red } from "@/lib/mock/types";

const searchSchema = z.object({
  external_user_id: z.string(),
  return_url: z.string().optional(),
});

const REDES: Red[] = ["instagram", "facebook", "tiktok", "youtube"];

export const Route = createFileRoute("/connect/$partnerSlug")({
  validateSearch: (s) => searchSchema.parse(s),
  component: PartnerConnectPage,
});

function PartnerConnectPage() {
  const { partnerSlug } = Route.useParams();
  const search = Route.useSearch();
  const [loading, setLoading] = useState(true);
  const [brandName, setBrandName] = useState("Conectar cuentas");
  const [primaryColor, setPrimaryColor] = useState("#7c3aed");
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    getPartnerConnectPage({
      data: {
        partner_slug: partnerSlug,
        external_user_id: search.external_user_id,
        return_url: search.return_url,
      },
    })
      .then((res) => {
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        setBrandName(res.partner.brand_name);
        setPrimaryColor(res.partner.primary_color);
      })
      .finally(() => setLoading(false));
  }, [partnerSlug, search.external_user_id, search.return_url]);

  async function connectRed(red: Red) {
    setConnecting(red);
    const res = await startPartnerOAuthFromConnect({
      data: {
        partner_slug: partnerSlug,
        external_user_id: search.external_user_id,
        red,
        return_url: search.return_url,
      },
    });
    setConnecting(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    window.location.href = res.url;
  }

  function finishAndReturn() {
    if (search.return_url) {
      const u = new URL(search.return_url);
      u.searchParams.set("publivende_connected", "1");
      u.searchParams.set("external_user_id", search.external_user_id);
      window.location.href = u.toString();
      return;
    }
    toast.success("Conexiones guardadas en PubliVende");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center">
      <Card className="w-full max-w-lg p-6 space-y-5">
        <div className="text-center space-y-1">
          <Badge style={{ backgroundColor: primaryColor }} className="text-white border-0">
            Powered by PubliVende
          </Badge>
          <h1 className="text-2xl font-bold">{brandName}</h1>
          <p className="text-sm text-muted-foreground">
            Conecta tus redes para publicar desde tu app
          </p>
          <p className="text-xs text-muted-foreground font-mono">ID: {search.external_user_id}</p>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-green-600" />
            WhatsApp
          </h2>
          <PartnerConnectWhatsApp
            partnerSlug={partnerSlug}
            externalUserId={search.external_user_id}
          />
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Redes sociales</h2>
          {REDES.map((red) => (
            <div key={red} className="flex items-center justify-between gap-2 p-2 border rounded-lg">
              <span className="text-sm">{RED_LABELS[red]}</span>
              <Button
                size="sm"
                variant="outline"
                disabled={connecting === red}
                onClick={() => connectRed(red)}
                className="gap-1"
              >
                {connecting === red ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5" />
                )}
                Conectar
              </Button>
            </div>
          ))}
        </div>

        {search.return_url && (
          <Button className="w-full" style={{ backgroundColor: primaryColor }} onClick={finishAndReturn}>
            Volver a {brandName}
          </Button>
        )}
      </Card>
    </div>
  );
}
