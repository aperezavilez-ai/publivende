import { createFileRoute } from "@tanstack/react-router";
import { handlePartnerPublishPost } from "@/server/partners/api-handlers";

export const Route = createFileRoute("/api/v1/partners/publish")({
  component: () => <div className="p-8 text-center text-muted-foreground">API PubliVende Platform</div>,
  server: {
    handlers: {
      POST: async ({ request }) => handlePartnerPublishPost(request),
    },
  },
});
