import { createFileRoute } from "@tanstack/react-router";
import { handlePartnerConnectGet } from "@/server/partners/api-handlers";

export const Route = createFileRoute("/api/v1/partners/connect")({
  component: () => <div className="p-8 text-center text-muted-foreground">API PubliVende Platform</div>,
  server: {
    handlers: {
      GET: async ({ request }) => handlePartnerConnectGet(request),
    },
  },
});
