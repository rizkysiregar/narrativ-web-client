import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "~/shared/lib/cn";
import { FormError } from "~/shared/ui/form-error";

import { useGoogleConfig } from "../api";
import { loadGoogleIdentity, type ButtonConfiguration } from "../gis";

interface GoogleButtonProps {
  /** What the button says: sign in, sign up, or continue (confirming who you are). */
  text: NonNullable<ButtonConfiguration["text"]>;
  /** Called with the Google ID token once the person picked their account. */
  onCredential: (idToken: string) => void;
  /** While the token is being used: the button stays visible but cannot start another round. */
  pending?: boolean;
  /** The failure of the last round, shown above the button. */
  error?: unknown;
  /** A divider above the button ("or"), to set it apart from the form it is an alternative to. */
  divider?: string;
  /** A sentence under the divider that says when to use the button. */
  hint?: string;
}

const MAX_WIDTH = 400; // the widest button Google renders

/**
 * Google's own "Sign in with Google" button. Shows nothing where the environment has no Google client id, and a short
 * note when the library cannot be loaded (blocked or offline), so the rest of the page always works without it.
 */
export function GoogleButton({
  text,
  onCredential,
  pending = false,
  error,
  divider,
  hint,
}: GoogleButtonProps) {
  const { t, i18n } = useTranslation();
  const config = useGoogleConfig();
  const container = useRef<HTMLDivElement>(null);
  const latest = useRef(onCredential);
  const [unavailable, setUnavailable] = useState(false);
  const clientId = config.data?.enabled ? config.data.clientId : undefined;

  useEffect(() => {
    latest.current = onCredential;
  });

  useEffect(() => {
    const element = container.current;
    if (!clientId || !element) {
      return;
    }
    let active = true;
    loadGoogleIdentity().then(
      (google) => {
        if (!active) {
          return;
        }
        setUnavailable(false);
        // one configuration per page: the button on screen decides what happens with the token
        google.initialize({
          client_id: clientId,
          callback: ({ credential }) => {
            if (credential) {
              latest.current(credential);
            }
          },
          context: text === "signup_with" ? "signup" : text === "continue_with" ? "use" : "signin",
          ux_mode: "popup",
          auto_select: false,
          use_fedcm_for_button: true,
        });
        google.renderButton(element, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text,
          logo_alignment: "center",
          width: Math.min(element.clientWidth || MAX_WIDTH, MAX_WIDTH),
          locale: i18n.language,
        });
      },
      () => {
        if (active) {
          setUnavailable(true);
        }
      },
    );
    return () => {
      active = false;
      element.replaceChildren();
    };
  }, [clientId, text, i18n.language]);

  if (!clientId) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {divider && (
        <div className="flex items-center gap-3 text-sm text-muted" role="separator" aria-label={divider}>
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
          <span aria-hidden="true">{divider}</span>
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
        </div>
      )}
      {hint && <p className="text-sm text-muted">{hint}</p>}
      <FormError error={error} />
      {unavailable ? (
        <p className="text-center text-sm text-muted">{t("google.unavailable")}</p>
      ) : (
        <div
          ref={container}
          aria-busy={pending}
          className={cn("flex min-h-11 justify-center", pending && "pointer-events-none opacity-60")}
        />
      )}
    </div>
  );
}
