import { LogoMark } from "./logo";
import { Spinner } from "./spinner";

/**
 * The start-up screen, shown until the session is known. The server renders it too, so it holds no translated text:
 * the server does not know the visitor's language, and a mismatch would break hydration.
 */
export function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6">
      <LogoMark className="h-14" />
      <Spinner label="NARRATIV" />
    </div>
  );
}
