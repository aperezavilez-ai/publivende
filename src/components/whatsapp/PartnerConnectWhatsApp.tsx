import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { confirmPartnerWhatsAppPhone } from "@/lib/api/partner.functions";
import { buildWaMeUrl } from "@/lib/whatsapp-connect";

interface Props {
  partnerSlug: string;
  externalUserId: string;
}

export function PartnerConnectWhatsApp({ partnerSlug, externalUserId }: Props) {
  const [codigoPais, setCodigoPais] = useState("+52");
  const [celular, setCelular] = useState("");
  const [connected, setConnected] = useState(false);
  const [displayPhone, setDisplayPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onConnect() {
    const digits = celular.replace(/\D/g, "");
    if (digits.length < 10) {
      toast.error("Ingresa un celular válido");
      return;
    }
    setLoading(true);
    const res = await confirmPartnerWhatsAppPhone({
      data: {
        partner_slug: partnerSlug,
        external_user_id: externalUserId,
        celular: digits,
        codigo_pais: codigoPais,
      },
    });
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setConnected(true);
    setDisplayPhone(res.display_phone);
    toast.success("WhatsApp conectado");
  }

  const testUrl =
    celular.length >= 10 ? buildWaMeUrl(codigoPais, celular, "Hola desde tu app") : null;

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-background">
      {connected ? (
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <Badge variant="outline" className="text-green-700 border-green-300">
            Conectado
          </Badge>
          <span>{displayPhone}</span>
        </div>
      ) : (
        <div className="grid grid-cols-[auto_1fr] gap-2 items-end">
          <div className="w-20">
            <Label className="text-xs">País</Label>
            <Input value={codigoPais} onChange={(e) => setCodigoPais(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Celular WhatsApp</Label>
            <Input
              value={celular}
              onChange={(e) => setCelular(e.target.value.replace(/\D/g, ""))}
              placeholder="6674912221"
            />
          </div>
        </div>
      )}
      <div className="flex gap-2">
        {!connected && (
          <Button size="sm" disabled={loading} onClick={onConnect} className="gap-1 bg-green-600 hover:bg-green-700">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
            Conectar WhatsApp
          </Button>
        )}
        {testUrl && (
          <Button size="sm" variant="outline" asChild>
            <a href={testUrl} target="_blank" rel="noopener noreferrer">
              Probar wa.me
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
