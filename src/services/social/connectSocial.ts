import type { Red } from "@/lib/mock/types";
import { startSocialOAuthConnect } from "./oauth";
import { toast } from "sonner";

export async function connectSocialNetwork(userId: string, red: Red, returnTo = "/configuracion") {
  const result = await startSocialOAuthConnect(userId, red, returnTo);
  if (!result.ok) {
    toast.error(result.error, { duration: 10000 });
    return false;
  }
  window.location.href = result.url;
  return true;
}
