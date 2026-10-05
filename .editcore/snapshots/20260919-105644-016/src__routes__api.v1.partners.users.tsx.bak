import { createFileRoute } from "@tanstack/react-router";
import { handlePartnerUsersPost } from "@/server/partners/api-handlers";

export const Route = createFileRoute("/api/v1/partners/users")({
  component: () => <div className="p-8 text-center text-muted-foreground">API PubliVende Platform</div>,
  server: {
    handlers: {
      POST: async ({ request }) => handlePartnerUsersPost(request),
    },
  },
});
