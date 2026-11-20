import { APP_VERSION } from "~/shared/config/env";
import { currentLanguage } from "~/shared/i18n";

/**
 * Sent with every API call. X-Client-Platform: web makes the backend keep the refresh token in an HttpOnly cookie
 * and labels the access log; Accept-Language picks the language of the backend's messages.
 */
export function clientHeaders(): Record<string, string> {
  return {
    "X-Client-Platform": "web",
    "X-App-Version": APP_VERSION,
    "Accept-Language": currentLanguage(),
  };
}
