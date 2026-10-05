import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { OAuthCallbackView } from "@/components/oauth/OAuthCallbackView";

const searchSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
  error_code: z.string().optional(),
  error_message: z.string().optional(),
});

export const Route = createFileRoute("/facebook/callback")({
  validateSearch: (s) => searchSchema.parse(s),
  component: FacebookOAuthCallbackPage,
});

function FacebookOAuthCallbackPage() {
  const search = Route.useSearch();
  return <OAuthCallbackView provider="meta" search={search} />;
}
