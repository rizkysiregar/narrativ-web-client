// Google Identity Services (https://developers.google.com/identity/gsi/web): the script is loaded on first use, only
// on the pages that show a Google button, and typed here as far as this app uses it.

export const GIS_SCRIPT = "https://accounts.google.com/gsi/client";

export interface CredentialResponse {
  /** The Google ID token (a JWT) that the backend verifies. */
  credential?: string;
}

export interface IdConfiguration {
  client_id: string;
  callback: (response: CredentialResponse) => void;
  context?: "signin" | "signup" | "use";
  ux_mode?: "popup";
  auto_select?: boolean;
  use_fedcm_for_button?: boolean;
}

export interface ButtonConfiguration {
  type?: "standard";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium";
  text?: "signin_with" | "signup_with" | "continue_with";
  shape?: "pill" | "rectangular";
  logo_alignment?: "left" | "center";
  width?: number;
  locale?: string;
}

export interface GoogleIdentity {
  initialize: (config: IdConfiguration) => void;
  renderButton: (parent: HTMLElement, options: ButtonConfiguration) => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdentity } };
  }
}

let loading: Promise<GoogleIdentity> | null = null;

/** The loaded library; a failed load (blocked, offline) can be tried again. */
export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  const loaded = window.google?.accounts?.id;
  if (loaded) {
    return Promise.resolve(loaded);
  }
  loading ??= new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SCRIPT;
    script.async = true;
    script.onload = () => {
      const library = window.google?.accounts?.id;
      if (library) {
        resolve(library);
      } else {
        reject(new Error("Google Identity Services did not start"));
      }
    };
    script.onerror = () => {
      script.remove();
      reject(new Error("Google Identity Services could not be loaded"));
    };
    // after the page has painted: the button is a secondary way in and must not hold up the form
    const append = () => {
      document.head.append(script);
    };
    if ("requestIdleCallback" in window) {
      requestIdleCallback(append, { timeout: 2000 });
    } else {
      setTimeout(append, 0);
    }
  }).catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}
