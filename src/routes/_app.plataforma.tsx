import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/mock/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getSessionToken } from "@/lib/production/session";
import {
  partnerAdminCreate,
  partnerAdminCreateApiKey,
  partnerAdminList,
  partnerAdminUpdateWebhook,
  getPartnerConnectUrlForAdmin,
} from "@/lib/api/partner.functions";
import { resolveAppBaseUrl } from "@/lib/app-url";
import { Copy, Key, Plus, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_app/plataforma")({ component: PlataformaPage });

function PlataformaPage() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<Awaited<ReturnType<typeof partnerAdminList>>["partners"]>([]);
  const [loading, setLoading] = useState(true);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [form, setForm] = useState({
    slug: "",
    nombre: "",
    brand_name: "",
    primary_color: "#7c3aed",
    allowed_return_origins: "",
    webhook_url: "",
  });
  const [testExternalId, setTestExternalId] = useState("user_001");

  async function load() {
    const token = getSessionToken();
    if (!token) return;
    const res = await partnerAdminList({ data: { token } });
    if (res.ok) setPartners(res.partners);
    setLoading(false);
  }

  useEffect(() => {
    if (user?.is_admin) load();
    else setLoading(false);
  }, [user?.is_admin]);

  if (!user?.is_admin) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Solo administradores pueden gestionar la plataforma.</p>
      </Card>
    );
  }

  async function onCreatePartner(e: React.FormEvent) {
    e.preventDefault();
    const token = getSessionToken();
    if (!token) return;
    const origins = form.allowed_return_origins
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await partnerAdminCreate({
      data: {
        token,
        slug: form.slug,
        nombre: form.nombre,
        brand_name: form.brand_name,
        primary_color: form.primary_color,
        allowed_return_origins: origins,
        webhook_url: form.webhook_url || undefined,
      },
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Proyecto creado");
    setForm({ slug: "", nombre: "", brand_name: "", primary_color: "#7c3aed", allowed_return_origins: "", webhook_url: "" });
    load();
  }

  async function onCreateKey(partnerId: string) {
    const token = getSessionToken();
    if (!token) return;
    const res = await partnerAdminCreateApiKey({ data: { token, partner_id: partnerId } });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setNewApiKey(res.api_key);
    toast.success("API key creada — cópiala ahora, no se volverá a mostrar");
    load();
  }

  async function onSaveWebhook(partnerId: string, webhookUrl: string) {
    const token = getSessionToken();
    if (!token) return;
    const res = await partnerAdminUpdateWebhook({
      data: { token, partner_id: partnerId, webhook_url: webhookUrl.trim() || null },
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Webhook actualizado");
    load();
  }

  async function copyConnectUrl(slug: string) {
    const token = getSessionToken();
    if (!token) return;
    const res = await getPartnerConnectUrlForAdmin({
      data: {
        token,
        partner_slug: slug,
        external_user_id: testExternalId,
        return_url: originsExample(slug),
      },
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    await navigator.clipboard.writeText(res.connect_url);
    toast.success("URL de conexión copiada");
  }

  function originsExample(_slug: string) {
    return "https://example.com/dashboard";
  }

  const base = resolveAppBaseUrl();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Plataforma PubliVende</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conecta otros proyectos como marca blanca. Cada proyecto recibe API key y URL de conexión.
        </p>
      </div>

      {newApiKey && (
        <Card className="p-4 border-amber-300 bg-amber-50/80">
          <p className="text-sm font-semibold text-amber-900 mb-2">API key nueva (guárdala ahora)</p>
          <code className="text-xs break-all block">{newApiKey}</code>
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => navigator.clipboard.writeText(newApiKey)}
          >
            <Copy className="w-3.5 h-3.5 mr-1" />
            Copiar
          </Button>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuevo proyecto
        </h2>
        <form onSubmit={onCreatePartner} className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Slug (URL)</Label>
            <Input
              placeholder="rockmybody"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Nombre interno</Label>
            <Input
              placeholder="Rock My Body App"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Marca visible (white-label)</Label>
            <Input
              placeholder="Rock My Body"
              value={form.brand_name}
              onChange={(e) => setForm({ ...form, brand_name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Color primario</Label>
            <Input
              type="color"
              value={form.primary_color}
              onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Orígenes permitidos (return_url), separados por coma</Label>
            <Input
              placeholder="https://rockmybody.com, https://app.rockmybody.com"
              value={form.allowed_return_origins}
              onChange={(e) => setForm({ ...form, allowed_return_origins: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Webhook URL (eventos server-to-server)</Label>
            <Input
              placeholder="https://api.tuapp.com/webhooks/publivende"
              value={form.webhook_url}
              onChange={(e) => setForm({ ...form, webhook_url: e.target.value })}
            />
          </div>
          <Button type="submit" className="sm:col-span-2 w-fit">
            Crear proyecto
          </Button>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-4">Proyectos conectados</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : !partners?.length ? (
          <p className="text-sm text-muted-foreground">Aún no hay proyectos. Crea el primero arriba.</p>
        ) : (
          <div className="space-y-4">
            {partners.map((p) => (
              <div key={p.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">{p.brandName}</div>
                    <div className="text-xs text-muted-foreground">
                      slug: <code>{p.slug}</code> · {p.nombre}
                    </div>
                  </div>
                  <Badge variant={p.activo ? "outline" : "secondary"}>
                    {p.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground break-all">
                  Connect: {base}/connect/{p.slug}?external_user_id=USER_ID
                </div>
                <PartnerWebhookField
                  partnerId={p.id}
                  initialUrl={p.webhookUrl ?? ""}
                  onSave={onSaveWebhook}
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => onCreateKey(p.id)} className="gap-1">
                    <Key className="w-3.5 h-3.5" />
                    Nueva API key
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyConnectUrl(p.slug)} className="gap-1">
                    <Copy className="w-3.5 h-3.5" />
                    Copiar URL conexión
                  </Button>
                  <Button size="sm" variant="outline" asChild className="gap-1">
                    <a
                      href={`${base}/connect/${p.slug}?external_user_id=${testExternalId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Probar
                    </a>
                  </Button>
                </div>
                {p.api_keys?.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Keys: {p.api_keys.map((k) => k.keyPrefix + "…").join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-2">API REST v1</h2>
        <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{`POST ${base}/api/v1/partners/users
Authorization: Bearer pv_live_...
{ "external_user_id": "user_42", "nombre": "...", "nombre_negocio": "..." }

GET ${base}/api/v1/partners/connect?external_user_id=user_42&platform=instagram

GET ${base}/api/v1/partners/users/user_42/connections

POST ${base}/api/v1/partners/publish
{ "external_user_id": "user_42", "copy": "Hola mundo", "redes": ["instagram"], "media_url": "https://...", "notify_whatsapp": false }

Webhooks (POST a webhook_url):
  user.created | connection.connected | whatsapp.connected | publish.completed | publish.failed
  Header: X-PubliVende-Signature: sha256=... (HMAC con SESSION_SECRET + partner_id)

SDK: packages/publivende-sdk — import { PubliVendeClient } from "@publivende/sdk"`}</pre>
      </Card>
    </div>
  );
}

function PartnerWebhookField({
  partnerId,
  initialUrl,
  onSave,
}: {
  partnerId: string;
  initialUrl: string;
  onSave: (partnerId: string, url: string) => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  useEffect(() => setUrl(initialUrl), [initialUrl]);
  return (
    <div className="flex flex-wrap gap-2 items-end">
      <div className="flex-1 min-w-[200px]">
        <Label className="text-xs">Webhook URL</Label>
        <Input
          className="h-8 text-xs"
          placeholder="https://api.tuapp.com/webhooks/publivende"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>
      <Button size="sm" variant="secondary" onClick={() => onSave(partnerId, url)}>
        Guardar webhook
      </Button>
    </div>
  );
}
