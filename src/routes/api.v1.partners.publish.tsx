import { createFileRoute } from "@tanstack/react-router";
import { handlePartnerPublishPost } from "@/server/partners/api-handlers";

export const Route = createFileRoute("/api/v1/partners/publish")({
  server: {
    handlers: {
      POST: async ({ request }) => handlePartnerPublishPost(request),
    },
  },
});
