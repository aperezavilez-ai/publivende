import { createFileRoute } from "@tanstack/react-router";
import { handlePartnerUsersPost } from "@/server/partners/api-handlers";

export const Route = createFileRoute("/api/v1/partners/users")({
  server: {
    handlers: {
      POST: async ({ request }) => handlePartnerUsersPost(request),
    },
  },
});
