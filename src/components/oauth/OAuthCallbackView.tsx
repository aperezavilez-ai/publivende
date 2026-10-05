import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  completeMetaPageSelection,
  completeOAuthCallback,
  type MetaPageOption,
} from "@/lib/api/oauth.functions";
import { saveOAuthTokenServer } from "@/lib/api/auth.functions";
import { connectAccountOAuth } from "@/services/social/mock";
import { useAuth } from "@/lib/mock/auth";
import { getSessionToken, isProductionModeClient } from "@/lib/production/session";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PubliVendeMark } from "@/components/PubliVendeLogo";
import type { OAuthProvider } from "@/lib/oauth/providers";
import type { Red } from "@/lib/mock/types";
import type { OAuthConnectResult } from "@/lib/api/oauth.functions";
import { rankMetaPages } from "@/lib/oauth/meta-page-match";

interface OAuthSearch {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
  error_code?: string;
  error_message?: string;
}

async function saveConnectedAccount(userId: string, account: OAuthConnectResult) {
  connectAccountOAuth(userId, account.red, {
    nombre_cuenta: account.nombre_cuenta,
    access_token: account.access_token,
    external_account_id: account.external_account_id,
    token_expires_at: account.token_expires_at,
    avatar: account.avatar,
    oauth_provider: account.provider,
  });

  const token = getSessionToken();
  if (isProductionModeClient() && token) {
    await saveOAuthTokenServer({
      data: {
        token,
        red: account.red,
        account: {
          nombre_cuenta: account.nombre_cuenta,
          access_token: account.access_token,
          external_account_id: account.external_account_id,
          token_expires_at: account.token_expires_at,
          avatar: account.avatar,
          oauth_provider: account.provider,
        },
      },
    });
  }
}

export function OAuthCallbackView({
  provider,
  search,
}: {
  provider: OAuthProvider;
  search: OAuthSearch;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "pick_page" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Completando conexión…");
  const [returnTo, setReturnTo] = useState("/configuracion");
  const [pages, setPages] = useState<MetaPageOption[]>([]);
  const [pageSelectToken, setPageSelectToken] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [red, setRed] = useState<Red>("facebook");
  const [userId, setUserId] = useState<string | null>(null);
  const [submittingPage, setSubmittingPage] = useState(false);
  const ran = useRef(false);

  function finishSuccess(
    account: OAuthConnectResult,
    nextReturnTo: string,
    partnerUrl?: string,
    extUserId?: string,
  ) {
    setReturnTo(nextReturnTo);
    setStatus("ok");
    setMessage(`${account.nombre_cuenta} conectado correctamente`);

    if (partnerUrl) {
      try {
        const u = new URL(partnerUrl);
        u.searchParams.set("publivende_connected", "1");
        u.searchParams.set("red", account.red);
        if (extUserId) u.searchParams.set("external_user_id", extUserId);
        setTimeout(() => {
          window.location.href = u.toString();
        }, 1200);
        return;
      } catch {
        /* fallback to internal returnTo */
      }
    }

    setTimeout(() => navigate({ to: nextReturnTo as "/" }), 1800);
  }

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function run() {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const code = search.code ?? hashParams.get("code") ?? undefined;
      const state = search.state ?? hashParams.get("state") ?? undefined;
      const error =
        search.error ??
        search.error_message ??
        hashParams.get("error") ??
        hashParams.get("error_message") ??
        undefined;
      const errorDescription =
        search.error_description ??
        hashParams.get("error_description") ??
        undefined;

      if (error || search.error_code) {
        setStatus("error");
        setMessage(
          errorDescription
            ?? error
            ?? (search.error_code ? `Meta OAuth error (${search.error_code})` : "Autorización cancelada"),
        );
        return;
      }
      if (!code || !state) {
        setStatus("error");
        setMessage(
          "No pudimos completar la conexión. Intenta de nuevo desde Configuración o contacta soporte si el problema continúa.",
        );
        return;
      }

      const result = await completeOAuthCallback({
        data: { provider, code, state },
      });

      if (!result.ok) {
        setStatus("error");
        setMessage(result.error);
        return;
      }

      if ("hub" in result) {
        setReturnTo(result.returnTo);
        setStatus("ok");
        setMessage(
          result.cuentas.length
            ? `Cuentas oficiales conectadas: ${result.cuentas.join(", ")}. Asígnales nichos y actívalas.`
            : "No se encontraron cuentas en este perfil.",
        );
        setTimeout(() => navigate({ to: result.returnTo as "/" }), 2200);
        return;
      }

      setUserId(result.userId);
      setReturnTo(result.returnTo);

      if (result.needsPageSelection) {
        const storedHint = typeof localStorage !== "undefined" ? localStorage.getItem("pv_fan_page_hint") : null;
        const hints = [storedHint, result.pageHint, user?.nombre, user?.nombre_negocio].filter(Boolean) as string[];
        const ranked = rankMetaPages(result.pages, hints, { allowPlatformPage: !!user?.is_admin });

        if (ranked.exactMatch && ranked.bestId) {
          const selection = await completeMetaPageSelection({
            data: { pageSelectToken: result.pageSelectToken, pageId: ranked.bestId },
          });
          if (!selection.ok) {
            setStatus("error");
            setMessage(selection.error);
            return;
          }
          await saveConnectedAccount(result.userId, selection.account);
          finishSuccess(
            selection.account,
            selection.returnTo,
            selection.partnerReturnUrl,
            selection.externalUserId,
          );
          return;
        }

        setRed(result.red);
        setPages(ranked.pages);
        setPageSelectToken(result.pageSelectToken);
        setSelectedPageId(ranked.bestId);
        setStatus("pick_page");
        const suggested = ranked.pages.find((p) => p.id === ranked.bestId)?.name;
        setMessage(
          result.red === "instagram"
            ? suggested
              ? `Elige la Fan Page de Instagram (sugerida: ${suggested})`
              : "Elige la Fan Page con la que está vinculado tu Instagram"
            : suggested
              ? `Elige tu Fan Page (sugerida: ${suggested})`
              : "Elige la Fan Page que quieres conectar",
        );
        return;
      }

      await saveConnectedAccount(result.userId, result.account);
      finishSuccess(result.account, result.returnTo, result.partnerReturnUrl, result.externalUserId);
    }

    run().catch((err) => {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Error inesperado");
    });
  }, [provider, search, user, navigate]);

  async function onConfirmPage() {
    if (!pageSelectToken || !selectedPageId || !userId) return;
    setSubmittingPage(true);
    try {
      const result = await completeMetaPageSelection({
        data: { pageSelectToken, pageId: selectedPageId },
      });
      if (!result.ok) {
        setStatus("error");
        setMessage(result.error);
        return;
      }
      await saveConnectedAccount(userId, result.account);
      finishSuccess(result.account, result.returnTo, result.partnerReturnUrl, result.externalUserId);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSubmittingPage(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="p-8 max-w-md w-full text-center space-y-4">
        <PubliVendeMark size="lg" className="mx-auto" />
        {status === "loading" && <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />}
        {status === "ok" && <CheckCircle2 className="w-10 h-10 mx-auto text-green-600" />}
        {status === "error" && <XCircle className="w-10 h-10 mx-auto text-destructive" />}
        <h1 className="text-lg font-semibold">
          {status === "loading" && "Conectando red social"}
          {status === "pick_page" && "Elige tu página"}
          {status === "ok" && "¡Conectado!"}
          {status === "error" && "No se pudo conectar"}
        </h1>
        <p className="text-sm text-muted-foreground">{message}</p>

        {status === "pick_page" && (
          <div className="text-left space-y-3">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pages.map((page) => {
                const selected = selectedPageId === page.id;
                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => setSelectedPageId(page.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    {page.avatar ? (
                      <img src={page.avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{page.name}</div>
                      {red === "instagram" && page.instagramUsername && (
                        <div className="text-xs text-muted-foreground">@{page.instagramUsername}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <Button
              className="w-full"
              disabled={!selectedPageId || submittingPage}
              onClick={onConfirmPage}
            >
              {submittingPage ? "Conectando…" : "Conectar esta página"}
            </Button>
          </div>
        )}

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
