import { createFileRoute } from "@tanstack/react-router";
import { handlePartnerConnectionsGet } from "@/server/partners/api-handlers";

export const Route = createFileRoute("/api/v1/partners/users/$externalId/connections")({
  component: () => <div className="p-8 text-center text-muted-foreground">API PubliVende Platform</div>,
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handlePartnerConnectionsGet(request, params.externalId),
    },
  },
});
