import { popupResult as sharedPopupResult } from "@/app/api/auth/_popup";

/** Shared constants for the Google OAuth pair of routes. */
export const GOOGLE_STATE_COOKIE = "mg_g_state";

/** Google flavour of the shared popup handshake page. */
export function popupResult(params: {
  ok: boolean;
  redirect?: string;
  error?: string;
}) {
  return sharedPopupResult({ ...params, type: "mg_google_auth" });
}
